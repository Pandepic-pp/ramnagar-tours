import { useId } from 'react';
import { CalendarDays, Clock, Minus, Plus, Users } from 'lucide-react';
import { TIME_SLOTS, formatTime, todayInIndia } from '@/lib/format';

export function DateField({ label, value, onChange, min, error }: { label: string; value: string; onChange: (v: string) => void; min?: string; error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="icon-field">
        <CalendarDays size={18} aria-hidden="true" />
        <input id={id} type="date" className="input" value={value} min={min ?? todayInIndia()} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="icon-field">
        <Clock size={18} aria-hidden="true" />
        <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          {TIME_SLOTS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.times.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PassengerStepper({ value, onChange, max = 12 }: { value: number; onChange: (n: number) => void; max?: number }) {
  const id = useId();
  return (
    <div className="field">
      <span className="field-label" id={id}>Passengers</span>
      <div className="stepper" role="group" aria-labelledby={id}>
        <Users size={18} aria-hidden="true" className="stepper-icon" />
        <button type="button" className="stepper-btn" aria-label="Fewer passengers" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={18} /></button>
        <output className="stepper-value tnum" aria-live="polite">{value}</output>
        <button type="button" className="stepper-btn" aria-label="More passengers" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={18} /></button>
      </div>
    </div>
  );
}
