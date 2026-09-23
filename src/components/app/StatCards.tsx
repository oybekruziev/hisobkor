import type {ComponentType} from 'react';
import {Card, CardHeader, CardDescription, CardTitle, CardAction, CardFooter} from '../ui/card';
import {IconTile} from './Tiles';
import {cn} from '../../lib/utils';

export type Stat = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'issue';
  icon: ComponentType<any>;
  onSelect?: () => void;
  selectLabel?: string;
};

/** shadcn "section card": description, big tabular number, tinted icon, footer hint. */
export function StatCard({stat}: {stat: Stat}) {
  const {label, value, hint, tone = 'neutral', icon, onSelect, selectLabel} = stat;
  const card = (
    <Card className={cn('@container/card h-full gap-4 py-5 text-left max-sm:gap-0 max-sm:py-3', onSelect && 'transition-shadow group-hover/stat:shadow-md')}>
      <CardHeader className="px-5 max-sm:px-3">
        <CardDescription className="max-sm:text-xs max-sm:leading-tight">{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums max-sm:text-2xl">{value}</CardTitle>
        <CardAction className="max-sm:hidden"><IconTile icon={icon} tone={tone}/></CardAction>
      </CardHeader>
      {hint && <CardFooter className="px-5 text-sm text-muted-foreground max-sm:hidden">{hint}</CardFooter>}
    </Card>
  );
  if (!onSelect) return card;
  return <button type="button" className="group/stat h-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={onSelect} aria-label={selectLabel || `${label}: ${value}`}>{card}</button>;
}

export function StatCards({items, className}: {items: Stat[]; className?: string}) {
  return <div className={cn('grid grid-cols-3 gap-2 sm:gap-4', className)}>{items.map(stat => <StatCard key={stat.key} stat={stat}/>)}</div>;
}
