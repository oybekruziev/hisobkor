import {useState} from 'react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose} from './components/ui/sheet';
import {Button} from './components/ui/button';
import {Icon} from './Icon';
import {AIBar,AIReview,AIBadge} from './ai';
import {eligible} from './ai-domain.mjs';
import {documentName} from './format.mjs';

export function AIOverlay({company,docs,ai,open,onOpenChange}:any){
 const [selected,setSelected]=useState<string|null>(null);
 const files=docs.filter((d:any)=>d.company===company.id&&eligible(d));
  const doc=files.find((d:any)=>d.id===selected);
 return <Sheet open={!!open} onOpenChange={value=>{onOpenChange(value);if(!value)setSelected(null)}}>
  <SheetContent side="bottom" className="ai-overlay-panel" showCloseButton={false}>
   <SheetHeader><div className="ai-overlay-heading"><SheetTitle><Icon name="spark"/>AI tahlil</SheetTitle><SheetClose asChild><Button variant="ghost" size="icon" aria-label="AI panelini yopish"><Icon name="close"/></Button></SheetClose></div><SheetDescription>{company.name} · Avtomatik tekshiruv va hujjat izohlari</SheetDescription></SheetHeader>
   <div className="ai-overlay-body">
    {doc?<><Button variant="ghost" onClick={()=>setSelected(null)}><Icon name="arrow" className="flip"/>Barcha natijalar</Button><h3 className="ai-overlay-doc-title">{documentName(doc)}</h3><AIReview doc={doc} docs={files} company={company} ai={ai} onRelated={(related:any)=>setSelected(related.id)}/></>:<><AIBar ai={ai} docs={files}/>{files.length?<ul className="ai-overlay-files">{files.map((file:any)=><li key={file.id}><Button variant="ghost" onClick={()=>setSelected(file.id)}><Icon name="document"/><span>{documentName(file)}</span><AIBadge doc={file}/><Icon name="arrow"/></Button></li>)}</ul>:<p className="ai-overlay-empty">Hujjat yuklang. Tekshiruv holati va izohlar shu yerda ko‘rinadi.</p>}</>}
   </div>
  </SheetContent>
 </Sheet>;
}
