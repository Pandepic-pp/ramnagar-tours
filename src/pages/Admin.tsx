import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, ArrowRightLeft, CalendarClock, CheckCircle2, ChevronDown, MapPin, MessageCircle, Navigation, Phone,
  RefreshCw, Search, Send, Users, X,
} from 'lucide-react';
import { api } from '@/api/client';
import type { Booking, BookingStatus } from '@/api/types';
import { useCatalog } from '@/state/CatalogContext';
import { formatDateKey, formatPickup, phoneDigits, relativePickup, rupees, todayInIndia } from '@/lib/format';
import { telHref } from '@/config';
import { FareBreakdown } from '@/components/FareBreakdown';
import { StatusBadge } from '@/components/StatusBadge';

type Tab = 'requested' | 'assigned' | 'completed' | 'cancelled' | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'requested', label: 'Needs driver' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];
const OPEN: BookingStatus[] = ['requested', 'assigned'];
const POLL_MS = 45_000;

const waLink = (phone: string, text: string): string => `https://wa.me/91${phoneDigits(phone)}?text=${encodeURIComponent(text)}`;

/* -------------------------------------------------------------------- stats */

function Stats({ bookings }: { bookings: Booking[] }) {
  const today = todayInIndia();
  const open = bookings.filter((b) => OPEN.includes(b.status));
  const tiles = [
    { label: 'Need a driver', value: bookings.filter((b) => b.status === 'requested').length, tone: 'warm' },
    { label: 'Driver assigned', value: bookings.filter((b) => b.status === 'assigned').length, tone: 'blue' },
    { label: 'Pickups today', value: open.filter((b) => formatPickup(b.pickupAt).dateKey === today).length, tone: 'sky' },
    { label: 'Open bookings value', value: rupees(open.reduce((s, b) => s + (b.fare?.total ?? 0), 0)), tone: 'plain' },
  ];
  return (
    <div className="stats">
      {tiles.map((t) => (
        <div key={t.label} className={`stat stat-${t.tone}`}>
          <span className="stat-value tnum">{t.value}</span>
          <span className="stat-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- list */

function QueueItem({ booking, selected, onSelect }: { booking: Booking; selected: boolean; onSelect: () => void }) {
  const when = formatPickup(booking.pickupAt);
  const open = OPEN.includes(booking.status);
  const rel = open ? relativePickup(booking.pickupAt) : null;
  const round = booking.trip?.tripType === 'roundtrip';
  return (
    <li>
      <button type="button" className={`queue-item status-${booking.status}${selected ? ' is-selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
        <div className="queue-top">
          <span className="queue-when">
            <CalendarClock size={15} aria-hidden="true" /> {when.date}, {when.time}
          </span>
          {rel && <span className={`urgency urgency-${booking.status === 'assigned' && rel.tone !== 'overdue' ? 'later' : rel.tone}`}>{rel.text}</span>}
        </div>
        <p className="queue-route">
          {booking.pickup} {round ? <ArrowRightLeft size={14} aria-label="and back" /> : <ArrowRight size={14} aria-label="to" />} {booking.destination}
        </p>
        <div className="queue-bottom">
          <span className="queue-who">{booking.contactName} <span className="muted">· <Users size={13} aria-hidden="true" /> {booking.passengers}</span></span>
          <span className="queue-end">
            {booking.fare && <strong className="tnum">{rupees(booking.fare.total)}</strong>}
            <StatusBadge status={booking.status} adminLabel />
          </span>
        </div>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------- detail */

type DriverForm = { driverName: string; driverPhone: string; vehicleModel: string; vehicleNumber: string };
const emptyForm: DriverForm = { driverName: '', driverPhone: '', vehicleModel: '', vehicleNumber: '' };

function Detail({ booking, drivers, onChanged, onClose }: {
  booking: Booking;
  drivers: (DriverForm & { key: string })[];
  onChanged: (b: Booking) => void;
  onClose: () => void;
}) {
  const { place, vehicle } = useCatalog();
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<'assign' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start from the current assignment when there is one, otherwise a blank form
  useEffect(() => {
    setForm(booking.driver
      ? { driverName: booking.driver.name, driverPhone: phoneDigits(booking.driver.phone), vehicleModel: booking.vehicle?.model ?? '', vehicleNumber: booking.vehicle?.number ?? '' }
      : emptyForm);
    setTouched(false);
    setError(null);
  }, [booking.id, booking.driver, booking.vehicle]);

  const open = OPEN.includes(booking.status);
  const when = formatPickup(booking.pickupAt);
  const from = booking.trip ? place(booking.trip.pickupId) : undefined;
  const to = booking.trip ? place(booking.trip.destinationId) : undefined;
  const asked = booking.trip ? vehicle(booking.trip.vehicleId) : undefined;
  const round = booking.trip?.tripType === 'roundtrip';

  const mapsPickup = from
    ? `https://www.google.com/maps/search/?api=1&query=${from.lat},${from.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.pickup}, Uttarakhand`)}`;
  const mapsRoute = from && to ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}` : null;

  const errors = {
    driverName: form.driverName.trim().length < 2 ? 'Enter the driver\'s name' : '',
    driverPhone: /^[6-9]\d{9}$/.test(form.driverPhone) ? '' : 'Enter a 10-digit mobile number',
    vehicleModel: form.vehicleModel.trim().length < 2 ? 'Enter the car model' : '',
    vehicleNumber: form.vehicleNumber.trim().length < 4 ? 'Enter the registration number' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = (patch: Partial<DriverForm>) => setForm((f) => ({ ...f, ...patch }));

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy('assign');
    setError(null);
    try {
      onChanged(await api.assignDriver(booking.id, {
        driverName: form.driverName.trim(),
        driverPhone: form.driverPhone,
        vehicleModel: form.vehicleModel.trim(),
        vehicleNumber: form.vehicleNumber.trim(),
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    setBusy('complete');
    setError(null);
    try {
      onChanged(await api.completeBooking(booking.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // What the driver needs to find the passenger without a phone call
  const driverMessage = booking.driver
    ? [
        `New pickup ${booking.reference}`,
        `Passenger: ${booking.contactName} (${booking.contactPhone})`,
        `Pickup: ${booking.pickup}`,
        `Time: ${when.date}, ${when.time}`,
        `Going to: ${booking.destination}${round ? ' and back' : ''}`,
        `Passengers: ${booking.passengers}`,
        booking.notes ? `Notes: ${booking.notes}` : '',
        `Location: ${mapsPickup}`,
      ].filter(Boolean).join('\n')
    : '';

  const customerMessage = booking.driver && booking.vehicle
    ? `Hello ${booking.contactName}, your ride ${booking.reference} is confirmed.\nDriver: ${booking.driver.name} (${booking.driver.phone})\nCar: ${booking.vehicle.model}, ${booking.vehicle.number}\nPickup: ${booking.pickup}, ${when.date} at ${when.time}.`
    : '';

  return (
    <div className="detail">
      <div className="detail-bar">
        <button type="button" className="icon-btn detail-close" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        <div className="grow">
          <p className="trip-ref tnum">{booking.reference}</p>
          <h2 className="detail-title">{booking.contactName}</h2>
        </div>
        <StatusBadge status={booking.status} adminLabel />
      </div>

      <div className="detail-body">
        <section className="detail-block">
          <h3 className="block-title">Customer</h3>
          <div className="row row-wrap">
            <a className="btn btn-secondary btn-sm" href={telHref(booking.contactPhone)}><Phone aria-hidden="true" /> {booking.contactPhone.replace('+91', '+91 ')}</a>
            <a className="btn btn-quiet btn-sm" href={waLink(booking.contactPhone, `Hello ${booking.contactName}, this is about your ride ${booking.reference}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a>
          </div>
        </section>

        <section className="detail-block">
          <h3 className="block-title">Trip</h3>
          <ol className="stops">
            <li><span className="stop-dot stop-from" aria-hidden="true" /><div><strong>{booking.pickup}</strong><small>Pickup · {when.date}, {when.time}</small></div></li>
            <li><span className="stop-dot stop-to" aria-hidden="true" /><div><strong>{booking.destination}</strong><small>{round ? `Round trip, returns ${booking.trip?.returnDate ? formatDateKey(booking.trip.returnDate) : 'same day'}` : 'One way drop'}</small></div></li>
          </ol>
          <div className="detail-facts">
            <span><Users size={15} aria-hidden="true" /> {booking.passengers} passenger{booking.passengers === 1 ? '' : 's'}</span>
            {asked && <span>Requested: {asked.name}</span>}
            {booking.trip && <span>~{booking.trip.distanceKm} km</span>}
          </div>
          <div className="row row-wrap">
            <a className="btn btn-quiet btn-sm" href={mapsPickup} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" /> Pickup on map</a>
            {mapsRoute && <a className="btn btn-quiet btn-sm" href={mapsRoute} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden="true" /> Full route</a>}
          </div>
          {booking.notes && <div className="note-box"><strong>Customer notes</strong><p>{booking.notes}</p></div>}
        </section>

        {booking.fare && (
          <details className="detail-block fare-details">
            <summary><span className="block-title">Quoted fare</span><strong className="tnum">{rupees(booking.fare.total)}</strong><ChevronDown size={18} aria-hidden="true" /></summary>
            <FareBreakdown lines={booking.fare.lines} total={booking.fare.total} compact />
          </details>
        )}

        {open && (
          <section className="detail-block dispatch">
            <h3 className="block-title">{booking.driver ? 'Driver and car' : 'Assign a driver'}</h3>

            {drivers.length > 0 && !booking.driver && (
              <div className="recent">
                <span className="field-hint">Recent drivers</span>
                <div className="row row-wrap" style={{ gap: 8 }}>
                  {drivers.slice(0, 5).map((d) => (
                    <button key={d.key} type="button" className="chip chip-btn" onClick={() => setForm(d)}>{d.driverName}</button>
                  ))}
                </div>
              </div>
            )}

            <form className="dispatch-form" onSubmit={assign} noValidate>
              <div className="field">
                <label htmlFor="dn">Driver name</label>
                <input id="dn" className="input" value={form.driverName} onChange={(e) => set({ driverName: e.target.value })} aria-invalid={touched && !!errors.driverName} autoComplete="off" />
                {touched && errors.driverName && <p className="field-error">{errors.driverName}</p>}
              </div>
              <div className="field">
                <label htmlFor="dp">Driver phone</label>
                <div className="input-group" data-invalid={touched && !!errors.driverPhone}>
                  <span className="affix" aria-hidden="true">+91</span>
                  <input id="dp" className="input" type="tel" inputMode="numeric" value={form.driverPhone} onChange={(e) => set({ driverPhone: phoneDigits(e.target.value) })} aria-invalid={touched && !!errors.driverPhone} autoComplete="off" />
                </div>
                {touched && errors.driverPhone && <p className="field-error">{errors.driverPhone}</p>}
              </div>
              <div className="field">
                <label htmlFor="vm">Car model</label>
                <input id="vm" className="input" placeholder={asked?.models ?? 'Swift Dzire'} value={form.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} aria-invalid={touched && !!errors.vehicleModel} autoComplete="off" />
                {touched && errors.vehicleModel && <p className="field-error">{errors.vehicleModel}</p>}
              </div>
              <div className="field">
                <label htmlFor="vn">Registration number</label>
                <input id="vn" className="input plate-input" placeholder="UK04 AB 1234" value={form.vehicleNumber} onChange={(e) => set({ vehicleNumber: e.target.value.toUpperCase() })} aria-invalid={touched && !!errors.vehicleNumber} autoComplete="off" />
                {touched && errors.vehicleNumber && <p className="field-error">{errors.vehicleNumber}</p>}
              </div>

              {error && <div className="alert alert-error full" role="alert"><AlertCircle aria-hidden="true" /> {error}</div>}

              <button type="submit" className="btn btn-primary btn-block full" disabled={busy !== null}>
                {busy === 'assign' ? <span className="spinner" aria-label="Saving" /> : <><Send aria-hidden="true" /> {booking.driver ? 'Update assignment' : 'Assign driver'}</>}
              </button>
            </form>

            {booking.driver && (
              <div className="send-row">
                <p className="field-hint">Send the pickup to the driver and the driver details to the customer.</p>
                <div className="row row-wrap">
                  <a className="btn btn-secondary btn-sm" href={waLink(booking.driver.phone, driverMessage)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Send pickup to driver</a>
                  <a className="btn btn-quiet btn-sm" href={waLink(booking.contactPhone, customerMessage)} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Send driver to customer</a>
                </div>
                <button type="button" className="btn btn-quiet btn-block" onClick={complete} disabled={busy !== null}>
                  {busy === 'complete' ? <span className="spinner" aria-label="Saving" /> : <><CheckCircle2 aria-hidden="true" /> Mark trip completed</>}
                </button>
              </div>
            )}
          </section>
        )}

        {!open && booking.driver && (
          <section className="detail-block">
            <h3 className="block-title">Driver and car</h3>
            <p><strong>{booking.driver.name}</strong> · {booking.driver.phone}</p>
            {booking.vehicle && <p className="muted">{booking.vehicle.model}, {booking.vehicle.number}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

export default function Admin() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('requested');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setBookings(await api.adminBookings('all'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (bookings ?? []).filter((b) => tab === 'all' || b.status === tab);
    const filtered = q
      ? rows.filter((b) => [b.reference, b.contactName, b.contactPhone, b.pickup, b.destination].some((v) => v.toLowerCase().includes(q)))
      : rows;
    // Open work: soonest pickup first. History: newest first.
    const openTab = tab === 'requested' || tab === 'assigned';
    return [...filtered].sort((a, b) => (openTab ? 1 : -1) * (+new Date(a.pickupAt) - +new Date(b.pickupAt)));
  }, [bookings, tab, query]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { requested: 0, assigned: 0, completed: 0, cancelled: 0, all: bookings?.length ?? 0 };
    bookings?.forEach((b) => { c[b.status] += 1; });
    return c;
  }, [bookings]);

  // Drivers we have used before, newest first, so the common case is one tap
  const drivers = useMemo(() => {
    const seen = new Map<string, DriverForm & { key: string }>();
    [...(bookings ?? [])]
      .filter((b) => b.driver && b.vehicle)
      .sort((a, b) => +new Date(b.pickupAt) - +new Date(a.pickupAt))
      .forEach((b) => {
        const phone = phoneDigits(b.driver!.phone);
        if (!seen.has(phone)) seen.set(phone, { key: phone, driverName: b.driver!.name, driverPhone: phone, vehicleModel: b.vehicle!.model, vehicleNumber: b.vehicle!.number });
      });
    return [...seen.values()];
  }, [bookings]);

  const selected = bookings?.find((b) => b.id === selectedId) ?? null;
  const replace = (b: Booking) => setBookings((prev) => prev?.map((x) => (x.id === b.id ? b : x)) ?? prev);

  return (
    <section className="container admin-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Control room</span>
          <h1>Dispatch board</h1>
        </div>
        <button type="button" className="btn btn-quiet" onClick={() => void load()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : undefined} aria-hidden="true" /> Refresh
        </button>
      </div>

      {bookings && <Stats bookings={bookings} />}

      {error && (
        <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> <span className="grow">{error}</span><button type="button" className="btn btn-sm btn-quiet" onClick={() => void load()}>Retry</button></div>
      )}

      <div className={`admin-grid${selected ? ' has-selection' : ''}`}>
        <div className="admin-queue">
          <div className="tabs tabs-scroll" role="tablist" aria-label="Booking status">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' is-on' : ''}${t.id === 'requested' && counts.requested > 0 ? ' tab-alert' : ''}`} onClick={() => setTab(t.id)}>
                {t.label} <span className="tab-count">{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div className="search">
            <Search size={18} aria-hidden="true" />
            <input className="input" type="search" placeholder="Search name, phone, reference or place" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search bookings" />
          </div>

          {!bookings && !error && <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 112 }} />)}</div>}

          {bookings && visible.length === 0 && (
            <div className="empty-card empty-card-sm">
              <CheckCircle2 size={36} aria-hidden="true" />
              <h2>{query ? 'Nothing matches' : tab === 'requested' ? 'All caught up' : 'Nothing here'}</h2>
              <p className="muted">{query ? 'Try a different search.' : tab === 'requested' ? 'Every booking has a driver.' : 'No bookings in this view.'}</p>
            </div>
          )}

          <ul className="queue">
            {visible.map((b) => <QueueItem key={b.id} booking={b} selected={b.id === selectedId} onSelect={() => setSelectedId(b.id)} />)}
          </ul>
        </div>

        <div className="admin-detail" aria-live="polite">
          {selected ? (
            <Detail booking={selected} drivers={drivers} onChanged={replace} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="detail-empty">
              <Navigation size={36} aria-hidden="true" />
              <h2>Select a booking</h2>
              <p className="muted">Pick one from the list to see the trip, the pickup point and to assign a driver.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
