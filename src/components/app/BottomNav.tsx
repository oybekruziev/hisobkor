import {Icon} from '../../Icon';
import {cn} from '../../lib/utils';

/** Small-screen section navigation. Same information architecture as the ≥1024 sidebar. */
export function BottomNav({items,current,onSelect}:{items:string[][];current:string;onSelect:(id:string)=>void}){
 return <nav className="fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Kompaniya bo‘limlari">
  {items.map(([id,label,icon,short])=><button key={id} type="button" aria-current={current===id?'page':undefined} aria-label={label} onClick={()=>onSelect(id)}
   className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none focus-visible:bg-accent',current===id&&'text-primary')}>
   <Icon name={icon} size={20}/><span>{short||label}</span></button>)}
 </nav>;
}
