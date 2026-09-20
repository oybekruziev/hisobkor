import React from 'react';
import {ArrowRight} from './icons';

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

  if(!mounted)return <span className="menu-slot" aria-hidden="true"/>;
  return <details className="mobile-menu" ref={ref}>
    <summary aria-label="Menyu" className="menu-button"><span className="menu-bars"><span/><span/></span></summary>
    <div className="menu-panel">
      <nav aria-label="Mobil navigatsiya">
        {links.map(([href,label],i)=>
          <a href={href} key={href} style={{['--i' as string]:i}} onClick={()=>{if(ref.current)ref.current.open=false}}>{label}</a>)}
      </nav>
      <div className="menu-foot">
        <a className="menu-cta" href={`${app}/#register`}>Hisob yaratish<ArrowRight size={18} weight="bold"/></a>
        <a className="menu-login" href={app}>Kirish</a>
      </div>
    </div>
  </details>;
}
