import React,{useId} from 'react';
import {Switch} from '../ui/switch';
import {Label} from '../ui/label';
import {Popover,PopoverTrigger,PopoverContent} from '../ui/popover';
import {Icon} from '../../Icon';
import {cn} from '../../lib/utils';

/**
 * One consent control for every place a document can reach the AI service. It is on by default,
 * and the warning icon explains, before anything is sent, that the service runs outside Uzbekistan.
 */
export function AiConsent({checked,onCheckedChange,disabled,className,onHint,offHint}:{checked:boolean;onCheckedChange:(value:boolean)=>void;disabled?:boolean;className?:string;onHint?:string;offHint?:string}){
 const id=useId();
 const hint=`${id}-hint`;
 return <div className={cn('flex items-start gap-3 rounded-lg border bg-muted/40 px-3.5 py-3',className)}>
  <div className="grid min-w-0 flex-1 gap-0.5">
   <div className="flex items-center gap-1.5">
    <Label htmlFor={id} className="text-sm font-medium">AI tahliliga ruxsat</Label>
    <Popover>
     <PopoverTrigger asChild>
      <button type="button" aria-label="AI tahlili va ma’lumotlar qayerda qayta ishlanishi haqida" className="-m-1.5 inline-flex size-7 items-center justify-center rounded-md text-warning outline-none hover:bg-warning/10 focus-visible:ring-[3px] focus-visible:ring-ring/50">
       <Icon name="info" size={16}/>
      </button>
     </PopoverTrigger>
     <PopoverContent align="start" className="w-80 text-sm">
      <p className="flex items-center gap-2 font-medium"><Icon name="info" size={16} className="text-warning"/>Rozilik haqida</p>
      <p className="mt-2 text-pretty text-muted-foreground">Hujjatlaringiz tahlil uchun AI xizmati (OpenAI) serverlariga yuboriladi. <span className="font-medium text-foreground">Bu serverlar O‘zbekistonda joylashmagan.</span></p>
      <p className="mt-2 text-pretty text-muted-foreground">Ruxsat yoqilgan bo‘lsa, bunga rozilik bildirgan bo‘lasiz. Uni istalgan vaqtda o‘chirib qo‘yishingiz mumkin.</p>
     </PopoverContent>
    </Popover>
   </div>
   <p id={hint} className="text-sm text-pretty text-muted-foreground">{checked?(onHint||'AI hujjatni o‘qib, xato va ziddiyatlarni o‘zi topadi.'):(offHint||'AI ishlatilmaydi. Hujjatni o‘zingiz tekshirasiz.')}</p>
  </div>
  <Switch id={id} className="mt-0.5" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-describedby={hint}/>
 </div>;
}
