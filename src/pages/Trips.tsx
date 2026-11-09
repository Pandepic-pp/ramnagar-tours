import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ArrowRightLeft, CalendarClock, ChevronDown, Phone, RefreshCw, Users } from 'lucide-react';
import { api } from '@/api/client';
import type { Booking } from '@/api/types';
import { useCatalog } from '@/state/CatalogContext';
import { formatDateKey, formatPickup, rupees } from '@/lib/format';
import { telHref } from '@/config';
import { FareBreakdown } from '@/components/FareBreakdown';
import { StatusBadge } from '@/components/StatusBadge';
import { Scene } from '@/components/art';

const OPEN = ['requested', 'assigned'];

function DriverCard({ booking }: { booking: Booking }) {
  if (!booking.driver) return null;
  return (
    <div className="driver-card">
      <span className="avatar avatar-lg" aria-hidden="true">{booking.driver.name.slice(0, 1).toUpperCase()}</span>
      <div className="grow">
        <p className="driver-label">Your driver</p>
        <p className="driver-name">{booking.driver.name}</p>
        {booking.vehicle && (
          <p className="driver-car">
            {booking.vehicle.model} <span className="plate">{booking.vehicle.number}</span>
          </p>
        )}
      </div>
      <a className="btn btn-secondary btn-sm" href={telHref(booking.driver.phone)}><Phone aria-hidden="true" /> Call</a>
    </div>
  );
}

function Track({ status }: { status: Booking['status'] }) {
  if (status === 'cancelled') return null;
  const stage = status === 'requested' ? 0 : status === 'assigned' ? 1 : 2;
  const labels = ['Requested', 'Driver assigned', 'Completed'];
  return (
    <ol className="track" aria-label="Trip progress">
      {labels.map((l, i) => (
        <li key={l} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}>
          <span className="track-dot" aria-hidden="true" />
          <span>{l}</span>
        </li>
      ))}
    </ol>
  );
}

function TripCard({ booking, onChanged }: { booking: Booking; onChanged: (b: Booking) => void }) {
  const { vehicle } = useCatalog();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const when = formatPickup(booking.pickupAt);
  const open = OPEN.includes(booking.status);
  const round = booking.trip?.tripType === 'roundtrip';
  const car = booking.trip ? vehicle(booking.trip.vehicleId) : undefined;

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.cancelBooking(booking.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`trip-card status-${booking.status}`}>
      <header className="trip-head">
        <div>
          <p className="trip-ref tnum">{booking.reference}</p>
          <h3 className="trip-route">
            {booking.pickup} {round ? <ArrowRightLeft size={18} aria-label="and back" /> : <ArrowRight size={18} aria-label="to" />} {booking.destination}
          </h3>
        </div>
        <StatusBadge status={booking.status} />
      </header>

      <div className="trip-facts">
        <span><CalendarClock size={16} aria-hidden="true" /> {when.date}, {when.time}</span>
        {round && booking.trip?.returnDate && <span>Return {formatDateKey(booking.trip.returnDate)}</span>}
        <span><Users size={16} aria-hidden="true" /> {booking.passengers}</span>
        {car && <span>{car.name}</span>}
        {booking.trip && <span>~{booking.trip.distanceKm} km</span>}
      </div>

      <Track status={booking.status} />
      <DriverCard booking={booking} />

      {booking.status === 'requested' && (
        <p className="trip-wait">We are finding a driver. This page updates when one is assigned.</p>
      )}

      {booking.notes && <p className="trip-notes"><strong>Notes:</strong> {booking.notes}</p>}

      {booking.fare && (
        <details className="trip-fare">
          <summary>
            <span>Fare</span>
            <strong className="tnum">{rupees(booking.fare.total)}</strong>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <FareBreakdown lines={booking.fare.lines} total={booking.fare.total} />
        </details>
      )}

      {error && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> {error}</div>}

      {open && (
        <footer className="trip-actions">
          {confirming ? (
            <>
              <span className="grow">Cancel this ride?</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirming(false)} disabled={busy}>Keep it</button>
              <button type="button" className="btn btn-danger-quiet btn-sm" onClick={cancel} disabled={busy}>
                {busy ? <span className="spinner" aria-label="Cancelling" /> : 'Yes, cancel'}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-danger-quiet btn-sm" onClick={() => setConfirming(true)}>Cancel booking</button>
          )}
        </footer>
      )}
    </article>
  );
}

export default function Trips() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setBookings(await api.myBookings());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Pick up a driver assignment when the customer comes back to the tab
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const all = bookings ?? [];
    return {
      upcoming: all.filter((b) => OPEN.includes(b.status)).sort((a, b) => +new Date(a.pickupAt) - +new Date(b.pickupAt)),
      past: all.filter((b) => !OPEN.includes(b.status)).sort((a, b) => +new Date(b.pickupAt) - +new Date(a.pickupAt)),
    };
  }, [bookings]);

  const list = tab === 'upcoming' ? upcoming : past;
  const replace = (b: Booking) => setBookings((prev) => prev?.map((x) => (x.id === b.id ? b : x)) ?? prev);

  return (
    <section className="container trips-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Your account</span>
          <h1>My trips</h1>
        </div>
        <div className="row">
          <button type="button" className="icon-btn" onClick={() => void load()} aria-label="Refresh trips" disabled={refreshing}>
            <RefreshCw size={18} className={refreshing ? 'spin' : undefined} />
          </button>
          <Link to="/book" className="btn btn-primary">Book a ride</Link>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Trips">
        {([['upcoming', 'Upcoming', upcoming.length], ['past', 'Past', past.length]] as const).map(([id, label, count]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} className={`tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
            {label} <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> <span className="grow">{error}</span><button type="button" className="btn btn-sm btn-quiet" onClick={() => void load()}>Retry</button></div>
      )}

      {!bookings && !error && <div className="trip-list">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}</div>}

      {bookings && list.length === 0 && (
        <div className="empty-card">
          <div className="empty-art"><Scene kind="gateway" seed={2} /></div>
          <h2>{tab === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}</h2>
          <p className="muted">{tab === 'upcoming' ? 'When you book a ride, it shows up here with your driver details.' : 'Completed and cancelled rides will be listed here.'}</p>
          {tab === 'upcoming' && <Link to="/book" className="btn btn-primary">Plan a trip</Link>}
        </div>
      )}

      <div className="trip-list">
        {list.map((b) => <TripCard key={b.id} booking={b} onChanged={replace} />)}
      </div>
    </section>
  );
}
