import {cn} from '../lib/utils';

export function Brand({href='/', className}: {href?: string; className?: string}) {
  return <a href={href} className={cn('brand', className)} aria-label="Hisobkor.uz bosh sahifasi">
    <img src="/brand-h.png" width="32" height="32" alt=""/>
    <strong>hisobkor<span>.uz</span></strong>
  </a>;
}
