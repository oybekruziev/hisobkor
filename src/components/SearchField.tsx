import {Search} from 'lucide-react';
import {Input} from './ui/input';
import {cn} from '../lib/utils';
import type {ComponentProps} from 'react';

export function SearchField({className, ...props}: ComponentProps<typeof Input>) {
  return <div className={cn('search-field', className)}>
    <Search aria-hidden="true"/>
    <Input type="search" name="search" {...props}/>
  </div>;
}
