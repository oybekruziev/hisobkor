import {Search} from 'lucide-react';
import {Input} from './ui/input';
import {cn} from '../lib/utils';
import type {ComponentProps} from 'react';

export function SearchField({className, ...props}: ComponentProps<typeof Input>) {
  return <div className={cn('relative', className)}>
    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"/>
    <Input type="search" name="search" className="pl-8" {...props}/>
  </div>;
}
