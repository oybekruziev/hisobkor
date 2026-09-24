import {cn} from '../lib/utils';
import {Wordmark} from './Character';

export function Brand({href='/', className}: {href?: string; className?: string}) {
  return <a href={href} className={cn('flex w-fit items-center', className)} aria-label="Hisobkor.uz bosh sahifasi"><Wordmark size={30}/></a>;
}
