import { useCallback, useState } from 'react';
import type { TripType, VehicleId } from '@/api/types';
import { addDays, todayInIndia } from '@/lib/format';

// The trip being planned. Kept in sessionStorage so a refresh, or the detour to verify a phone number,
// never loses what the visitor already chose.
export type TripDraft = {
  tripType: TripType;
  pickupId: string;
  destinationId: string;
  date: string;       // YYYY-MM-DD, India
  time: string;       // HH:mm, India
  returnDate: string; // YYYY-MM-DD, round trips only
  passengers: number;
  vehicle: VehicleId | '';
};

const KEY = 'tours.tripDraft.v1';

export const defaultDraft = (): TripDraft => {
  const tomorrow = addDays(todayInIndia(), 1);
  return { tripType: 'oneway', pickupId: 'ramnagar', destinationId: '', date: tomorrow, time: '07:00', returnDate: tomorrow, passengers: 2, vehicle: '' };
};

const load = (): TripDraft => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return defaultDraft();
    const parsed = { ...defaultDraft(), ...(JSON.parse(raw) as Partial<TripDraft>) };
    // A saved date that has since passed must not silently stick around
    if (parsed.date < todayInIndia()) {
      const fresh = defaultDraft();
      parsed.date = fresh.date;
      parsed.returnDate = fresh.returnDate;
    }
    return parsed;
  } catch {
    return defaultDraft();
  }
};

const save = (d: TripDraft): void => {
  try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode: the draft just lives in memory */ }
};

export function useTripDraft(initial?: Partial<TripDraft>) {
  const [draft, setDraft] = useState<TripDraft>(() => {
    const d = { ...load(), ...initial };
    save(d);
    return d;
  });

  const update = useCallback((patch: Partial<TripDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      // Keep the return date from falling before the pickup date
      if (next.returnDate < next.date) next.returnDate = next.date;
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const d = defaultDraft();
    save(d);
    setDraft(d);
  }, []);

  return { draft, update, reset };
}

export const clearDraft = (): void => {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};
