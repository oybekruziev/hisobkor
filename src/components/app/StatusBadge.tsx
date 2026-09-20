import { Check, ClipboardCheck, Clock, MinusCircle, TriangleAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { statuses, statusTone } from '../../domain.mjs';

/** One icon per status tone, used by every badge, list row and summary tile. */
const icons = {
  accepted: Check,
  review_required: ClipboardCheck,
  missing: Clock,
  correction_requested: TriangleAlert,
  waived: MinusCircle,
} as const;

type Status = keyof typeof icons;

export function statusIcon(status: string) {
  return icons[status as Status] || Clock;
}

/**
 * The single status chip of the app: same label (domain.mjs `statuses`),
 * same colour (`statusTone`) and same icon on every screen.
 */
export function StatusBadge({ status, className, children }: { status: string; className?: string; children?: React.ReactNode }) {
  const Icon = statusIcon(status);
  return (
    <Badge variant="outline" data-status={status} data-tone={statusTone(status)} className={cn('badge', className)}>
      <Icon aria-hidden="true" />
      {children || (statuses as Record<string, string>)[status] || status}
    </Badge>
  );
}
