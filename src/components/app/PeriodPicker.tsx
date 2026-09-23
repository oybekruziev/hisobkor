import {useState} from 'react';
import * as Dropdown from '../ui/dropdown-menu';
import {Button} from '../ui/button';
import {Icon} from '../../Icon';
import {cn} from '../../lib/utils';
import {formatPeriod,shiftPeriod,periodMonths} from '../../format.mjs';

/** Period stepper: ‹ prev · "Sentabr 2026" (month grid) · next ›. Uzbek labels, never a browser-locale month input. */
export function PeriodPicker({value,onChange,min='2000-01',max='2100-12',label='Hisobot davri'}:any){
 const [open,setOpen]=useState(false);
 const year=Number(String(value).slice(0,4))||new Date().getFullYear();
 const [view,setView]=useState(year);
 const allowed=(v:string)=>/^\d{4}-\d{2}$/.test(v)&&v>=min&&v<=max;
 const jump=(v:string)=>{if(!allowed(v))return;onChange(v);setView(Number(v.slice(0,4)))};
 const previous=shiftPeriod(value,-1),next=shiftPeriod(value,1);
 return <div className="inline-flex items-center rounded-md border bg-background shadow-xs" role="group" aria-label={label}>
  <Button variant="ghost" size="icon" className="rounded-r-none" aria-label="Oldingi oy" title="Oldingi oy" disabled={!allowed(previous)} onClick={()=>jump(previous)}><Icon name="arrow" className="rotate-180"/></Button>
  <Dropdown.DropdownMenu open={open} onOpenChange={v=>{setOpen(v);if(v)setView(year)}}>
   <Dropdown.DropdownMenuTrigger asChild><Button variant="ghost" className="min-w-36 rounded-none border-x font-medium tabular-nums" aria-label={`${label}: ${formatPeriod(value)}. Oyni tanlash`}>{formatPeriod(value)}<Icon name="down" className="text-muted-foreground"/></Button></Dropdown.DropdownMenuTrigger>
   <Dropdown.DropdownMenuContent className="w-64 p-3" align="end" sideOffset={8} collisionPadding={12} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
    <div className="flex items-center justify-between pb-2"><Button variant="ghost" size="icon-sm" aria-label="Oldingi yil" disabled={!allowed(`${view-1}-12`)} onClick={()=>setView(view-1)}><Icon name="arrow" className="rotate-180"/></Button><span className="text-sm font-medium tabular-nums">{view}</span><Button variant="ghost" size="icon-sm" aria-label="Keyingi yil" disabled={!allowed(`${view+1}-01`)} onClick={()=>setView(view+1)}><Icon name="arrow"/></Button></div>
    <div className="grid grid-cols-3 gap-1">{periodMonths().map(([mm,name]:any)=>{const v=`${view}-${mm}`;const on=v===value;return <Button key={mm} type="button" size="sm" variant={on?'default':'ghost'} className={cn('font-normal',on&&'font-medium')} aria-current={on?'true':undefined} disabled={!allowed(v)} onClick={()=>{jump(v);setOpen(false)}}>{name}</Button>})}</div>
   </Dropdown.DropdownMenuContent>
  </Dropdown.DropdownMenu>
  <Button variant="ghost" size="icon" className="rounded-l-none" aria-label="Keyingi oy" title="Keyingi oy" disabled={!allowed(next)} onClick={()=>jump(next)}><Icon name="arrow"/></Button>
 </div>;
}
