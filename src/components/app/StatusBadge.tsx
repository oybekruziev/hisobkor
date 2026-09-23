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

/** Tone → colour. The only place status colours are chosen. */
export const toneClasses: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  issue: 'border-red-200 bg-red-50 text-red-700',
  conflict: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  neutral: 'border-transparent bg-muted text-muted-foreground',
};

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
    <Badge variant="outline" data-status={status} className={cn(toneClasses[statusTone(status)], className)}>
      <Icon aria-hidden="true" />
      {children || (statuses as Record<string, string>)[status] || status}
    </Badge>
  );
}
