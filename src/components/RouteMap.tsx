import { useId } from 'react';
import type { Place } from '@/api/types';

// A schematic map: the two real coordinates projected onto a small canvas with a curved route between them.
// It is deliberately not a street map. It tells the visitor "this is the trip", and costs no map-tiles request.
const W = 360;
const H = 170;
const PAD_X = 52;
const PAD_Y = 38;

export function RouteMap({ from, to, km }: { from: Place; to: Place; km?: number }) {
  const id = useId();
  const midLat = (from.lat + to.lat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180); // shrink longitude so the shape is not stretched

  const dx = (to.lng - from.lng) * kx;
  const dy = to.lat - from.lat;
  // Fit the route inside the padded canvas. The 0.04 floor stops two near-identical points from zooming to infinity.
  const scale = Math.min((W - PAD_X * 2) / Math.max(Math.abs(dx), 0.04), (H - PAD_Y * 2) / Math.max(Math.abs(dy), 0.04));

  const cx = W / 2;
  const cy = H / 2;
  const ax = cx - (dx * scale) / 2;
  const ay = cy + (dy * scale) / 2;
  const bx = cx + (dx * scale) / 2;
  const by = cy - (dy * scale) / 2;

  // Bow the route sideways a little: roads wind, and a dead-straight line looks like a flight path
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const bow = Math.min(26, len * 0.18);
  const qx = mx + (-(by - ay) / len) * bow;
  const qy = my + ((bx - ax) / len) * bow;
  const path = `M${ax} ${ay} Q${qx} ${qy} ${bx} ${by}`;

  const labelSide = (x: number) => (x < W / 2 ? 'start' : 'end');
  const labelX = (x: number) => (x < W / 2 ? x + 14 : x - 14);

  return (
    <svg className="route-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Route from ${from.name} to ${to.name}${km ? `, about ${km} kilometres` : ''}`}>
      <defs>
        <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#A6C8E2" opacity="0.7" />
        </pattern>
      </defs>
      <rect width={W} height={H} rx="14" fill="#DCE9F3" />
      <rect width={W} height={H} rx="14" fill={`url(#${id}-grid)`} />
      <path d={path} fill="none" stroke="#FBF9F3" strokeWidth="9" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#2F6A93" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 8" />

      <circle cx={ax} cy={ay} r="9" fill="#FBF9F3" stroke="#2F6A93" strokeWidth="3" />
      <circle cx={bx} cy={by} r="10" fill="#F4BAA3" stroke="#112636" strokeWidth="2.5" />
      <circle cx={bx} cy={by} r="3.5" fill="#112636" />

      <text x={labelX(ax)} y={ay + (ay < H / 2 ? 24 : -14)} textAnchor={labelSide(ax)} className="route-map-label">{shorten(from.name)}</text>
      <text x={labelX(bx)} y={by + (by < H / 2 ? 26 : -16)} textAnchor={labelSide(bx)} className="route-map-label route-map-label-strong">{shorten(to.name)}</text>
    </svg>
  );
}

const shorten = (name: string): string => (name.length > 22 ? `${name.slice(0, 21)}…` : name);
