import type {ComponentType} from 'react';
import {cn} from '../../lib/utils';
import {initialsOf, fileKind} from '../../format.mjs';

const tileSizes = {sm: 'size-8 rounded-lg text-xs', md: 'size-9 rounded-lg text-sm', lg: 'size-11 rounded-xl text-base'} as const;

/** Company identity tile: initials on the primary tint. One shape for sidebar, headers and lists. */
export function InitialsTile({name, size = 'md', className}: {name: string; size?: keyof typeof tileSizes; className?: string}) {
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary', tileSizes[size], className)}>{initialsOf(name)}</span>;
}

/** File-type chip: PDF / XLS / CSV / IMG, so a list scans by shape. */
const kindTones: Record<string, string> = {PDF: 'bg-danger/10 text-danger ring-danger/25', XLS: 'bg-success/10 text-success ring-success/25', CSV: 'bg-success/10 text-success ring-success/25', IMG: 'bg-accent text-accent-foreground ring-primary/20'};
export function FileTile({fileName, label, className}: {fileName?: string; label?: string; className?: string}) {
  const kind = label || fileKind(fileName);
  return <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-bold tracking-wide ring-1 ring-inset', kindTones[kind] || 'bg-muted text-muted-foreground ring-border', className)}>{kind}</span>;
}

const iconTones: Record<string, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning-ink',
  issue: 'bg-danger/10 text-danger',
  accent: 'bg-primary/10 text-primary',
};

/** Tone-tinted icon chip used in card headers and link cards. */
export function IconTile({icon: Icon, tone = 'neutral', size = 'md', className}: {icon: ComponentType<any>; tone?: string; size?: 'md' | 'lg'; className?: string}) {
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-lg [&>svg]:size-4', size === 'lg' ? 'size-10' : 'size-8', iconTones[tone] || iconTones.neutral, className)}><Icon/></span>;
}
