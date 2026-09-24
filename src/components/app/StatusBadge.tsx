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
  success: 'border-transparent bg-success/10 text-success',
  warning: 'border-transparent bg-warning/12 text-warning-ink',
  issue: 'border-transparent bg-danger/10 text-danger',
  conflict: 'border-transparent bg-danger/10 text-danger',
  info: 'border-transparent bg-accent text-accent-foreground',
  neutral: 'border-border bg-background text-muted-foreground',
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
    <Badge variant="outline" data-status={status} className={cn('rounded-full px-2.5 py-0.5 font-medium', toneClasses[statusTone(status)], className)}>
      <Icon aria-hidden="true" />
      {children || (statuses as Record<string, string>)[status] || status}
    </Badge>
  );
}
