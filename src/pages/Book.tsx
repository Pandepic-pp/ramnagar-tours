import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpDown, Check, CheckCircle2, Clock3, Luggage, Moon, Repeat, Route as RouteIcon, ShieldCheck, Sun, Users,
} from 'lucide-react';
import { api, ApiRequestError } from '@/api/client';
import type { Booking, Fare, TripQuote, VehicleId } from '@/api/types';
import { useAuth } from '@/state/AuthContext';
import { useCatalog } from '@/state/CatalogContext';
import { clearDraft, useTripDraft, type TripDraft } from '@/state/tripDraft';
import { formatDateKey, formatDuration, formatTime, rupees, todayInIndia, toIndiaIso } from '@/lib/format';
import { CarArt } from '@/components/art';
import { DateField, PassengerStepper, TimeField } from '@/components/fields';
import { FareBreakdown } from '@/components/FareBreakdown';
import { LocationPicker } from '@/components/LocationPicker';
import { OtpLogin } from '@/components/OtpLogin';
import { RouteMap } from '@/components/RouteMap';

type Step = 'trip' | 'vehicle' | 'confirm' | 'done';
const STEPS: { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'trip', label: 'Trip' },
  { id: 'vehicle', label: 'Car' },
  { id: 'confirm', label: 'Confirm' },
];

/* --------------------------------------------------------------- validation */

type TripErrors = { destination?: string; date?: string; time?: string; returnDate?: string };

function validateTrip(d: TripDraft, minLeadMinutes: number, maxNights: number): TripErrors {
  const errors: TripErrors = {};
  if (!d.destinationId) errors.destination = 'Choose where you are going';
  else if (d.destinationId === d.pickupId) errors.destination = 'Pickup and destination must be different';

  if (!d.date) errors.date = 'Choose a date';
  else if (d.date < todayInIndia()) errors.date = 'That date has passed';
  else if (new Date(toIndiaIso(d.date, d.time)).getTime() - Date.now() < minLeadMinutes * 60000) {
    errors.time = `Pickup must be at least ${minLeadMinutes} minutes from now. Pick a later time.`;
  }

  if (d.tripType === 'roundtrip') {
    const nights = (Date.parse(`${d.returnDate}T00:00:00Z`) - Date.parse(`${d.date}T00:00:00Z`)) / 86400000;
    if (!d.returnDate || nights < 0) errors.returnDate = 'Return cannot be before pickup';
    else if (nights > maxNights) errors.returnDate = `Round trips can be up to ${maxNights} nights`;
  }
  return errors;
}

/* -------------------------------------------------------------------- quote */

// Quotes are cached per trip so flipping between steps, or the vehicle list re-rendering, never costs a request
function useQuote(draft: TripDraft, enabled: boolean) {
  const cache = useRef(new Map<string, TripQuote>());
  const [state, setState] = useState<{ quote: TripQuote | null; loading: boolean; error: string | null }>({ quote: null, loading: false, error: null });
  const [nonce, setNonce] = useState(0);

  const key = [draft.pickupId, draft.destinationId, draft.tripType, draft.date, draft.time, draft.tripType === 'roundtrip' ? draft.returnDate : '', nonce].join('|');

  useEffect(() => {
    if (!enabled) { setState({ quote: null, loading: false, error: null }); return; }
    const hit = cache.current.get(key);
    if (hit) { setState({ quote: hit, loading: false, error: null }); return; }

    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      api
        .quote({
          pickupId: draft.pickupId,
          destinationId: draft.destinationId,
          tripType: draft.tripType,
          pickupAt: toIndiaIso(draft.date, draft.time),
          returnDate: draft.tripType === 'roundtrip' ? draft.returnDate : undefined,
          passengers: draft.passengers,
        }, ctrl.signal)
        .then((quote) => { cache.current.set(key, quote); setState({ quote, loading: false, error: null }); })
        .catch((e: Error) => { if (e.name !== 'AbortError') setState({ quote: null, loading: false, error: e.message }); });
    }, 250); // debounce: people click through dates quickly

    return () => { window.clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const refetch = useCallback(() => { cache.current.clear(); setNonce((n) => n + 1); }, []);
  return { ...state, refetch };
}

/* ------------------------------------------------------------------ stepper */

function Stepper({ step, onJump }: { step: Step; onJump: (s: Exclude<Step, 'done'>) => void }) {
  const idx = step === 'done' ? STEPS.length : STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="progress" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        return (
          <li key={s.id} className={`progress-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <button type="button" className="progress-btn" disabled={state !== 'done' || step === 'done'} onClick={() => onJump(s.id)}>
              <span className="progress-dot">{state === 'done' ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
              <span className="progress-label">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- side summary */

function Summary({ draft, quote, fare, step }: { draft: TripDraft; quote: TripQuote | null; fare: Fare | undefined; step: Step }) {
  const { place } = useCatalog();
  const from = place(draft.pickupId);
  const to = place(draft.destinationId);
  const round = draft.tripType === 'roundtrip';

  return (
    <div className="summary">
      <h2 className="summary-title">Your trip</h2>
      {from && to ? <RouteMap from={from} to={to} km={quote?.distanceKm} /> : <div className="route-placeholder"><RouteIcon aria-hidden="true" /> Pick a destination to see your route</div>}

      <dl className="summary-list">
        <div><dt>Route</dt><dd>{from?.name ?? '…'} {round ? <ArrowRightLeft size={14} aria-label="and back" /> : '→'} {to?.name ?? '…'}</dd></div>
        <div><dt>Pickup</dt><dd>{formatDateKey(draft.date)}, {formatTime(draft.time)}</dd></div>
        {round && <div><dt>Return</dt><dd>{formatDateKey(draft.returnDate)}{quote ? ` · ${quote.days} ${quote.days === 1 ? 'day' : 'days'}` : ''}</dd></div>}
        <div><dt>Passengers</dt><dd>{draft.passengers}</dd></div>
        {quote && <div><dt>Distance</dt><dd>About {quote.distanceKm} km{round ? ' each way' : ''}, {formatDuration(quote.durationMin)}</dd></div>}
      </dl>

      {fare && step === 'confirm' && <FareBreakdown lines={fare.lines} total={fare.total} />}
      {fare && step === 'vehicle' && (
        <div className="summary-total">
          <span>{fare.vehicleName} total</span>
          <strong className="tnum">{rupees(fare.total)}</strong>
        </div>
      )}
      {step === 'trip' && <p className="muted summary-foot"><Clock3 size={14} aria-hidden="true" /> Fares for every car appear on the next step.</p>}
    </div>
  );
}

/* --------------------------------------------------------------- step: trip */

function TripStep({ draft, update, errors, tried, onNext, loading, quoteError }: {
  draft: TripDraft;
  update: (p: Partial<TripDraft>) => void;
  errors: TripErrors;
  tried: boolean;
  onNext: () => void;
  loading: boolean;
  quoteError: string | null;
}) {
  const { catalog } = useCatalog();
  const places = catalog?.locations ?? [];
  const round = draft.tripType === 'roundtrip';
  const show = (e?: string) => (tried ? e : undefined);

  const swap = () => {
    if (!draft.destinationId) return;
    update({ pickupId: draft.destinationId, destinationId: draft.pickupId });
  };

  return (
    <form className="panel stack" style={{ '--stack': '24px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); onNext(); }} noValidate>
      <div>
        <h1 className="step-title">Plan your trip</h1>
        <p className="muted">Tell us where and when. You will see the fare for every car next.</p>
      </div>

      <fieldset className="segmented">
        <legend className="sr-only">Trip type</legend>
        {([
          { id: 'oneway', title: 'One way', sub: 'Drop only', Icon: ArrowRight },
          { id: 'roundtrip', title: 'Round trip', sub: 'Back to pickup', Icon: Repeat },
        ] as const).map(({ id, title, sub, Icon }) => (
          <label key={id} className={`segment${draft.tripType === id ? ' is-on' : ''}`}>
            <input type="radio" name="tripType" value={id} checked={draft.tripType === id} onChange={() => update({ tripType: id })} />
            <Icon size={18} aria-hidden="true" />
            <span><strong>{title}</strong><small>{sub}</small></span>
          </label>
        ))}
      </fieldset>

      <div className="route-fields">
        <LocationPicker label="Pickup from" variant="from" value={draft.pickupId} places={places} excludeId={draft.destinationId} onChange={(id) => update({ pickupId: id })} />
        <button type="button" className="swap-btn" onClick={swap} aria-label="Swap pickup and destination" disabled={!draft.destinationId}>
          <ArrowUpDown size={18} aria-hidden="true" />
        </button>
        <LocationPicker
          label="Going to"
          variant="to"
          value={draft.destinationId}
          places={places}
          excludeId={draft.pickupId}
          placeholder="Search a place"
          showDistance
          error={show(errors.destination)}
          onChange={(id) => update({ destinationId: id })}
        />
      </div>

      <div className="grid-2">
        <DateField label="Pickup date" value={draft.date} onChange={(v) => update({ date: v })} error={show(errors.date)} />
        <TimeField label="Pickup time" value={draft.time} onChange={(v) => update({ time: v })} />
      </div>
      {tried && errors.time && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> {errors.time}</div>}

      {round && (
        <div className="grid-2">
          <DateField label="Return date" value={draft.returnDate} min={draft.date} onChange={(v) => update({ returnDate: v })} error={show(errors.returnDate)} />
          <div className="field">
            <span className="field-label">Trip length</span>
            <p className="trip-length">
              {Math.max(1, (Date.parse(`${draft.returnDate}T00:00:00Z`) - Date.parse(`${draft.date}T00:00:00Z`)) / 86400000 + 1)} day(s)
              <small>Driver night stay is added automatically.</small>
            </p>
          </div>
        </div>
      )}

      <PassengerStepper value={draft.passengers} onChange={(n) => update({ passengers: n })} />

      {quoteError && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> {quoteError}</div>}

      <div className="step-actions">
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? <span className="spinner" aria-label="Loading fares" /> : <>See cars and fares <ArrowRight aria-hidden="true" /></>}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- step: vehicle */

function VehicleStep({ draft, quote, selected, onSelect, onBack, onNext, loading }: {
  draft: TripDraft;
  quote: TripQuote | null;
  selected: VehicleId | '';
  onSelect: (id: VehicleId) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  const { vehicle } = useCatalog();
  const fares = useMemo(() => (quote?.fares ?? []).map((f) => ({ ...f, fits: f.seats >= draft.passengers })), [quote, draft.passengers]);
  const cheapestFit = fares.filter((f) => f.fits).sort((a, b) => a.total - b.total)[0];
  const round = draft.tripType === 'roundtrip';

  return (
    <div className="panel stack" style={{ '--stack': '24px' } as React.CSSProperties}>
      <div>
        <h1 className="step-title">Choose your car</h1>
        <p className="muted">
          {quote ? <>About {quote.distanceKm} km{round ? ' each way' : ''}. Fares are for the whole trip, with stay, tolls and GST.</> : 'Loading fares…'}
        </p>
      </div>

      {quote?.peak && (
        <div className="alert alert-warm"><Sun aria-hidden="true" /> <span><strong>Peak season.</strong> {quote.peak} adds a small uplift to the base fare on these dates.</span></div>
      )}
      {quote?.nightPickup && (
        <div className="alert alert-info"><Moon aria-hidden="true" /> <span><strong>Night pickup.</strong> A night charge applies for pickups between 11 pm and 4 am.</span></div>
      )}

      <div className="vehicle-list" role="radiogroup" aria-label="Choose a car">
        {loading && !quote && Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton vehicle-skeleton" />)}
        {fares.map((f) => {
          const info = vehicle(f.vehicleId);
          const on = selected === f.vehicleId;
          return (
            <label key={f.vehicleId} className={`vehicle${on ? ' is-on' : ''}${f.fits ? '' : ' is-disabled'}`}>
              <input type="radio" name="vehicle" value={f.vehicleId} checked={on} disabled={!f.fits} onChange={() => onSelect(f.vehicleId)} />
              <div className="vehicle-art"><CarArt id={f.vehicleId} /></div>
              <div className="vehicle-info">
                <div className="row row-wrap" style={{ gap: 8 }}>
                  <h3>{f.vehicleName}</h3>
                  {cheapestFit?.vehicleId === f.vehicleId && <span className="tag">Lowest fare</span>}
                </div>
                <p className="muted">{info?.models}</p>
                <div className="vehicle-specs">
                  <span><Users size={15} aria-hidden="true" /> {f.seats} seats</span>
                  <span><Luggage size={15} aria-hidden="true" /> {info?.bags} bags</span>
                  <span className="tnum">{rupees(f.perKm)}/km</span>
                </div>
                {!f.fits && <p className="vehicle-warn">Seats up to {f.seats}. You have {draft.passengers} passengers.</p>}
              </div>
              <div className="vehicle-price">
                <strong className="tnum">{rupees(f.total)}</strong>
                <small>total</small>
              </div>
              <span className="vehicle-check" aria-hidden="true"><Check size={16} /></span>
            </label>
          );
        })}
      </div>

      <div className="step-actions split">
        <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft aria-hidden="true" /> Edit trip</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={onNext} disabled={!selected || !fares.find((f) => f.vehicleId === selected)?.fits}>
          Continue <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- step: confirm */

function ConfirmStep({ draft, fare, onBack, onBooked, onFareChanged }: {
  draft: TripDraft;
  fare: Fare;
  onBack: () => void;
  onBooked: (b: Booking) => void;
  onFareChanged: () => void;
}) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const needsName = !!user && !user.name;
  const nameError = needsName && name.trim().length < 2 ? 'Please enter your full name' : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!user || nameError || busy) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await api.createBooking({
        pickupId: draft.pickupId,
        destinationId: draft.destinationId,
        tripType: draft.tripType,
        pickupAt: toIndiaIso(draft.date, draft.time),
        returnDate: draft.tripType === 'roundtrip' ? draft.returnDate : undefined,
        passengers: draft.passengers,
        vehicle: fare.vehicleId,
        quotedTotal: fare.total, // price lock: the server refuses if the rate card moved since the customer looked
        name: needsName ? name.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      void refresh(); // the first booking saves the name, so pick it up for the header
      onBooked(booking);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setError(apiErr.message);
      if (apiErr.status === 409) onFareChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel stack" style={{ '--stack': '24px' } as React.CSSProperties}>
      <div>
        <h1 className="step-title">Review and confirm</h1>
        <p className="muted">Check the details on the right, then confirm. You are not charged online.</p>
      </div>

      {!user ? (
        <div className="gate">
          <div className="gate-head"><ShieldCheck aria-hidden="true" /><div><strong>Verify your number to confirm</strong><p className="muted">This keeps your booking safe and lets your driver reach you.</p></div></div>
          <div className="auth-card auth-card-inline">
            <OtpLogin title="Enter your mobile number" subtitle="We will text you a code." onSuccess={() => undefined} />
          </div>
        </div>
      ) : (
        <form className="stack" style={{ '--stack': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
          <div className="signed-in"><CheckCircle2 aria-hidden="true" /> <span>Verified as <strong>+91 {user.phone.slice(-10)}</strong></span></div>

          {needsName ? (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" className="input" autoComplete="name" placeholder="As you would like the driver to greet you" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !!nameError} />
              {tried && nameError && <p className="field-error">{nameError}</p>}
            </div>
          ) : (
            <p className="muted">Booking for <strong>{user.name}</strong></p>
          )}

          <div className="field">
            <label htmlFor="notes">Pickup spot and notes <span className="muted">(optional)</span></label>
            <textarea id="notes" className="textarea" maxLength={300} placeholder="Hotel name, railway platform, flight number, luggage, child seat…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="field-hint">{notes.length}/300</p>
          </div>

          {error && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> <span>{error}</span></div>}

          <div className="step-actions split">
            <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft aria-hidden="true" /> Change car</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? <span className="spinner" aria-label="Booking" /> : <>Confirm booking · {rupees(fare.total)}</>}
            </button>
          </div>
        </form>
      )}

      {!user && <div className="step-actions"><button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft aria-hidden="true" /> Change car</button></div>}
    </div>
  );
}

/* ---------------------------------------------------------------- step: done */

function Done({ booking }: { booking: Booking }) {
  return (
    <div className="panel done stack fade-in" style={{ '--stack': '24px' } as React.CSSProperties}>
      <span className="done-mark" aria-hidden="true"><Check size={34} /></span>
      <div>
        <h1 className="step-title">Booking received</h1>
        <p className="muted">We are finding the right driver for you. Your reference is</p>
        <p className="done-ref tnum">{booking.reference}</p>
      </div>
      <ol className="timeline">
        <li className="is-done"><strong>Request received</strong><span>{booking.pickup} to {booking.destination}</span></li>
        <li className="is-next"><strong>Driver assigned</strong><span>We will add the driver's name, phone and car number to your trip page.</span></li>
        <li><strong>Pickup</strong><span>Your driver meets you at the time you chose.</span></li>
      </ol>
      <div className="step-actions split">
        <Link to="/" className="btn btn-ghost">Back to home</Link>
        <Link to="/trips" className="btn btn-primary btn-lg">View my trips <ArrowRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- page */

export default function Book() {
  const { catalog, error: catalogError, reload } = useCatalog();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toParam = params.get('to');
  const stepParam = params.get('step');

  const { draft, update, reset } = useTripDraft(toParam ? { destinationId: toParam } : undefined);
  const [step, setStep] = useState<Step>('trip');
  const [tried, setTried] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const startedRef = useRef(false);

  const errors = useMemo(
    () => (catalog ? validateTrip(draft, catalog.rules.minLeadMinutes, catalog.rules.maxNights) : {}),
    [draft, catalog]
  );
  const tripValid = !!catalog && Object.keys(errors).length === 0;

  // Deep links: /book?to=nainital pre-fills the destination, /book?step=vehicle jumps ahead when the draft is complete
  useEffect(() => {
    if (!catalog || startedRef.current) return;
    startedRef.current = true;
    if (toParam && !catalog.locations.some((l) => l.id === toParam)) update({ destinationId: '' });
    if (stepParam === 'vehicle' && tripValid) setStep('vehicle');
    if (toParam || stepParam) setParams({}, { replace: true });
  }, [catalog, toParam, stepParam, tripValid, update, setParams]);

  const wantQuote = tripValid && step !== 'done';
  const { quote, loading, error: quoteError, refetch } = useQuote(draft, wantQuote);

  // Keep a sensible vehicle selected: the cheapest that fits, and never one that no longer fits
  useEffect(() => {
    if (!quote) return;
    const fits = quote.fares.filter((f) => f.seats >= draft.passengers);
    const current = fits.find((f) => f.vehicleId === draft.vehicle);
    if (!current && fits.length) update({ vehicle: [...fits].sort((a, b) => a.total - b.total)[0].vehicleId });
  }, [quote, draft.passengers, draft.vehicle, update]);

  const fare = quote?.fares.find((f) => f.vehicleId === draft.vehicle);

  const goVehicle = () => {
    setTried(true);
    if (tripValid && !quoteError) setStep('vehicle');
  };

  const bookAnother = () => { clearDraft(); reset(); setBooking(null); setStep('trip'); setTried(false); };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  if (catalogError) {
    return (
      <section className="container empty-page">
        <AlertCircle size={44} aria-hidden="true" />
        <h1>We could not load the booking form</h1>
        <p className="muted">{catalogError}</p>
        <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
      </section>
    );
  }
  if (!catalog) {
    return (
      <section className="container book">
        <div className="skeleton" style={{ height: 56, maxWidth: 360, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 520 }} />
      </section>
    );
  }

  return (
    <section className="book-page">
      <div className="container book">
        <div className="book-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => (step === 'trip' || step === 'done' ? navigate('/') : setStep(step === 'confirm' ? 'vehicle' : 'trip'))}>
            <ArrowLeft aria-hidden="true" /> {step === 'trip' || step === 'done' ? 'Home' : 'Back'}
          </button>
          <Stepper step={step} onJump={setStep} />
        </div>

        <div className={`book-grid${step === 'confirm' ? ' is-confirm' : ''}`}>
          <div className="book-main">
            {step === 'trip' && <TripStep draft={draft} update={update} errors={errors} tried={tried} onNext={goVehicle} loading={tripValid && loading && !quote} quoteError={quoteError} />}
            {step === 'vehicle' && (
              <VehicleStep draft={draft} quote={quote} selected={draft.vehicle} onSelect={(id) => update({ vehicle: id })} onBack={() => setStep('trip')} onNext={() => setStep('confirm')} loading={loading} />
            )}
            {step === 'confirm' && fare && (
              <ConfirmStep
                draft={draft}
                fare={fare}
                onBack={() => setStep('vehicle')}
                onBooked={(b) => { setBooking(b); setStep('done'); clearDraft(); }}
                onFareChanged={() => { refetch(); setStep('vehicle'); }}
              />
            )}
            {step === 'confirm' && !fare && (
              <div className="panel"><div className="skeleton" style={{ height: 280 }} /></div>
            )}
            {step === 'done' && booking && <Done booking={booking} />}
          </div>

          {step !== 'done' && (
            <aside className="book-side" aria-label="Trip summary">
              <Summary draft={draft} quote={quote} fare={fare} step={step} />
            </aside>
          )}
          {step === 'done' && (
            <aside className="book-side">
              <div className="summary">
                <h2 className="summary-title">Fare summary</h2>
                {booking?.fare && <FareBreakdown lines={booking.fare.lines} total={booking.fare.total} />}
                <button type="button" className="btn btn-secondary btn-block" onClick={bookAnother}>Book another ride</button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
