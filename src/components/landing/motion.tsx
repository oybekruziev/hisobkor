import React from 'react';

const reduced=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/**
 * Progressive enhancement: the markup ships visible. After hydration we only touch
 * elements that are still below the fold, so nothing a visitor already reads can flash out.
 */
export function useReveal(){
  React.useEffect(()=>{
    if(reduced()||!('IntersectionObserver' in window))return;
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-reveal]')]
      .filter(el=>el.getBoundingClientRect().top>window.innerHeight*.9);
    if(!nodes.length)return;
    nodes.forEach(el=>el.classList.add('reveal'));
    const io=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        entry.target.classList.add('reveal-in');
        io.unobserve(entry.target);
      }
    },{rootMargin:'0px 0px -12% 0px',threshold:.15});
    nodes.forEach(el=>io.observe(el));
    return()=>io.disconnect();
  },[]);
}

/**
 * Tagline: words are full contrast in the HTML. Once armed they dim, then light up one
 * by one in reading order as the section travels through the viewport. One scroll
 * listener, throttled through requestAnimationFrame.
 */
export function useWordReveal(ref:React.RefObject<HTMLElement|null>){
  React.useEffect(()=>{
    const host=ref.current;
    if(!host||reduced())return;
    const words=[...host.querySelectorAll<HTMLElement>('.tagline-word')];
    if(!words.length)return;
    if(host.getBoundingClientRect().top<window.innerHeight*.6)return;
    host.classList.add('tagline-armed');
    let shown=-1,ticking=false;
    const paint=()=>{
      ticking=false;
      const box=host.getBoundingClientRect(),vh=window.innerHeight;
      const span=box.height+vh*.35;
      const progress=Math.min(1,Math.max(0,(vh*.82-box.top)/span));
      const next=Math.round(progress*words.length);
      if(next===shown)return;
      words.forEach((word,i)=>word.classList.toggle('tagline-on',i<next));
      shown=next;
    };
    const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(paint)}};
    paint();
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll,{passive:true});
    return()=>{
      window.removeEventListener('scroll',onScroll);
      window.removeEventListener('resize',onScroll);
      host.classList.remove('tagline-armed');
    };
  },[ref]);
}
