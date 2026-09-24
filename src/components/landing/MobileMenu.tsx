import React from 'react';
import {ArrowRight,List,X} from './icons';

/**
 * Native <details> so the panel needs no JavaScript to open, plus a small enhancement
 * layer: Escape closes it, links close it, the page behind is inert and does not scroll.
 * It is mounted only after hydration, so a visitor without JavaScript never meets a
 * control that cannot close itself.
 */
export function MobileMenu({links,app}:{links:readonly (readonly [string,string])[];app:string}){
  const [mounted,setMounted]=React.useState(false);
  const ref=React.useRef<HTMLDetailsElement>(null);
  React.useEffect(()=>setMounted(true),[]);
  React.useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    const close=()=>{node.open=false};
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&node.open){close();node.querySelector('summary')?.focus()}};
    const onToggle=()=>{
      document.body.classList.toggle('menu-open',node.open);
      for(const id of ['main','site-footer'])document.getElementById(id)?.toggleAttribute('inert',node.open);
      if(node.open)node.querySelector<HTMLElement>('.menu-panel a')?.focus();
    };
    const wide=window.matchMedia('(min-width:64rem)');
    node.addEventListener('toggle',onToggle);
    document.addEventListener('keydown',onKey);
    wide.addEventListener('change',close);
    return()=>{
      node.removeEventListener('toggle',onToggle);
      document.removeEventListener('keydown',onKey);
      wide.removeEventListener('change',close);
      document.body.classList.remove('menu-open');
    };
  },[mounted]);

  if(!mounted)return <span className="size-11 lg:hidden" aria-hidden="true"/>;
  return <details className="group lg:hidden" ref={ref}>
    <summary aria-label="Menyu" className="grid size-11 cursor-pointer list-none place-items-center rounded-lg text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden">
      <List size={24} className="shrink-0 group-open:hidden" aria-hidden="true"/>
      <X size={24} className="shrink-0 group-not-open:hidden" aria-hidden="true"/>
    </summary>
    <div className="menu-panel fixed inset-x-0 top-[calc(--spacing(16)+env(safe-area-inset-top))] bottom-0 flex flex-col overflow-y-auto bg-background px-6 pt-4 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
      <nav aria-label="Mobil navigatsiya" className="flex flex-col">
        {links.map(([href,label])=>
          <a href={href} key={href} className="border-b border-border py-4 text-xl font-semibold tracking-tight text-foreground" onClick={()=>{if(ref.current)ref.current.open=false}}>{label}</a>)}
      </nav>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <a href={`${app}/#register`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-3 hover:bg-primary-hover pr-3 pl-4 text-base font-semibold text-white">Hisob yaratish<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/></a>
        <a href={app} className="inline-flex items-center justify-center rounded-lg py-3 text-base font-semibold text-foreground ring-1 ring-border">Kirish</a>
      </div>
    </div>
  </details>;
}
