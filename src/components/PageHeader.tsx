import type {ReactNode} from 'react';
import {cn} from '../lib/utils';

export function PageHeader({title, description, actions, className}: {title: string; description?: string; actions?: ReactNode; className?: string}) {
  return <header className={cn('page-heading', className)}>
    <div className="page-heading-copy"><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-heading-actions">{actions}</div>}
  </header>;
}
