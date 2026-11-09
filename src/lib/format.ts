// India has one time zone and no daylight saving, so a fixed +05:30 offset is exact.
// All display goes through these helpers so a visitor's browser time zone can never shift a pickup time.

const IST_OFFSET_MIN = 330;

export const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const toIndiaIso = (date: string, time: string): string => `${date}T${time}:00+05:30`;

// A Date whose UTC fields read as India wall-clock time
const ist = (d: Date | string): Date => new Date(new Date(d).getTime() + IST_OFFSET_MIN * 60000);

export const todayInIndia = (): string => ist(new Date()).toISOString().slice(0, 10);

export const addDays = (dateKey: string, n: number): string => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDateKey = (key: string, withWeekday = true): string => {
  const d = new Date(`${key}T00:00:00Z`);
  const core = `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAY[d.getUTCDay()]}, ${core}` : core;
};

export const formatTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const formatPickup = (iso: string): { date: string; time: string; dateKey: string } => {
  const d = ist(iso);
  const hh = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const key = d.toISOString().slice(0, 10);
  return { date: formatDateKey(key), time: formatTime(hh), dateKey: key };
};

export const formatDuration = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};

// "in 3 hours", "tomorrow", "2 hours ago": how close is a pickup? Used by the dispatch board.
export const relativePickup = (iso: string): { text: string; tone: 'overdue' | 'soon' | 'later' } => {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const abs = Math.abs(diffMin);
  const span = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} hr` : `${Math.round(abs / 1440)} days`;
  if (diffMin < 0) return { text: `${span} ago`, tone: 'overdue' };
  return { text: `in ${span}`, tone: diffMin < 6 * 60 ? 'soon' : 'later' };
};

// Half-hour slots, grouped the way people talk about a day
export const TIME_SLOTS: { label: string; times: string[] }[] = (() => {
  const all: string[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) all.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const within = (from: number, to: number) => all.filter((t) => { const h = Number(t.slice(0, 2)); return h >= from && h < to; });
  return [
    { label: 'Early morning', times: within(4, 8) },
    { label: 'Morning', times: within(8, 12) },
    { label: 'Afternoon', times: within(12, 17) },
    { label: 'Evening', times: within(17, 23) },
    { label: 'Night', times: [...within(23, 24), ...within(0, 4)] },
  ];
})();

export const phoneDigits = (s: string): string => s.replace(/\D/g, '').slice(-10);
export const maskPhone = (phone: string): string => `+91 ${phoneDigits(phone).replace(/(\d{5})(\d{5})/, '$1 $2')}`;
