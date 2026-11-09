import { CheckCircle2, CircleDashed, Clock3, XCircle } from 'lucide-react';
import type { BookingStatus } from '@/api/types';

// Status colours stay inside the palette. Warm peach = "waiting on us" (draws attention),
// blue = in motion, deep blue = done, neutral = cancelled. Icon + word as well as colour, never colour alone.
const META: Record<BookingStatus, { label: string; Icon: typeof Clock3 }> = {
  requested: { label: 'Finding a driver', Icon: CircleDashed },
  assigned: { label: 'Driver assigned', Icon: Clock3 },
  completed: { label: 'Completed', Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', Icon: XCircle },
};

export function StatusBadge({ status, adminLabel = false }: { status: BookingStatus; adminLabel?: boolean }) {
  const { label, Icon } = META[status];
  const text = adminLabel && status === 'requested' ? 'Needs driver' : label;
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={14} aria-hidden="true" /> {text}
    </span>
  );
}
