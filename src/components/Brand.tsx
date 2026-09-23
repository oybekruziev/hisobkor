import {cn} from '../lib/utils';

export function Brand({href='/', className}: {href?: string; className?: string}) {
  return <a href={href} className={cn('flex w-fit items-center gap-2', className)} aria-label="Hisobkor.uz bosh sahifasi">
    <img src="/brand-h.png" width="28" height="28" alt="" className="size-7 shrink-0 object-contain"/>
    <span className="text-lg font-semibold tracking-tight">hisobkor<span className="font-normal text-muted-foreground">.uz</span></span>
  </a>;
}
