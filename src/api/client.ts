import type {
  AssignInput, Booking, Catalog, CreateBookingRequest, Me, QuoteRequest, TripQuote,
} from './types';

type Envelope<T> = { success: boolean; message: string; data: T };

export class ApiRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

// The session is an httpOnly cookie, so every call sends credentials. Errors carry the server's own message,
// which is written for end users ("Please wait 24 seconds before requesting another OTP.").
async function request<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiRequestError(0, 'Could not reach the server. Check your connection and try again.');
  }
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiRequestError(res.status, json?.message ?? 'Something went wrong. Please try again.');
  }
  return json.data;
}

export const api = {
  // ---- auth (existing OTP + verification endpoints) ----
  sendOtp: (phone: string) => request<{ expiresAt: string }>('/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone: string, otp: string) =>
    request<{ userId: string; phone: string; name: string | null; isNewUser: boolean }>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    }),
  session: () => request<Me | null>('/auth/session'),
  logout: () => request<null>('/auth/logout', { method: 'POST' }),

  // ---- catalogue and pricing ----
  catalog: () => request<Catalog>('/catalog'),
  quote: (body: QuoteRequest, signal?: AbortSignal) => request<TripQuote>('/quotes', { method: 'POST', body, signal }),

  // ---- customer bookings ----
  createBooking: (body: CreateBookingRequest) => request<Booking>('/bookings', { method: 'POST', body }),
  myBookings: () => request<Booking[]>('/bookings'),
  cancelBooking: (id: string) => request<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' }),

  // ---- admin dispatch ----
  adminBookings: (status: 'all' | 'requested' | 'assigned' | 'completed' | 'cancelled' | 'open') =>
    request<Booking[]>(`/admin/bookings${status === 'open' ? '' : `?status=${status}`}`),
  assignDriver: (id: string, body: AssignInput) => request<Booking>(`/admin/bookings/${id}/assign`, { method: 'PATCH', body }),
  completeBooking: (id: string) => request<Booking>(`/admin/bookings/${id}/complete`, { method: 'PATCH' }),
};
