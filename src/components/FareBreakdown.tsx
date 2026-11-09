import { Info } from 'lucide-react';
import type { FareLine } from '@/api/types';
import { rupees } from '@/lib/format';

const GROUP_ORDER = ['fare', 'extra', 'passthrough', 'tax', 'adjust'];

// An itemised fare. The total is the visual anchor (display type, deep blue); line items are quiet.
// Grouped the way a GST invoice reads: service, extras, pass-through costs, tax.
export function FareBreakdown({ lines, total, compact = false }: { lines: FareLine[]; total: number; compact?: boolean }) {
  const ordered = [...lines].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  const hasEstimate = lines.some((l) => l.group === 'passthrough');

  return (
    <div className={`fare${compact ? ' fare-compact' : ''}`}>
      <ul className="fare-lines">
        {ordered.map((l) => (
          <li key={l.code} className={`fare-line fare-${l.group}`}>
            <span className="fare-label">
              {l.label}
              {l.detail && !compact && <small>{l.detail}</small>}
            </span>
            <span className="fare-amount tnum">{l.amount < 0 ? `−${rupees(-l.amount)}` : rupees(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="fare-total">
        <span>Total fare</span>
        <strong className="tnum">{rupees(total)}</strong>
      </div>
      {hasEstimate && (
        <p className="fare-note">
          <Info size={14} aria-hidden="true" /> Tolls and permits are estimates and are billed at actuals.
        </p>
      )}
    </div>
  );
}
