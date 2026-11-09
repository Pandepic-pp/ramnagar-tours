# Tours Website Client — CLAUDE.md

## What This Is
Customer and admin web app for the Ramnagar tours and cabs service: sign in with a mobile number (OTP), book a ride by
place, date and time with a server-calculated fare, track it, and (admins) dispatch drivers.
Separate from `../frontend` (the 3D story site). Talks to `../backend`. Vite + React 19 + TypeScript + React Router. Hand-written CSS, no UI kit.

## Run
```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to http://localhost:5100 (cd ../backend && npm run dev)
npm run build      # type-check + production bundle in dist/
```
Dev proxy keeps the `SameSite=Lax` session cookie same-origin. In production serve site and API from one domain (proxy `/api`),
or set `VITE_API_URL` to an API on the same registrable domain. See `.env.example`.

## Folder Layout
```
src/
  api/        client.ts (fetch wrapper, cookie credentials, server error messages), types.ts (backend contract)
  state/      AuthContext (GET /auth/session), CatalogContext (GET /catalog), tripDraft (sessionStorage)
  components/ Header, Layout, LocationPicker (combobox), OtpLogin + OtpInput, FareBreakdown, RouteMap, StatusBadge, art.tsx (all SVG illustration)
  pages/      Home, Book (3 steps), Login, Trips, Admin, NotFound
  styles/     tokens.css (palette + roles, read its header), base, layout, components, home, book, account, admin
  lib/        format.ts (money, India-time helpers, time slots)
```

## Deploy (Vercel + Render)
Client on Vercel (root directory `client`), API on Render. `vercel.json` proxies `/api/*` to the Render URL (replace the placeholder) and falls back to `index.html`,
so the browser only ever talks to the Vercel domain and the SameSite=Lax session cookie stays first-party. Set `TRUST_PROXY_HOPS=2` on Render. Do not set `VITE_API_URL`.

## Rules to keep
- **Never calculate prices here.** Fares come from `POST /api/quotes`; booking sends `quotedTotal` as a price lock and the server
  re-prices and answers 409 if the rate card moved. Places, vehicles and rules come from `GET /api/catalog`.
- **Colour roles** (tokens.css): cream = page (60%), sky/blue = structure (30%), peach = the single primary action (10%).
  `#619DC6` on cream is 2.6:1, so blue is fill/graphics only. Blue text uses `--blue-700`; text on blue/peach fills is `--ink`. Check contrast when adding colours.
- All times are India time (`+05:30`) via `lib/format.ts`. Never use the browser's time zone for display.
- Copy: simple words, short lines, no em dashes (owner rule, shared with `../frontend`).
- Auth guards in `App.tsx` only decide what to show. The server enforces every permission.

## Pages and flows
- `/` hero quick-check, popular routes (`?to=<id>` deep link into /book), fleet, a live sample fare, FAQ.
- `/book` Trip, Car, Confirm. Draft persists in sessionStorage. Sign-in happens inline at Confirm (OTP), no redirect.
- `/login?next=/path` OTP login. `next` must start with `/` (open-redirect safe).
- `/trips` my bookings, driver card once assigned, cancel. Refetches when the tab regains focus.
- `/admin` dispatch board (role `admin`): queue by urgency, assign driver and car, WhatsApp links to send the pickup to the driver
  and the driver to the customer, mark completed. Polls every 45 s.

## Placeholders to replace before launch (TODO(client))
- `src/config.ts`: brand name is a placeholder; phone, WhatsApp and email are empty and hidden until set.
- The rate card, road distances, drive times and toll estimates live in `../backend/src/config/catalog.ts` and are placeholders.
- The FAQ states payment is not taken online. Confirm the real payment policy.
- Admins are made by hand: set `role: 'admin'` on the user in MongoDB.
