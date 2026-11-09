import { useId } from 'react';
import type { LocationKind, VehicleId } from '@/api/types';

// All illustration is drawn from the brand palette and its shades, so imagery and UI read as one system.
// Depth comes from value: far layers are the lightest (sky), near layers the deepest (blue-900), like real haze.
const C = {
  peach: '#F4BAA3', peach200: '#F8D3C3', peach500: '#EFA487',
  cream: '#F4F0E2', cream50: '#FBF9F3',
  sky: '#A6C8E2', sky100: '#DCE9F3', sky200: '#C9DDEC',
  haze: '#85B2D3', // midway between sky and blue
  blue: '#619DC6', blue700: '#2F6A93', blue900: '#1F4560', deep: '#163449', ink: '#112636',
};

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="17" fill={C.blue} />
      <circle cx="45" cy="21" r="8" fill={C.peach} />
      <path d="M0 50 L20 26 L32 40 L42 30 L64 52 V64 H0Z" fill={C.blue900} />
      <path d="M30 64 Q32 52 36 46" stroke={C.cream} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 5" fill="none" />
    </svg>
  );
}

const Pine = ({ x, y, s = 1, fill = C.deep }: { x: number; y: number; s?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <path d="M0 -46 L11 -22 H5 L15 -4 H-15 L-5 -22 H-11Z" />
    <rect x="-2" y="-4" width="4" height="8" />
  </g>
);

/** Wide morning-in-the-hills panorama for the hero. Decorative: hidden from assistive tech. */
export function HeroLandscape() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g className="cloud cloud-a" fill={C.cream50} opacity="0.8">
        <ellipse cx="1350" cy="150" rx="64" ry="14" /><ellipse cx="1384" cy="139" rx="38" ry="12" />
      </g>
      <g className="cloud cloud-b" fill={C.cream50} opacity="0.6">
        <ellipse cx="640" cy="236" rx="52" ry="11" /><ellipse cx="668" cy="227" rx="30" ry="10" />
      </g>

      <path d="M0 300 C120 250 220 230 340 262 S560 330 700 280 S930 190 1080 238 S1300 300 1440 250 V520 H0Z" fill={C.sky} />
      <path d="M0 360 C140 310 260 300 400 335 S640 400 790 350 S1040 280 1190 330 S1360 370 1440 340 V520 H0Z" fill={C.haze} />
      <path d="M0 420 C160 380 300 370 450 400 S700 450 860 410 S1120 350 1270 395 S1400 430 1440 410 V520 H0Z" fill={C.blue} />
      <path d="M0 470 C200 436 380 446 560 468 S900 492 1100 456 S1350 440 1440 460 V520 H0Z" fill={C.blue900} />

      {[60, 96, 130, 180, 1180, 1230, 1290, 1340, 1395].map((x, i) => (
        <Pine key={x} x={x} y={470 + ((i * 7) % 18)} s={0.9 + ((i * 13) % 5) / 10} fill={i % 2 ? C.deep : C.blue900} />
      ))}

      <path d="M0 500 C300 482 600 506 900 492 S1300 482 1440 497 V520 H0Z" fill={C.cream} />

    </svg>
  );
}

const Mountains = ({ y = 150, fill = C.blue, cap = false }: { y?: number; fill?: string; cap?: boolean }) => (
  <g>
    <path d={`M-10 ${y + 110} L70 ${y + 30} L110 ${y + 62} L190 ${y - 20} L270 ${y + 60} L320 ${y + 24} L410 ${y + 110}Z`} fill={fill} />
    {cap && (
      <g fill={C.cream50}>
        <path d={`M190 ${y - 20} L166 ${y + 8} L180 ${y + 4} L190 ${y + 16} L202 ${y + 3} L214 ${y + 8}Z`} />
        <path d={`M70 ${y + 30} L54 ${y + 50} L64 ${y + 46} L72 ${y + 56} L82 ${y + 46} L90 ${y + 50}Z`} />
      </g>
    )}
  </g>
);

/** A small themed scene per kind of place, used on destination cards. Decorative. */
export function Scene({ kind, seed = 0 }: { kind: LocationKind; seed?: number }) {
  const id = useId();
  const sunX = 270 + ((seed * 37) % 90) - 45;
  const base = (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.sky} />
          <stop offset="1" stopColor={C.cream} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy="78" r="26" fill={C.peach} />
      <circle cx={sunX} cy="78" r="42" fill={C.peach} opacity="0.25" />
    </>
  );

  let body: React.ReactNode;
  switch (kind) {
    case 'wildlife':
      body = (
        <>
          <path d="M0 170 C80 150 160 160 240 150 S360 150 400 160 V260 H0Z" fill={C.haze} />
          <path d="M0 200 C100 188 220 205 400 190 V260 H0Z" fill={C.blue} />
          {[40, 100, 170, 250, 320, 372].map((x, i) => (
            <g key={x} transform={`translate(${x} ${200 + (i % 2) * 8})`}>
              <rect x="-3" y="-60" width="6" height="64" fill={C.deep} />
              <ellipse cx="0" cy="-70" rx={18 + (i % 3) * 4} ry={22 + (i % 2) * 5} fill={i % 2 ? C.blue700 : C.blue900} />
            </g>
          ))}
          <path d="M0 236 C120 224 260 244 400 230 V260 H0Z" fill={C.blue900} />
          <path d="M0 246 C80 240 150 252 240 246 S360 240 400 248" fill="none" stroke={C.cream} strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
        </>
      );
      break;
    case 'lake':
      body = (
        <>
          <Mountains y={90} fill={C.haze} />
          <Mountains y={125} fill={C.blue} />
          <path d="M0 190 C60 180 120 186 200 182 S340 184 400 188 V260 H0Z" fill={C.blue900} />
          <path d="M-20 200 Q200 170 420 200 V260 H-20Z" fill={C.blue700} />
          <g stroke={C.sky} strokeWidth="2" strokeLinecap="round" opacity="0.8" fill="none">
            <path d="M60 218 h46" /><path d="M150 232 h70" /><path d="M260 214 h40" /><path d="M320 238 h50" />
          </g>
          <g transform="translate(206 208)">
            <path d="M-20 0 H20 L14 8 H-14Z" fill={C.peach} />
            <path d="M0 0 V-22 L14 -4Z" fill={C.cream50} />
          </g>
        </>
      );
      break;
    case 'temple':
      body = (
        <>
          <Mountains y={110} fill={C.haze} />
          <path d="M0 190 C100 176 220 192 400 178 V260 H0Z" fill={C.blue} />
          <g transform="translate(200 190)">
            <rect x="-46" y="-6" width="92" height="14" fill={C.blue900} />
            <rect x="-34" y="-20" width="68" height="14" fill={C.blue700} />
            <path d="M-26 -20 Q0 -78 26 -20Z" fill={C.peach} />
            <path d="M-14 -20 Q0 -46 14 -20Z" fill={C.peach500} />
            <rect x="-1.5" y="-96" width="3" height="22" fill={C.blue900} />
            <path d="M1.5 -96 L18 -90 L1.5 -84Z" fill={C.peach} />
            <rect x="-8" y="-17" width="16" height="17" rx="8" fill={C.deep} />
          </g>
          <path d="M0 232 C120 222 260 240 400 226 V260 H0Z" fill={C.blue900} />
        </>
      );
      break;
    case 'snow':
      body = (
        <>
          <Mountains y={60} fill={C.haze} cap />
          <g transform="translate(120 28) scale(1.1)"><Mountains y={90} fill={C.blue} cap /></g>
          <path d="M0 214 C100 200 220 218 400 204 V260 H0Z" fill={C.blue900} />
          {[34, 70, 330, 366].map((x, i) => <Pine key={x} x={x} y={222 + (i % 2) * 6} s={0.8 + (i % 2) * 0.2} fill={C.deep} />)}
        </>
      );
      break;
    case 'river':
      body = (
        <>
          <Mountains y={100} fill={C.haze} />
          <path d="M0 176 C100 166 220 178 400 168 V260 H0Z" fill={C.blue} />
          <path d="M0 196 C90 188 160 206 240 198 S360 190 400 200 V260 H0Z" fill={C.blue700} />
          <g stroke={C.sky} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85">
            <path d="M20 216 q14 -8 28 0 t28 0 t28 0" /><path d="M170 232 q14 -8 28 0 t28 0 t28 0" /><path d="M280 214 q14 -8 28 0 t28 0" />
          </g>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={26 + i * 14} y={176 + i * 6} width={90 - i * 14} height="6" fill={C.blue900} />)}
          {[250, 280, 312].map((x, i) => <circle key={x} cx={x} cy={236 + (i % 2) * 6} r="4" fill={C.peach} />)}
        </>
      );
      break;
    case 'city':
      body = (
        <>
          <Mountains y={120} fill={C.haze} />
          <g fill={C.blue900}>
            {[30, 78, 124, 170, 226, 276, 322].map((x, i) => (
              <rect key={x} x={x} y={150 + ((i * 17) % 40)} width={34 + ((i * 5) % 14)} height={110} rx="2" />
            ))}
          </g>
          <g fill={C.peach} opacity="0.9">
            {[40, 88, 134, 236, 332].map((x, i) => <rect key={x} x={x} y={168 + ((i * 11) % 30)} width="6" height="8" rx="1" />)}
          </g>
          <path d="M0 238 H400 V260 H0Z" fill={C.deep} />
        </>
      );
      break;
    case 'gateway':
      body = (
        <>
          <path d="M0 160 C100 146 240 164 400 150 V260 H0Z" fill={C.haze} />
          <path d="M0 196 H400 V260 H0Z" fill={C.blue700} />
          <path d="M0 226 H400" stroke={C.cream} strokeWidth="3" strokeDasharray="14 12" />
          <g transform="translate(70 196)">
            <rect x="0" y="-52" width="120" height="8" rx="2" fill={C.blue900} />
            <rect x="8" y="-44" width="4" height="44" fill={C.blue900} /><rect x="108" y="-44" width="4" height="44" fill={C.blue900} />
          </g>
          <g transform="translate(250 226)">
            <rect x="0" y="-22" width="64" height="18" rx="6" fill={C.peach} />
            <path d="M12 -22 l8 -12 h26 l8 12Z" fill={C.peach500} />
            <circle cx="14" cy="-3" r="7" fill={C.ink} /><circle cx="50" cy="-3" r="7" fill={C.ink} />
          </g>
        </>
      );
      break;
    case 'hill':
    default:
      body = (
        <>
          <Mountains y={100} fill={C.haze} />
          <path d="M0 176 C90 150 190 170 280 150 S380 150 400 156 V260 H0Z" fill={C.blue} />
          <path d="M0 214 C110 190 240 214 400 192 V260 H0Z" fill={C.blue900} />
          {[[120, 196], [150, 202], [182, 194]].map(([x, y], i) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <rect x="-9" y="-12" width="18" height="12" fill={C.cream50} />
              <path d="M-12 -12 L0 -22 L12 -12Z" fill={i === 1 ? C.peach : C.peach500} />
            </g>
          ))}
          {[24, 52, 78, 300, 332, 366].map((x, i) => <Pine key={x} x={x} y={216 + (i % 2) * 6} s={0.9 + (i % 3) * 0.12} fill={C.deep} />)}
        </>
      );
  }

  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {base}
      {body}
    </svg>
  );
}

/** Side-view car for the vehicle picker. Proportions change per class so the choice reads at a glance. */
export function CarArt({ id: vehicle }: { id: VehicleId }) {
  const shape = {
    sedan: { len: 200, roof: 34, hood: 40 },
    suv: { len: 208, roof: 46, hood: 34 },
    innova: { len: 212, roof: 50, hood: 26 },
    tempo: { len: 222, roof: 62, hood: 10 },
  }[vehicle];
  const x0 = (240 - shape.len) / 2;
  const x1 = x0 + shape.len;
  const baseY = 70;
  const roofY = baseY - 22 - shape.roof;
  const cabinL = x0 + 30 + shape.hood * 0.2;
  const cabinR = x1 - 26;
  const body = `M${x0} ${baseY} V${baseY - 14} Q${x0} ${baseY - 22} ${x0 + 12} ${baseY - 24} L${cabinL - 6} ${baseY - 26}
    Q${cabinL + 8} ${roofY} ${cabinL + 30 + shape.hood} ${roofY} H${cabinR - 24} Q${cabinR - 6} ${roofY} ${cabinR + 2} ${baseY - 28}
    L${x1 - 10} ${baseY - 24} Q${x1} ${baseY - 20} ${x1} ${baseY - 12} V${baseY}Z`;
  return (
    <svg viewBox="0 0 240 96" aria-hidden="true">
      <ellipse cx="120" cy="86" rx="92" ry="5" fill={C.ink} opacity="0.1" />
      <path d={body} fill={C.blue} />
      <path d={`M${x0} ${baseY - 12} H${x1}`} stroke={C.peach} strokeWidth="4" />
      <path d={`M${cabinL + 14} ${baseY - 28} Q${cabinL + 22} ${roofY + 8} ${cabinL + 34 + shape.hood} ${roofY + 8} H${cabinR - 24} Q${cabinR - 12} ${roofY + 8} ${cabinR - 6} ${baseY - 28}Z`} fill={C.sky100} />
      <path d={`M${(cabinL + cabinR) / 2 + 6} ${roofY + 8} V${baseY - 28}`} stroke={C.blue} strokeWidth="3" />
      {[x0 + 44, x1 - 44].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={baseY} r="15" fill={C.ink} />
          <circle cx={cx} cy={baseY} r="7" fill={C.sky} />
        </g>
      ))}
    </svg>
  );
}
