import type {ReactNode} from 'react';
import {cn} from '../lib/utils';

export function PageHeader({title, description, media, actions, className}: {title: ReactNode; description?: ReactNode; media?: ReactNode; actions?: ReactNode; className?: string}) {
  return <header className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}>
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {media}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 max-w-[64ch] text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}
