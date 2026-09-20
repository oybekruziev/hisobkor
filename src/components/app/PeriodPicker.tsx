import {useState} from 'react';
import * as Dropdown from '../ui/dropdown-menu';
import {Button} from '../ui/button';
import {Tooltip,TooltipContent,TooltipTrigger} from '../ui/tooltip';
import {Icon} from '../../Icon';
import {formatPeriod,shiftPeriod,periodMonths} from '../../format.mjs';

/** Period stepper: ‹ prev · "Sentabr 2026" (month grid) · next ›. Uzbek labels, never a browser-locale month input. */
export function PeriodPicker({value,onChange,min='2000-01',max='2100-12',label='Hisobot davri'}:any){
 const [open,setOpen]=useState(false);
 const year=Number(String(value).slice(0,4))||new Date().getFullYear();
 const [view,setView]=useState(year);
 const allowed=(v:string)=>/^\d{4}-\d{2}$/.test(v)&&v>=min&&v<=max;
 const jump=(v:string)=>{if(!allowed(v))return;onChange(v);setView(Number(v.slice(0,4)))};
 const previous=shiftPeriod(value,-1),next=shiftPeriod(value,1);
 return <div className="period-picker" role="group" aria-label={label}>
  <Tooltip><TooltipTrigger asChild><Button data-slot="button" variant="ghost" size="icon" className="period-step" aria-label="Oldingi oy" disabled={!allowed(previous)} onClick={()=>jump(previous)}><Icon name="arrow" className="flip" size={16}/></Button></TooltipTrigger><TooltipContent>Oldingi oy</TooltipContent></Tooltip>
  <Dropdown.DropdownMenu open={open} onOpenChange={v=>{setOpen(v);if(v)setView(year)}}>
   <Dropdown.DropdownMenuTrigger asChild><Button variant="ghost" className="period-value" aria-label={`${label}: ${formatPeriod(value)}. Oyni tanlash`}><span>{formatPeriod(value)}</span><Icon name="down" size={15}/></Button></Dropdown.DropdownMenuTrigger>
   <Dropdown.DropdownMenuContent className="period-menu" align="end" sideOffset={8} collisionPadding={12} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
    <div className="period-menu-year"><Button variant="ghost" size="icon" aria-label="Oldingi yil" disabled={!allowed(`${view-1}-12`)} onClick={()=>setView(view-1)}><Icon name="arrow" className="flip" size={16}/></Button><strong>{view}</strong><Button variant="ghost" size="icon" aria-label="Keyingi yil" disabled={!allowed(`${view+1}-01`)} onClick={()=>setView(view+1)}><Icon name="arrow" size={16}/></Button></div>
    <div className="period-menu-grid">{periodMonths().map(([mm,name]:any)=>{const v=`${view}-${mm}`;return <Button key={mm} type="button" variant="ghost" className="period-month" data-selected={v===value||undefined} aria-current={v===value?'true':undefined} disabled={!allowed(v)} onClick={()=>{jump(v);setOpen(false)}}>{name}</Button>})}</div>
   </Dropdown.DropdownMenuContent>
  </Dropdown.DropdownMenu>
  <Tooltip><TooltipTrigger asChild><Button data-slot="button" variant="ghost" size="icon" className="period-step" aria-label="Keyingi oy" disabled={!allowed(next)} onClick={()=>jump(next)}><Icon name="arrow" size={16}/></Button></TooltipTrigger><TooltipContent>Keyingi oy</TooltipContent></Tooltip>
 </div>;
}
