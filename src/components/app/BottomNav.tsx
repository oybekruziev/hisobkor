import {Icon} from '../../Icon';

/** Small-screen section navigation. Same information architecture as the ≥1024 sidebar. */
export function BottomNav({items,current,onSelect}:{items:string[][];current:string;onSelect:(id:string)=>void}){
 return <nav className="bottom-nav" aria-label="Kompaniya bo‘limlari">
  {items.map(([id,label,icon,short])=><button key={id} type="button" className="bottom-nav-item" aria-current={current===id?'page':undefined} aria-label={label} onClick={()=>onSelect(id)}><Icon name={icon} size={20}/><span>{short||label}</span></button>)}
 </nav>;
}
