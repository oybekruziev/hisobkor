import type {ComponentType} from 'react';
import {cn} from '../../lib/utils';
import {initialsOf, fileKind} from '../../format.mjs';

const tileSizes = {sm: 'size-8 rounded-lg text-xs', md: 'size-9 rounded-lg text-sm', lg: 'size-11 rounded-xl text-base'} as const;

/** Company identity tile: initials on the primary tint. One shape for sidebar, headers and lists. */
export function InitialsTile({name, size = 'md', className}: {name: string; size?: keyof typeof tileSizes; className?: string}) {
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary', tileSizes[size], className)}>{initialsOf(name)}</span>;
}

/** File-type chip: PDF / XLS / CSV / IMG, so a list scans by shape. */
const kindTones: Record<string, string> = {PDF: 'bg-rose-50 text-rose-700 ring-rose-200', XLS: 'bg-emerald-50 text-emerald-700 ring-emerald-200', CSV: 'bg-teal-50 text-teal-700 ring-teal-200', IMG: 'bg-sky-50 text-sky-700 ring-sky-200'};
export function FileTile({fileName, label, className}: {fileName?: string; label?: string; className?: string}) {
  const kind = label || fileKind(fileName);
  return <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-bold tracking-wide ring-1 ring-inset', kindTones[kind] || 'bg-muted text-muted-foreground ring-border', className)}>{kind}</span>;
}

const iconTones: Record<string, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  issue: 'bg-red-50 text-red-700',
  accent: 'bg-primary/10 text-primary',
};

/** Tone-tinted icon chip used in card headers and link cards. */
export function IconTile({icon: Icon, tone = 'neutral', size = 'md', className}: {icon: ComponentType<any>; tone?: string; size?: 'md' | 'lg'; className?: string}) {
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-lg [&>svg]:size-4', size === 'lg' ? 'size-10' : 'size-8', iconTones[tone] || iconTones.neutral, className)}><Icon/></span>;
}
