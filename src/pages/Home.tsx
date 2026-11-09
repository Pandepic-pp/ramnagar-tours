import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Clock3, FileText, Luggage, MapPinned, MessageSquareText, Receipt, Route as RouteIcon,
  Search, ShieldCheck, Users,
} from 'lucide-react';
import { api } from '@/api/client';
import type { Fare, Place, TripQuote } from '@/api/types';
import { useCatalog } from '@/state/CatalogContext';
import { useTripDraft } from '@/state/tripDraft';
import { addDays, formatDuration, rupees, todayInIndia, toIndiaIso } from '@/lib/format';
import { brand } from '@/config';
import { CarArt, HeroLandscape, Scene } from '@/components/art';
import { LocationPicker } from '@/components/LocationPicker';
import { DateField, TimeField } from '@/components/fields';
import { FareBreakdown } from '@/components/FareBreakdown';
import { Reveal } from '@/components/Reveal';

/* ------------------------------------------------------------------ hero */

function Hero() {
  const { catalog } = useCatalog();
  const navigate = useNavigate();
  const { draft, update } = useTripDraft();
  const [tried, setTried] = useState(false);

  const places = catalog?.locations ?? [];
  const destination = places.find((p) => p.id === draft.destinationId);
  const hint = catalog && draft.pickupId === catalog.baseId && destination?.fromBase ? destination.fromBase : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!draft.destinationId) return;
    navigate('/book?step=vehicle');
  };

  return (
    <section className="hero">
      <HeroLandscape />
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">Ramnagar · Uttarakhand</span>
          <h1>Every road in Uttarakhand starts in Ramnagar.</h1>
          <p className="hero-lede">
            Cab rides to Jim Corbett, Nainital, Kainchi Dham, Mussoorie and beyond. See a clear fare in seconds. Book in a minute.
          </p>
          <ul className="hero-trust">
            <li><Receipt aria-hidden="true" /> Itemised fares</li>
            <li><BadgeCheck aria-hidden="true" /> Verified by OTP</li>
            <li><MessageSquareText aria-hidden="true" /> Driver details before pickup</li>
          </ul>
        </div>

        <div className="quick-wrap">
        <span className="hero-sun" aria-hidden="true" />
        <form className="quick-book" onSubmit={submit} noValidate aria-label="Check a fare">
          <div className="quick-book-head">
            <h2>Where to?</h2>
            <span className="muted">One way. Round trips on the next step.</span>
          </div>
          <div className="quick-book-grid">
            <LocationPicker label="From" variant="from" value={draft.pickupId} places={places} excludeId={draft.destinationId} onChange={(id) => update({ pickupId: id })} />
            <LocationPicker
              label="To"
              variant="to"
              value={draft.destinationId}
              places={places}
              excludeId={draft.pickupId}
              placeholder="Choose a place"
              showDistance
              error={tried && !draft.destinationId ? 'Choose where you are going' : undefined}
              onChange={(id) => update({ destinationId: id })}
            />
            <DateField label="Date" value={draft.date} onChange={(v) => update({ date: v })} />
            <TimeField label="Pickup time" value={draft.time} onChange={(v) => update({ time: v })} />
          </div>

          <div className="quick-book-foot">
            <p className="quick-hint" aria-live="polite">
              {hint ? (
                <>
                  <RouteIcon size={16} aria-hidden="true" /> About <strong>{hint.distanceKm} km</strong>, {formatDuration(hint.durationMin)}. Sedan from <strong>{rupees(hint.startingFare)}</strong>
                </>
              ) : (
                <><Clock3 size={16} aria-hidden="true" /> Fares include driver stay and GST. Tolls at actuals.</>
              )}
            </p>
            <button type="submit" className="btn btn-primary btn-lg">
              <Search aria-hidden="true" /> See fares
            </button>
          </div>
        </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- destinations */

function DestinationCard({ place, index }: { place: Place; index: number }) {
  const f = place.fromBase;
  return (
    <Link to={`/book?to=${place.id}`} className="dest-card">
      <div className="dest-art"><Scene kind={place.kind} seed={index} /></div>
      <div className="dest-body">
        <h3>{place.name}</h3>
        <p>{place.blurb}</p>
        {f && (
          <div className="dest-meta">
            <span className="chip"><RouteIcon size={14} aria-hidden="true" /> {f.distanceKm} km</span>
            <span className="chip"><Clock3 size={14} aria-hidden="true" /> {formatDuration(f.durationMin)}</span>
          </div>
        )}
      </div>
      {f && (
        <div className="dest-foot">
          <span><small>Sedan from</small> <strong className="tnum">{rupees(f.startingFare)}</strong></span>
          <span className="dest-go" aria-hidden="true"><ArrowRight size={18} /></span>
        </div>
      )}
    </Link>
  );
}

function Destinations() {
  const { catalog, error, reload } = useCatalog();
  const popular = catalog?.locations.filter((l) => l.popular).sort((a, b) => (a.fromBase?.distanceKm ?? 0) - (b.fromBase?.distanceKm ?? 0));

  return (
    <section className="section" id="destinations">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">Popular routes</span>
            <h2>From Ramnagar to the whole of Uttarakhand</h2>
            <p className="muted">Tiger country, lake towns, hill stations and holy rivers. Tap a place to start your booking.</p>
          </div>
        </Reveal>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="grow">We could not load destinations. {error}</span>
            <button type="button" className="btn btn-sm btn-quiet" onClick={reload}>Try again</button>
          </div>
        )}

        <div className="dest-grid">
          {!catalog && !error && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton dest-skeleton" />)}
          {popular?.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 70}><DestinationCard place={p} index={i} /></Reveal>
          ))}
        </div>

        <p className="section-foot muted">
          Going somewhere else? <Link to="/book">Search all {catalog?.locations.length ?? 30}+ places</Link>.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- how it works */

const steps = [
  { Icon: MapPinned, title: 'Choose your trip', body: 'Pick where, when and how many of you. You see the fare for every car straight away.' },
  { Icon: ShieldCheck, title: 'Verify your number', body: 'Enter the code we text you. That is your sign in. No password to remember.' },
  { Icon: BadgeCheck, title: 'Meet your driver', body: 'We assign a driver and send you their name, number and car before pickup.' },
];

function HowItWorks() {
  return (
    <section className="section band-sky" id="how">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Three steps, about a minute</h2>
          </div>
        </Reveal>
        <ol className="steps">
          {steps.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <li className="step">
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <span className="step-icon"><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ fleet */

function Fleet() {
  const { catalog } = useCatalog();
  return (
    <section className="section" id="fleet">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">Our fleet</span>
            <h2>The right car for your group</h2>
            <p className="muted">Clean, serviced and driven by people who know the mountain roads.</p>
          </div>
        </Reveal>
        <div className="fleet-grid">
          {catalog
            ? catalog.vehicles.map((v, i) => (
                <Reveal key={v.id} delay={i * 70}>
                  <article className="fleet-card">
                    <div className="fleet-art"><CarArt id={v.id} /></div>
                    <h3>{v.name}</h3>
                    <p className="muted">{v.models}</p>
                    <div className="fleet-specs">
                      <span><Users size={16} aria-hidden="true" /> {v.seats} seats</span>
                      <span><Luggage size={16} aria-hidden="true" /> {v.bags} bags</span>
                    </div>
                    <div className="fleet-rate">
                      <span><small>One way</small><strong className="tnum">{rupees(v.oneWayPerKm)}</strong>/km</span>
                      <span><small>Round trip</small><strong className="tnum">{rupees(v.roundTripPerKm)}</strong>/km</span>
                    </div>
                  </article>
                </Reveal>
              ))
            : Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton fleet-skeleton" />)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ pricing */

// The sample is a real quote from the same engine that prices bookings, so this section can never go stale
function useSampleFare() {
  const [state, setState] = useState<{ quote: TripQuote; fare: Fare } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const start = addDays(todayInIndia(), 14);
    api
      .quote({ pickupId: 'ramnagar', destinationId: 'nainital', tripType: 'roundtrip', pickupAt: toIndiaIso(start, '09:00'), returnDate: addDays(start, 1), passengers: 3 }, ctrl.signal)
      .then((quote) => setState({ quote, fare: quote.fares[0] }))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);
  return state;
}

function Pricing() {
  const sample = useSampleFare();
  const { catalog } = useCatalog();
  const r = catalog?.rules;

  return (
    <section className="section band-deep on-dark" id="pricing">
      <div className="container pricing-grid">
        <Reveal>
          <div className="stack" style={{ '--stack': '20px' } as React.CSSProperties}>
            <span className="eyebrow">Fares you can read</span>
            <h2>No surprises at the end of the trip</h2>
            <p className="pricing-lede">
              Every fare is built from the same few parts, and you see each one before you book.
            </p>
            <ul className="pricing-points">
              <li><FileText aria-hidden="true" /><span><strong>Distance.</strong> One way is billed on actual distance, with a {r?.oneWayMinKm ?? 80} km minimum on longer trips. Round trips use a daily minimum.</span></li>
              <li><Clock3 aria-hidden="true" /><span><strong>Stay.</strong> Driver night stay is added for multi-day trips, so there is no extra ask on the road.</span></li>
              <li><RouteIcon aria-hidden="true" /><span><strong>Tolls and permits.</strong> Estimated up front, billed at actuals. Parking and safari fees are paid by you directly.</span></li>
              <li><Receipt aria-hidden="true" /><span><strong>Tax.</strong> {r?.gstPercent ?? 5}% GST on the service part of the fare, shown as its own line.</span></li>
            </ul>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="sample-card" aria-label="Sample fare">
            <div className="sample-head">
              <span className="sample-tag">Sample fare</span>
              <h3>Ramnagar to Nainital and back</h3>
              <p>{sample ? `Sedan, 2 days. About ${sample.quote.distanceKm} km each way.` : 'Sedan, 2 days.'}</p>
            </div>
            {sample ? <FareBreakdown lines={sample.fare.lines} total={sample.fare.total} /> : <div className="skeleton" style={{ height: 240 }} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */

const faqs = [
  { q: 'How is my fare worked out?', a: 'We multiply the distance by a per-km rate for your car, add driver night stay for multi-day trips, any night pickup or peak season charge, tolls and permits at estimated actuals, then GST. You see every line before you confirm.' },
  { q: 'Are tolls included?', a: 'Tolls and inter-state permits are estimated and shown in the fare. They are billed at actuals, so you pay what was really charged. Parking and safari gate fees are not included.' },
  { q: 'When do I get my driver\'s details?', a: 'Once we assign a driver, their name, phone number and car number appear on your trip page. Your booking shows as "Finding a driver" until then.' },
  { q: 'Do I pay online?', a: 'No. You are not charged when you book. Payment details are shared when your driver is assigned.' }, // TODO(client): confirm the payment policy
  { q: 'Can I be picked up somewhere other than Ramnagar?', a: 'Yes. Choose any place in the list as your pickup, including railway stations, airports and Delhi. The fare is worked out for that route.' },
  { q: 'Can I cancel?', a: 'You can cancel any open booking from My trips. Please do it as early as you can so we can free up the driver.' },
];

function Faq() {
  return (
    <section className="section" id="faq">
      <div className="container faq-grid">
        <Reveal>
          <div className="section-head left">
            <span className="eyebrow">Good to know</span>
            <h2>Questions people ask</h2>
            <p className="muted">Still unsure? {brand.phone ? <>Call us on <a href={`tel:${brand.phone}`}>{brand.phone}</a>.</> : 'Book a ride and we will confirm every detail with you.'}</p>
          </div>
        </Reveal>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ cta */

function CtaBand() {
  return (
    <section className="cta-band">
      <div className="container cta-inner">
        <div>
          <h2>Ready when you are</h2>
          <p>Tell us where and when. We will take care of the road.</p>
        </div>
        <Link to="/book" className="btn btn-ink btn-lg">Book a ride <ArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Destinations />
      <HowItWorks />
      <Fleet />
      <Pricing />
      <Faq />
      <CtaBand />
    </>
  );
}
