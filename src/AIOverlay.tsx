import {useState} from 'react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './components/ui/sheet';
import {Button} from './components/ui/button';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription} from './components/ui/empty';
import {Icon} from './Icon';
import {FileTile} from './components/app/Tiles';
import {AIBar,AIReview,AIBadge} from './ai';
import {eligible} from './ai-domain.mjs';
import {documentName} from './format.mjs';

export function AIOverlay({company,docs,ai,open,onOpenChange}:any){
 const [selected,setSelected]=useState<string|null>(null);
 const files=docs.filter((d:any)=>d.company===company.id&&eligible(d));
 const doc=files.find((d:any)=>d.id===selected);
 return <Sheet open={!!open} onOpenChange={value=>{onOpenChange(value);if(!value)setSelected(null)}}>
  <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
   <SheetHeader className="border-b"><SheetTitle className="flex items-center gap-2"><Icon name="spark" className="text-primary"/>AI tahlil</SheetTitle><SheetDescription>{company.name} · Avtomatik tekshiruv hujjatdagi rekvizitlarni o‘qiydi va izoh beradi. Yakuniy qarorni siz berasiz.</SheetDescription></SheetHeader>
   <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
    {doc?<>
     <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={()=>setSelected(null)}><Icon name="arrow" className="rotate-180"/>Barcha natijalar</Button>
     <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{documentName(doc)}</h3>
     <AIReview doc={doc} docs={files} company={company} ai={ai} onRelated={(related:any)=>setSelected(related.id)}/>
    </>:<>
     <AIBar ai={ai} docs={files}/>
     {files.length?<ul role="list" className="divide-y rounded-lg border">{files.map((file:any)=><li key={file.id}>
      <button type="button" className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={()=>setSelected(file.id)}>
       <FileTile fileName={file.fileName}/><span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">{documentName(file)}</span><AIBadge doc={file}/><Icon name="arrow" size={16} className="shrink-0 text-muted-foreground"/>
      </button></li>)}</ul>
     :<Empty><EmptyHeader><EmptyMedia variant="icon"><Icon name="spark"/></EmptyMedia><EmptyTitle>Tekshiriladigan hujjat yo‘q</EmptyTitle><EmptyDescription>Avtomatik tekshiruv faqat yuklangan fayllarni o‘qiydi. Hujjat yuklaganingizdan so‘ng, uning xulosasi va izohlari shu yerda ko‘rinadi.</EmptyDescription></EmptyHeader></Empty>}
    </>}
   </div>
  </SheetContent>
 </Sheet>;
}
