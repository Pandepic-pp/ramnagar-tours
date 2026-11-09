import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, CircleDot, MapPin, Search } from 'lucide-react';
import type { Place, Region } from '@/api/types';

const REGION_ORDER: Region[] = ['Ramnagar & Corbett', 'Kumaon', 'Garhwal', 'Gateways'];

type Props = {
  label: string;
  value: string;
  places: Place[];
  onChange: (id: string) => void;
  /** Hide this place from the list: you cannot travel from a place to itself */
  excludeId?: string;
  variant: 'from' | 'to';
  placeholder?: string;
  error?: string;
  /** Show distance from base next to each option, useful when choosing a destination */
  showDistance?: boolean;
};

// An accessible combobox. People type "nain" and hit Enter far more often than they scroll a 30-item dropdown.
export function LocationPicker({ label, value, places, onChange, excludeId, variant, placeholder, error, showDistance }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = places.find((p) => p.id === value);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places
      .filter((p) => p.id !== excludeId)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.region.toLowerCase().includes(q))
      .sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region));
  }, [places, excludeId, query]);

  useEffect(() => { setActive(0); }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, uid]);

  const choose = (p: Place) => {
    onChange(p.id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    else if (e.key === 'Tab') { setOpen(false); setQuery(''); }
  };

  let lastRegion: Region | null = null;

  return (
    <div className="field picker" ref={wrapRef}>
      <label htmlFor={`${uid}-input`}>{label}</label>
      <div className={`picker-control${open ? ' is-open' : ''}${error ? ' is-invalid' : ''}`}>
        <span className={`picker-pin picker-pin-${variant}`} aria-hidden="true">
          {variant === 'from' ? <CircleDot size={18} /> : <MapPin size={18} />}
        </span>
        <input
          ref={inputRef}
          id={`${uid}-input`}
          className="picker-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${uid}-opt-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder ?? 'Search a place'}
          value={open ? query : selected?.name ?? ''}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="picker-list">
          {options.length === 0 && (
            <li className="picker-empty" role="presentation">
              <Search size={18} aria-hidden="true" /> No place matches “{query}”. We cover Ramnagar, Kumaon, Garhwal and the main gateways.
            </li>
          )}
          {options.map((p, i) => {
            const header = p.region !== lastRegion ? p.region : null;
            lastRegion = p.region;
            return (
              <li key={p.id} role="presentation">
                {header && <div className="picker-group" role="presentation">{header}</div>}
                <div
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={p.id === value}
                  className={`picker-option${i === active ? ' is-active' : ''}${p.id === value ? ' is-selected' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                >
                  <span className="grow">
                    <span className="picker-option-name">{p.name}</span>
                    {showDistance && p.fromBase && <span className="picker-option-meta">{p.fromBase.distanceKm} km from Ramnagar</span>}
                  </span>
                  {p.id === value && <Check size={18} aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
