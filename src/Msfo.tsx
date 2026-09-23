import React,{useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {Button} from './components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardAction} from './components/ui/card';
import {Badge} from './components/ui/badge';
import {Alert,AlertDescription,AlertTitle} from './components/ui/alert';
import {Input} from './components/ui/input';
import {Textarea} from './components/ui/textarea';
import {Label} from './components/ui/label';
import {Checkbox} from './components/ui/checkbox';
import {Spinner} from './components/ui/spinner';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './components/ui/tabs';
import {Field,FieldGroup,FieldLabel,FieldDescription,FieldError} from './components/ui/field';
import {NativeSelect,NativeSelectOption} from './components/ui/native-select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from './components/ui/dialog';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './components/ui/alert-dialog';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription,EmptyContent} from './components/ui/empty';
import * as Dropdown from './components/ui/dropdown-menu';
import {PageHeader} from './components/PageHeader';
import {FileTile} from './components/app/Tiles';
import {Icon} from './Icon';
import {cn} from './lib/utils';
import {request,putFile,getFile,storageMode} from './storage';
import {formatDate} from './format.mjs';
import {docxToBlocks,blocksToHtml,blocksToDocx,blocksText} from './msfo/docx.mjs';
import {htmlToBlocks,sanitizeHtml,textToHtml,plainText} from './msfo/html';
import {DocumentEditor,type EditorHandle,pageClass} from './msfo/Editor';
import {msfoCounts,MSFO_MARKERS,msfoModes,msfoLanguages,newMsfoItem} from './msfo/model.mjs';
import {AiConsent} from './components/app/AiConsent';

type Meta={id:string;title:string;mode:'statements'|'text';language:string;companyId?:string|null;fileKey?:string|null;sourceName?:string;instruction?:string;createdAt:string;updatedAt:string;converted?:boolean;sourceFileKey?:string|null;sourceType?:'pdf'|'docx'|'text';job?:{id:string;startedAt:string}|null;counts?:{conflict:number;warning:number;info:number;missing:number}};
type Content={version:1;html:string;sourceHtml:string;ai?:any};
type Picked={kind:'pdf';name:string;file:File;stats:string}|{kind:'docx';name:string;html:string;stats:string};
type Draft={kind:'pdf'|'docx'|'text';name:string;html:string;file?:File;meta?:Meta};
const sizeLabel=(n:number)=>n<1024*1024?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/1024/1024).toFixed(1).replace('.',',')} MB`;
function toBase64(file:Blob){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(Error('Faylni o‘qib bo‘lmadi.'));r.readAsDataURL(file)})}
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

const toneClass:Record<string,string>={conflict:'border-l-red-500',warning:'border-l-amber-500',info:'border-l-blue-500'};
const toneLabel:Record<string,string>={conflict:'Ziddiyat',warning:'Tekshiring',info:'Eslatma'};
const toneBadge:Record<string,string>={conflict:'border-red-200 bg-red-50 text-red-700',warning:'border-amber-200 bg-amber-50 text-amber-800',info:'border-blue-200 bg-blue-50 text-blue-700'};

async function loadContent(meta:Meta):Promise<Content|null>{
 if(!meta.fileKey)return null;
 const file=await getFile(meta.fileKey,`${meta.fileKey}.json`);
 if(!file)throw Error('Hujjat fayli topilmadi.');
 const value=JSON.parse(await file.text());
 return {version:1,html:String(value.html||''),sourceHtml:String(value.sourceHtml||''),ai:value.ai||null};
}
/** Server storage keeps file ids immutable, so every save is a new file; the browser store can overwrite. */
async function saveContent(meta:Meta,content:Content){
 const key=storageMode()==='browser'&&meta.fileKey?meta.fileKey:crypto.randomUUID();
 await putFile(key,new File([JSON.stringify(content)],`${key}.json`,{type:'application/json'}));
 return key;
}
async function callMsfo(body:any){
 const response=await request('/api/msfo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return (await response.json()).result;
}
function download(bytes:Uint8Array|Blob,name:string){
 const blob=bytes instanceof Blob?bytes:new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const fileName=(title:string)=>`${(title||'MSFO hujjati').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').trim().slice(0,120)||'MSFO hujjati'}.docx`;

/* ------------------------------ List ------------------------------ */

export function MsfoPage({items,setItems,companies,route,go,aiConnected,aiLoading,aiConsent,setAiConsent}:{items:Meta[];setItems:(fn:(all:Meta[])=>Meta[])=>void;companies:any[];route:string;go:(r:string)=>void;aiConnected:boolean;aiLoading:boolean;aiConsent:boolean;setAiConsent:(v:boolean)=>void}){
 const id=route.split('/')[1];
 const [creating,setCreating]=useState<null|{mode:'statements'|'text'}>(null);
 const item=id?items.find(x=>x.id===id):null;
 const mine=companies.filter(c=>!c.isDemo);
 const companyName=(cid?:string|null)=>mine.find(c=>c.id===cid)?.name;
 if(id&&item)return <MsfoWorkspace key={item.id} item={item} setItems={setItems} companyName={companyName(item.companyId)} go={go} aiConnected={aiConnected} aiConsent={aiConsent} setAiConsent={setAiConsent}/>;
 return <>
  <PageHeader title="MSFO hujjatlari" description="PDF yoki Word hisobotni AI yordamida MSFO (IFRS) shakliga o‘tkazing, redaktorda tekshiring va Word’da yuklab oling."
   actions={<Button onClick={()=>setCreating({mode:'statements'})}><Icon name="plus"/>Yangi hujjat</Button>}/>
  {id&&!item&&<Alert><Icon name="alert"/><AlertTitle>Hujjat topilmadi</AlertTitle><AlertDescription>U o‘chirilgan bo‘lishi mumkin. Ro‘yxatdan boshqasini tanlang.</AlertDescription></Alert>}
  {!aiLoading&&!aiConnected&&<Alert><Icon name="alert"/><AlertTitle>AI xizmati hozir ulanmagan</AlertTitle><AlertDescription>Hujjatni yuklab, redaktorda qo‘lda tahrirlash va .docx qilib saqlash ishlaydi. Avtomatik MSFOga o‘tkazish xizmat ulangach yoqiladi.</AlertDescription></Alert>}
  {items.length?<Card className="gap-0 py-0">
   <CardHeader className="border-b py-4"><CardTitle className="text-base">Hujjatlar</CardTitle><CardDescription>{items.length} ta hujjat · oxirgi o‘zgargani yuqorida</CardDescription></CardHeader>
   <ul role="list" className="divide-y">{[...items].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(x=>{const c=x.counts;return <li key={x.id}>
    <a href={`#msfo/${x.id}`} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-6">
     <FileTile label={x.sourceType==='pdf'?'PDF':x.sourceType==='text'?'MATN':'DOCX'}/>
     <span className="grid min-w-0 flex-1 gap-0.5"><span className="truncate text-sm font-medium">{x.title}</span><span className="truncate text-sm text-muted-foreground">{msfoModes[x.mode]}{companyName(x.companyId)?` · ${companyName(x.companyId)}`:''} · {formatDate(x.updatedAt)}</span></span>
     <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">{x.job?<Badge variant="outline" className={toneBadge.info}><Spinner className="size-3"/>O‘tkazilmoqda</Badge>:!x.converted?<Badge variant="outline" className="text-muted-foreground">Qoralama</Badge>:<>
      {c?.conflict?<Badge variant="outline" className={toneBadge.conflict}>{c.conflict} ta ziddiyat</Badge>:null}
      {c?.missing?<Badge variant="outline" className={toneBadge.warning}>{c.missing} joyda ma’lumot kerak</Badge>:null}
      {!c?.conflict&&!c?.missing&&<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><Icon name="check"/>MSFOga o‘tkazilgan</Badge>}
     </>}</span>
     <Icon name="chevron" size={16} className="shrink-0 text-muted-foreground"/>
    </a></li>})}</ul>
  </Card>:<Card>
   <CardContent className="flex flex-col gap-8 py-4">
    <Empty className="border-0 p-0 md:p-0"><EmptyHeader><EmptyMedia variant="icon"><Icon name="msfo"/></EmptyMedia><EmptyTitle>Birinchi hujjatni MSFOga o‘tkazing</EmptyTitle><EmptyDescription>PDF yoki Word faylni yuklang. AI uni MSFO tuzilishi va atamalariga moslab qayta yozadi, siz esa redaktorda tekshirib, tuzatasiz.</EmptyDescription></EmptyHeader></Empty>
    <div className="grid gap-3 md:grid-cols-2">
     {(['statements','text'] as const).map(mode=><button key={mode} type="button" onClick={()=>setCreating({mode})} className="group flex flex-col items-start gap-2 rounded-xl border bg-background p-5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={mode==='statements'?'table':'document'}/></span>
      <span className="font-medium">{msfoModes[mode]}</span>
      <span className="text-sm text-pretty text-muted-foreground">{mode==='statements'?'BHMS bo‘yicha balans, moliyaviy natijalar va pul oqimlari hisobotini MSFO shakllariga transformatsiya va tuzatishlar jadvali bilan.':'Hisob siyosati, izohlar, xat yoki reglamentni MSFO talablari va atamalariga moslab qayta yozish.'}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">Boshlash<Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-0.5"/></span>
     </button>)}
    </div>
    <ol role="list" className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-3">{[['Hujjatni bering','PDF, Word fayl yoki nusxa olingan matn.'],['AI o‘tkazadi','MSFO shakli, qayta tasniflash va izohlar bilan qoralama.'],['Tekshiring va yuklab oling','Redaktorda tahrirlang, .docx sifatida saqlang.']].map(([t,d],i)=><li key={t} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">{i+1}</span><span><span className="block font-medium">{t}</span><span className="text-muted-foreground">{d}</span></span></li>)}</ol>
   </CardContent>
  </Card>}
  <p className="flex items-start gap-2 text-sm text-muted-foreground"><Icon name="shield" size={16} className="mt-0.5 shrink-0"/>AI natijasi — buxgalter tekshiradigan qoralama. Raqamlar o‘ylab topilmaydi: manbada yo‘q qiymatlar «[ma’lumot kerak: …]» deb belgilanadi.</p>
  <NewMsfoDialog open={!!creating} initialMode={creating?.mode||'statements'} companies={mine} aiConnected={aiConnected} aiConsent={aiConsent} setAiConsent={setAiConsent} onClose={()=>setCreating(null)} onCreate={async(draft,convert)=>{
   let sourceFileKey:string|null=null;
   if(draft.kind==='pdf'&&draft.file){sourceFileKey=crypto.randomUUID();await putFile(sourceFileKey,draft.file);}
   const meta:Meta={...draft.meta!,sourceFileKey,sourceType:draft.kind};
   const fileKey=await saveContent(meta,{version:1,html:draft.html,sourceHtml:draft.html});
   setItems(all=>[{...meta,fileKey},...all]);setCreating(null);
   sessionStorageSafe.set(`msfo-autoconvert:${meta.id}`,convert?'1':'');
   go(`msfo/${meta.id}`);
  }}/>
 </>;
}

const sessionStorageSafe={get:(k:string)=>{try{return sessionStorage.getItem(k)}catch{return null}},set:(k:string,v:string)=>{try{v?sessionStorage.setItem(k,v):sessionStorage.removeItem(k)}catch{}}};

/* ------------------------------ New document ------------------------------ */

function NewMsfoDialog({open,initialMode,companies,aiConnected,aiConsent,setAiConsent,onClose,onCreate}:{open:boolean;initialMode:'statements'|'text';companies:any[];aiConnected:boolean;aiConsent:boolean;setAiConsent:(v:boolean)=>void;onClose:()=>void;onCreate:(draft:Draft,convert:boolean)=>Promise<void>}){
 const [mode,setMode]=useState(initialMode);
 const [paste,setPaste]=useState(false);
 const [file,setFile]=useState<Picked|null>(null);
 const [pasted,setPasted]=useState({text:'',html:''});
 const [title,setTitle]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [reading,setReading]=useState(false);
 const [drag,setDrag]=useState(false);
 const [more,setMore]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open){setMode(initialMode);setPaste(false);setFile(null);setPasted({text:'',html:''});setTitle('');setError('');setBusy(false);setMore(false)}},[open,initialMode]);
 const ai=aiConnected&&aiConsent;
 async function pick(f?:File|null){
  setError('');if(!f)return;
  if(/\.doc$/i.test(f.name)){setError('Eski .doc formati o‘qilmaydi. Faylni Word’da .docx qilib saqlang yoki PDF yuklang.');return;}
  const pdf=/\.pdf$/i.test(f.name),docx=/\.docx$/i.test(f.name);
  if(!pdf&&!docx){setError('PDF yoki Word (.docx) fayl tanlang.');return;}
  if(f.size>15*1024*1024){setError('Fayl hajmi 15 MBdan oshmasin.');return;}
  setReading(true);
  try{
   if(pdf){
    const head=new TextDecoder().decode(new Uint8Array(await f.slice(0,1024).arrayBuffer()));
    if(!head.includes('%PDF-'))throw Error('Fayl PDF emas yoki buzilgan.');
    setFile({kind:'pdf',name:f.name,file:f,stats:`PDF · ${sizeLabel(f.size)}`});
   }else{
    const blocks=docxToBlocks(new Uint8Array(await f.arrayBuffer()));
    const tables=blocks.filter((b:any)=>b.type==='table').length;
    setFile({kind:'docx',name:f.name,html:blocksToHtml(blocks),stats:`Word · ${sizeLabel(f.size)}${tables?` · ${tables} ta jadval`:''}`});
   }
  }catch(e:any){setFile(null);setError(e.message||'Fayl o‘qilmadi.');}
  finally{setReading(false)}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');
  const f=new FormData(e.currentTarget as HTMLFormElement);
  let draft:Draft;
  if(!paste){
   if(!file){setError('PDF yoki Word faylni tanlang.');return;}
   if(file.kind==='pdf'&&!ai){setError(aiConnected?'PDFni MSFOga o‘tkazish uchun AI tahliliga ruxsat bering.':'PDFni o‘qish uchun AI xizmati kerak. Hozir u ulanmagan — Word fayl yoki matn bilan davom eting.');return;}
   draft={kind:file.kind,name:file.name,file:file.kind==='pdf'?file.file:undefined,html:file.kind==='docx'?file.html:''} as Draft;
  }else{
   const html=pasted.html?sanitizeHtml(pasted.html):textToHtml(pasted.text);
   if(!plainText(html)){setError('Matnni joylashtiring.');return;}
   draft={kind:'text',name:'',html};
  }
  const name=title.trim()||(draft.name?draft.name.replace(/\.(docx|pdf)$/i,''):msfoModes[mode]);
  draft.meta=newMsfoItem({id:crypto.randomUUID(),title:name,mode,language:String(f.get('language')||'uz'),companyId:String(f.get('company')||'')||null,sourceName:draft.name,instruction:String(f.get('instruction')||'').trim().slice(0,1000)} as any) as Meta;
  setBusy(true);
  try{await onCreate(draft,ai);}
  catch(e:any){setError(e.message||'Hujjat saqlanmadi.');setBusy(false);}
 }
 return <Dialog open={open} onOpenChange={v=>!v&&!busy&&onClose()}>
  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
   <DialogHeader><DialogTitle>Yangi MSFO hujjati</DialogTitle><DialogDescription>Hisobotni yuklang: AI uni MSFO shakliga o‘tkazadi, siz tekshirib Word’da yuklab olasiz.</DialogDescription></DialogHeader>
   <form onSubmit={submit} noValidate><FieldGroup className="gap-5">
    <fieldset><legend className="sr-only">Hujjat turi</legend>
     <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">{(['statements','text'] as const).map(m=><label key={m} className={cn('flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',mode===m?'bg-background text-foreground shadow-sm':'hover:text-foreground')}>
      <input type="radio" name="mode" value={m} checked={mode===m} onChange={()=>setMode(m)} className="sr-only"/>
      <Icon name={m==='statements'?'table':'document'} size={16} className="max-sm:hidden"/>{msfoModes[m]}
     </label>)}</div>
     <p className="mt-2 text-sm text-muted-foreground">{mode==='statements'?'Balans, moliyaviy natijalar, pul oqimlari → MSFO shakllari va tuzatishlar jadvali.':'Hisob siyosati, izohlar, xatlar → MSFO atamalari va tuzilishi.'}</p>
    </fieldset>

    {!paste?<div className="flex flex-col gap-2">
     {file?<div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <FileTile label={file.kind==='pdf'?'PDF':'DOCX'} className={file.kind==='pdf'?'border-red-200 bg-red-50 text-red-700':'border-blue-200 bg-blue-50 text-blue-700'}/>
      <span className="grid min-w-0 flex-1 gap-0.5"><span className="truncate text-sm font-medium">{file.name}</span><span className="text-sm text-muted-foreground">{file.stats}</span></span>
      <Button type="button" variant="ghost" size="icon" aria-label="Faylni olib tashlash" onClick={()=>setFile(null)}><Icon name="close"/></Button>
     </div>
     :<label htmlFor="msfo-file" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);pick(e.dataTransfer.files[0])}} className={cn('flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50',drag?'border-primary bg-primary/5':'border-border bg-muted/30')}>
      <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">{reading?<Spinner/>:<Icon name="upload" size={20}/>}</span>
      <span className="grid gap-1"><span className="text-sm font-medium">{reading?'Fayl o‘qilmoqda…':'Faylni tanlang yoki shu yerga tashlang'}</span><span className="text-sm text-muted-foreground">PDF (skaner ham bo‘ladi) yoki Word .docx · 15 MBgacha</span></span>
     </label>}
     <input ref={input} id="msfo-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" aria-label="PDF yoki Word fayl" onChange={e=>{pick(e.target.files?.[0]);e.target.value=''}}/>
     <Button type="button" variant="link" size="sm" className="h-auto self-start px-0 text-muted-foreground" onClick={()=>{setPaste(true);setError('')}}><Icon name="copy"/>Fayl yo‘qmi? Matnni joylashtiring</Button>
    </div>
    :<Field>
     <FieldLabel htmlFor="msfo-paste">Hujjat matni</FieldLabel>
     <Textarea id="msfo-paste" autoFocus rows={7} placeholder="Word yoki Excel’dan nusxa olib shu yerga joylashtiring (Ctrl+V). Jadvallar saqlanadi." value={pasted.text} onChange={e=>setPasted({text:e.target.value,html:''})} onPaste={e=>{const html=e.clipboardData.getData('text/html');const text=e.clipboardData.getData('text/plain');if(html){e.preventDefault();setPasted({text,html});}}}/>
     {pasted.html&&<FieldDescription>Formatlangan matn olindi: sarlavha va jadvallar saqlanadi.</FieldDescription>}
     <Button type="button" variant="link" size="sm" className="h-auto self-start px-0 text-muted-foreground" onClick={()=>{setPaste(false);setError('')}}><Icon name="upload"/>Fayl yuklash</Button>
    </Field>}

    <Collapsible open={more} onOpenChange={setMore} className="rounded-lg border">
     <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="group/trigger h-auto min-h-11 w-full justify-between rounded-lg px-3.5 py-2 font-normal"><span className="grid text-left"><span className="text-sm font-medium">Qo‘shimcha sozlamalar</span><span className="text-sm text-muted-foreground">Nom, kompaniya, natija tili, AI uchun izoh</span></span><Icon name="down" className="text-muted-foreground transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger>
     <CollapsibleContent forceMount className="grid gap-4 border-t px-3.5 py-4 data-[state=closed]:hidden sm:grid-cols-2">
      <Field className="sm:col-span-2"><FieldLabel htmlFor="msfo-title">Hujjat nomi</FieldLabel><Input id="msfo-title" value={title} maxLength={240} placeholder={file?file.name.replace(/\.(docx|pdf)$/i,''):'Masalan, 2025 yil moliyaviy hisoboti'} onChange={e=>setTitle(e.target.value)}/></Field>
      <Field><FieldLabel htmlFor="msfo-company">Kompaniya</FieldLabel><NativeSelect id="msfo-company" name="company" className="w-full" defaultValue=""><NativeSelectOption value="">Tanlanmagan</NativeSelectOption>{companies.map(c=><NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}</NativeSelect></Field>
      <Field><FieldLabel htmlFor="msfo-language">Natija tili</FieldLabel><NativeSelect id="msfo-language" name="language" className="w-full" defaultValue="uz">{Object.entries(msfoLanguages).map(([v,l])=><NativeSelectOption key={v} value={v}>{l as string}</NativeSelectOption>)}</NativeSelect></Field>
      <Field className="sm:col-span-2"><FieldLabel htmlFor="msfo-instruction">AI uchun izoh</FieldLabel><Textarea id="msfo-instruction" name="instruction" rows={2} maxLength={1000} placeholder="Masalan: hisobot davri 2025 yil, taqqoslama 2024 yil; valyuta ming so‘m"/></Field>
     </CollapsibleContent>
    </Collapsible>

    {aiConnected&&<AiConsent checked={aiConsent} onCheckedChange={setAiConsent} onHint="Ochilishi bilan AI hujjatni MSFO shakliga o‘tkazadi." offHint="Hujjat redaktorda ochiladi, MSFOga o‘zingiz o‘tkazasiz."/>}
    {!aiConnected&&<Alert><Icon name="alert"/><AlertDescription>AI xizmati hozir ulanmagan: Word yoki matn redaktorda ochiladi, MSFOga o‘tkazish keyinroq ishlaydi.</AlertDescription></Alert>}
    {error&&<FieldError role="alert">{error}</FieldError>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Bekor qilish</Button><Button type="submit" disabled={busy||reading}>{busy?<Spinner/>:<Icon name={ai?'spark':'arrow'}/>}{ai?'MSFOga o‘tkazish':'Redaktorda ochish'}</Button></DialogFooter>
   </FieldGroup></form>
  </DialogContent>
 </Dialog>;
}

/* ------------------------------ Workspace (editor + AI panel) ------------------------------ */

function MsfoWorkspace({item,setItems,companyName,go,aiConnected:connected,aiConsent,setAiConsent}:{item:Meta;setItems:(fn:(all:Meta[])=>Meta[])=>void;companyName?:string;go:(r:string)=>void;aiConnected:boolean;aiConsent:boolean;setAiConsent:(v:boolean)=>void}){
 const aiConnected=connected&&aiConsent;
 const editor=useRef<EditorHandle>(null);
 const [content,setContent]=useState<Content|null>(null);
 const [loadError,setLoadError]=useState('');
 const [status,setStatus]=useState<'saved'|'dirty'|'saving'|'error'>('saved');
 const [tab,setTab]=useState('msfo');
 const [converting,setConverting]=useState(false);
 const [aiError,setAiError]=useState('');
 const [hasSelection,setHasSelection]=useState(false);
 const [confirmDelete,setConfirmDelete]=useState(false);
 const [confirmConvert,setConfirmConvert]=useState(false);
 const [missing,setMissing]=useState(0);
 const [editorKey,setEditorKey]=useState(0);
 const [elapsed,setElapsed]=useState(0);
 const [pdfUrl,setPdfUrl]=useState('');
 const alive=useRef(true);
 useEffect(()=>()=>{alive.current=false},[]);
 useEffect(()=>{if(!converting){setElapsed(0);return}const t0=Date.now();const t=setInterval(()=>setElapsed(Math.round((Date.now()-t0)/1000)),1000);return()=>clearInterval(t)},[converting]);
 useEffect(()=>{if(item.sourceType!=='pdf'||!item.sourceFileKey)return;let url='';let live=true;getFile(item.sourceFileKey,item.sourceName||'manba.pdf').then(f=>{if(f&&live){url=URL.createObjectURL(new Blob([f],{type:'application/pdf'}));setPdfUrl(url)}}).catch(()=>{});return()=>{live=false;if(url)URL.revokeObjectURL(url)}},[item.sourceFileKey]);// eslint-disable-line react-hooks/exhaustive-deps
 const meta=useRef(item);meta.current=item;
 const contentRef=useRef<Content|null>(null);contentRef.current=content;
 const timer=useRef<any>(null);
 const saving=useRef<Promise<void>|null>(null);

 const countMissing=useCallback(()=>{const html=editor.current?.getHtml()||'';setMissing(msfoCounts(null,html).missing)},[]);
 useEffect(()=>{let live=true;loadContent(item).then(c=>{if(!live)return;const value=c||{version:1 as const,html:'',sourceHtml:''};setContent(value);setMissing(msfoCounts(null,value.html).missing)}).catch(e=>live&&setLoadError(e.message||'Hujjat ochilmadi.'));return()=>{live=false}},[]);// eslint-disable-line react-hooks/exhaustive-deps

 const save=useCallback(async()=>{
  clearTimeout(timer.current);
  const current=contentRef.current;if(!current||!editor.current)return;
  const html=editor.current.getHtml();
  const next={...current,html};
  setStatus('saving');
  const run=(async()=>{try{
   const fileKey=await saveContent(meta.current,next);
   contentRef.current=next;setContent(next);
   const counts=msfoCounts(next.ai,html);
   setItems(all=>all.map(x=>x.id===meta.current.id?{...x,fileKey,updatedAt:new Date().toISOString(),counts}:x));
   setStatus(s=>s==='saving'?'saved':s);
  }catch{setStatus('error')}})();
  saving.current=run;await run;
 },[setItems]);
 const changed=useCallback(()=>{setStatus('dirty');clearTimeout(timer.current);timer.current=setTimeout(()=>{void save();countMissing()},2500)},[save,countMissing]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[save]);
 useEffect(()=>()=>{if(timer.current){clearTimeout(timer.current);void save()}},[save]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(status!=='saved'){e.preventDefault();e.returnValue=''}};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn)},[status]);

 /** Starts (or resumes) a background conversion and polls it until the result arrives. */
 async function convert(resume?:{id:string}){
  setConfirmConvert(false);setAiError('');
  const html=editor.current?.getHtml()||content?.html||'';
  let job=resume;
  setConverting(true);
  try{
   if(!job){
    const base={action:'convert',mode:item.mode,language:item.language,title:item.title,instruction:item.instruction||''};
    let body:any;
    if(plainText(html))body={...base,source:html};
    else if(plainText(content?.sourceHtml||''))body={...base,source:content!.sourceHtml};
    else if(item.sourceType==='pdf'&&item.sourceFileKey){
     const name=/\.pdf$/i.test(item.sourceName||'')?item.sourceName:'manba.pdf';
     if(storageMode()==='server')body={...base,file:{name,fileKey:item.sourceFileKey}};
     else{const pdf=await getFile(item.sourceFileKey,item.sourceName||'manba.pdf');if(!pdf)throw Error('Asl PDF fayl topilmadi. Uni qayta yuklang.');body={...base,file:{name,base64:await toBase64(pdf)}};}
    }else throw Error('Avval hujjatga matn kiriting yoki fayl yuklang.');
    const response=await request('/api/msfo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    job=(await response.json()).job;
    if(!job?.id)throw Error('AI javobi kutilgan shaklda emas.');
    setItems(all=>all.map(x=>x.id===item.id?{...x,job:{id:job!.id,startedAt:new Date().toISOString()}}:x));
   }
   let result:any=null,misses=0;
   while(alive.current){
    await wait(3000);if(!alive.current)return;
    let data:any;
    try{data=await (await request(`/api/msfo/jobs/${encodeURIComponent(job.id)}`)).json();misses=0;}
    catch(e:any){if(e.status>=400&&e.status<500)throw e;if(++misses>10)throw Error('AI xizmati bilan aloqa uzildi. Qayta urinib ko‘ring.');continue;}
    if(data.status==='processing')continue;
    if(data.status==='error')throw Error(data.error||'AI hujjatni o‘tkaza olmadi.');
    result=data.result;break;
   }
   if(!result)return;
   const previous=editor.current?.getHtml()||'';
   const clean=sanitizeHtml(result.documentHtml);
   editor.current?.setHtml(clean);
   const next:Content={version:1,html:clean,sourceHtml:content?.sourceHtml||'',ai:{summary:result.summary,changes:result.changes,limitations:result.limitations,model:result.model,createdAt:result.createdAt}};
   contentRef.current=next;setContent(next);setTab('msfo');
   setItems(all=>all.map(x=>x.id===item.id?{...x,converted:true,job:null}:x));
   await save();countMissing();
   toast.success('Hujjat MSFO shakliga o‘tkazildi. Izohlarni tekshiring.',previous?{action:{label:'Bekor qilish',onClick:()=>{editor.current?.setHtml(previous);changed()}}}:undefined);
  }catch(e:any){
   if(!alive.current)return;
   setItems(all=>all.map(x=>x.id===item.id?{...x,job:null}:x));
   setAiError(e.message||'AI so‘rovi bajarilmadi.');
  }finally{if(alive.current)setConverting(false)}
 }
 // A conversion started earlier keeps running on the server; reopening the document picks it up.
 useEffect(()=>{if(content&&item.job?.id&&!converting&&Date.now()-Date.parse(item.job.startedAt)<6*60*60*1000)void convert({id:item.job.id})},[content===null]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(content&&sessionStorageSafe.get(`msfo-autoconvert:${item.id}`)){sessionStorageSafe.set(`msfo-autoconvert:${item.id}`,'');void convert()}},[content===null]);// eslint-disable-line react-hooks/exhaustive-deps

 function exportDocx(which:'msfo'|'source'){
  const html=which==='msfo'?editor.current?.getHtml()||'':content?.sourceHtml||'';
  const blocks=htmlToBlocks(html);
  if(!blocks.length){toast.error('Hujjat bo‘sh.');return;}
  download(blocksToDocx(blocks,{title:item.title}),which==='msfo'?fileName(item.title):fileName(`${item.title} (asl)`));
 }
 function rename(value:string){const title=value.trim().slice(0,240);if(!title||title===item.title)return;setItems(all=>all.map(x=>x.id===item.id?{...x,title,updatedAt:new Date().toISOString()}:x))}

 if(loadError)return <Alert variant="destructive"><Icon name="alert"/><AlertTitle>{loadError}</AlertTitle><AlertDescription><Button variant="outline" size="sm" className="mt-2" onClick={()=>go('msfo')}>Ro‘yxatga qaytish</Button></AlertDescription></Alert>;
 const ai=content?.ai;
 const counts=msfoCounts(ai,'');
 return <>
  <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
   <div className="flex min-w-0 flex-1 items-start gap-2">
    <Button variant="ghost" size="icon" aria-label="MSFO hujjatlari ro‘yxati" className="mt-0.5 shrink-0" onClick={()=>go('msfo')}><Icon name="back"/></Button>
    <div className="min-w-0 flex-1">
     <label htmlFor="msfo-name" className="sr-only">Hujjat nomi</label>
     <input id="msfo-name" key={item.title} defaultValue={item.title} maxLength={240} onBlur={e=>rename(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')(e.target as HTMLInputElement).blur()}} className="-mx-2 w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-0.5 text-2xl font-semibold tracking-tight outline-none hover:border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"/>
     <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><span>{msfoModes[item.mode]}</span>{companyName&&<><span aria-hidden="true">·</span><span>{companyName}</span></>}<span aria-hidden="true">·</span><span>{msfoLanguages[item.language]||'O‘zbekcha'}</span><span aria-hidden="true">·</span>
      <span role="status" className={cn('inline-flex items-center gap-1',status==='error'&&'text-red-700')}>{status==='saving'?<><Spinner className="size-3.5"/>Saqlanmoqda…</>:status==='dirty'?'Saqlanmagan o‘zgarish':status==='error'?<><Icon name="alert" size={14}/>Saqlanmadi — <button type="button" className="underline underline-offset-2" onClick={()=>void save()}>qayta urinish</button></>:<><Icon name="check" size={14} className="text-emerald-600"/>Saqlandi</>}</span></p>
    </div>
   </div>
   <div className="flex shrink-0 flex-wrap items-center gap-2 max-md:pl-11">
    <Button disabled={!content||converting||!aiConnected} onClick={()=>item.converted?setConfirmConvert(true):convert()}>{converting?<Spinner/>:<Icon name="spark"/>}{item.converted?'Qayta o‘tkazish':'MSFOga o‘tkazish'}</Button>
    <Button variant="outline" disabled={!content} onClick={()=>exportDocx('msfo')}><Icon name="fileDown"/>Word (.docx)</Button>
    <Dropdown.DropdownMenu modal={false}>
     <Dropdown.DropdownMenuTrigger asChild><Button data-slot="button" variant="outline" size="icon" aria-label="Boshqa amallar"><Icon name="more"/></Button></Dropdown.DropdownMenuTrigger>
     <Dropdown.DropdownMenuContent align="end" className="min-w-56">
      <Dropdown.DropdownMenuItem disabled={!content?.sourceHtml} onSelect={()=>exportDocx('source')}><Icon name="download"/>Asl hujjatni yuklab olish</Dropdown.DropdownMenuItem>
      <Dropdown.DropdownMenuItem onSelect={()=>void save()}><Icon name="check"/>Hozir saqlash<Dropdown.DropdownMenuShortcut>Ctrl+S</Dropdown.DropdownMenuShortcut></Dropdown.DropdownMenuItem>
      <Dropdown.DropdownMenuSeparator/>
      <Dropdown.DropdownMenuItem variant="destructive" onSelect={()=>setConfirmDelete(true)}><Icon name="trash"/>Hujjatni o‘chirish</Dropdown.DropdownMenuItem>
     </Dropdown.DropdownMenuContent>
    </Dropdown.DropdownMenu>
   </div>
  </header>

  {aiError&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertTitle>{aiError}</AlertTitle><AlertDescription>Hujjat o‘zgartirilmadi. Keyinroq qayta urinib ko‘ring yoki matnni qisqaroq qismlarga bo‘ling.</AlertDescription></Alert>}

  <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
   <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-3">
    <TabsList aria-label="Ko‘rinish"><TabsTrigger value="msfo"><Icon name="msfo"/>MSFO hujjati</TabsTrigger><TabsTrigger value="source" disabled={!content?.sourceHtml&&!pdfUrl}><Icon name="document"/>Asl hujjat</TabsTrigger></TabsList>
    <TabsContent value="msfo" forceMount className="relative min-w-0 data-[state=inactive]:hidden">
     {content?<DocumentEditor key={editorKey} ref={editor} label={`${item.title} — MSFO hujjati`} initialHtml={content.html} onChange={changed} onSelection={setHasSelection}/>
      :<div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"><Spinner className="mr-2"/>Hujjat ochilmoqda…</div>}
     {converting&&<div role="status" aria-live="polite" className="absolute inset-0 z-20 flex items-start justify-center rounded-lg bg-background/80 pt-32 backdrop-blur-[2px]">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border bg-background p-6 text-center shadow-lg"><Spinner className="size-6 text-primary"/><p className="font-medium">AI hujjatni MSFOga o‘tkazmoqda</p><p className="text-sm text-muted-foreground tabular-nums">{elapsed<60?`${elapsed} soniya`:`${Math.floor(elapsed/60)} daqiqa ${elapsed%60} soniya`} · odatda 1–4 daqiqa</p><p className="text-sm text-pretty text-muted-foreground">Sahifani yopsangiz ham ish to‘xtamaydi: hujjatni qayta ochganingizda natija shu yerda bo‘ladi.</p></div>
     </div>}
    </TabsContent>
    <TabsContent value="source" className="min-w-0">
     <p className="mb-3 text-sm text-muted-foreground">Yuklangan asl hujjat{item.sourceName?` · ${item.sourceName}`:''}. Faqat ko‘rish uchun — tahrir MSFO hujjatida qilinadi.</p>
     {pdfUrl&&!content?.sourceHtml?<iframe title="Asl PDF hujjat" src={pdfUrl} className="h-[75vh] w-full rounded-lg border bg-muted/50"/>
     :<div className="overflow-x-auto rounded-lg border bg-muted/50 py-4 sm:p-8"><article aria-label="Asl hujjat" className={pageClass} dangerouslySetInnerHTML={{__html:sanitizeHtml(content?.sourceHtml||'')}}/></div>}
    </TabsContent>
   </Tabs>

   <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4" aria-label="AI yordamchi">
    <Card className="gap-4 py-4">
     <CardHeader className="px-4"><CardTitle className="flex items-center gap-2 text-base"><Icon name="spark" className="text-primary"/>AI xulosasi</CardTitle>
      {ai&&<CardDescription>{formatDate(ai.createdAt)} · {ai.changes?.length||0} ta izoh</CardDescription>}</CardHeader>
     <CardContent className="flex flex-col gap-3 px-4">
      {connected&&!aiConsent&&<AiConsent checked={false} onCheckedChange={setAiConsent} offHint="Yoqsangiz, hujjatni MSFOga o‘tkazish mumkin bo‘ladi."/>}
      {!ai?<><p className="text-sm text-muted-foreground">{aiConnected?'«MSFOga o‘tkazish» tugmasini bosing: AI hujjatni MSFO shakliga o‘tkazadi va har bir o‘zgarishni standart bilan izohlaydi.':'AI xizmati ulanmagan. Hujjatni qo‘lda tahrirlab, .docx qilib yuklab olishingiz mumkin.'}</p>
       {item.mode==='statements'&&<ul role="list" className="flex flex-col gap-1.5 text-sm">{['Moliyaviy holat to‘g‘risidagi hisobot','Foyda yoki zarar va BUD','Kapital va pul oqimlari','Transformatsion tuzatishlar jadvali'].map(x=><li key={x} className="flex items-center gap-2"><Icon name="check" size={14} className="text-muted-foreground"/>{x}</li>)}</ul>}</>
      :<>
       <p className="text-sm text-pretty">{ai.summary}</p>
       <div className="flex flex-wrap gap-1.5">{(['conflict','warning','info'] as const).map(t=>counts[t]?<Badge key={t} variant="outline" className={toneBadge[t]}>{counts[t]} · {toneLabel[t]}</Badge>:null)}</div>
       <ul role="list" tabIndex={0} aria-label="AI izohlari" className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-md pr-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{[...(ai.changes||[])].sort((a:any,b:any)=>['conflict','warning','info'].indexOf(a.severity)-['conflict','warning','info'].indexOf(b.severity)).map((c:any,i:number)=><li key={i} className={cn('rounded-md border border-l-4 bg-background p-3',toneClass[c.severity]||toneClass.warning)}>
        <p className="flex items-start justify-between gap-2 text-sm font-medium"><span className="[overflow-wrap:anywhere]">{c.title}</span>{c.standard&&c.standard!=='—'&&<Badge variant="secondary" className="shrink-0 font-mono text-[0.6875rem]">{c.standard}</Badge>}</p>
        <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{c.detail}</p>
       </li>)}</ul>
       {ai.limitations?.length>0&&<Collapsible><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="group/trigger -ml-2 self-start text-muted-foreground">Tahlil chegaralari<Icon name="down" className="transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger><CollapsibleContent><ul role="list" className="list-disc pl-5 text-sm text-muted-foreground">{ai.limitations.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></CollapsibleContent></Collapsible>}
      </>}
     </CardContent>
    </Card>

    {missing>0&&<Card className="gap-3 py-4"><CardHeader className="px-4"><CardTitle className="text-base">{missing} joyda ma’lumot kerak</CardTitle><CardDescription>AI manbada topmagan qiymatlar. Ularni to‘ldirmasdan hisobot yakunlanmaydi.</CardDescription>
     <CardAction><Button size="sm" variant="outline" onClick={()=>{setTab('msfo');requestAnimationFrame(()=>editor.current?.findNext(MSFO_MARKERS))}}><Icon name="find"/>Keyingisi</Button></CardAction></CardHeader></Card>}

    <RewritePanel item={item} editor={editor} hasSelection={hasSelection} aiConnected={aiConnected} disabled={converting||!content}/>
   </aside>
  </div>

  <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hujjat qayta o‘tkazilsinmi?</AlertDialogTitle><AlertDialogDescription>AI redaktordagi joriy matnni qaytadan MSFO shakliga o‘tkazadi va natija bilan almashtiradi. Keyin «Bekor qilish» orqali oldingi holatga qaytishingiz mumkin.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={()=>void convert()}><Icon name="spark"/>Qayta o‘tkazish</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>«{item.title}» o‘chirilsinmi?</AlertDialogTitle><AlertDialogDescription>Hujjat MSFO ro‘yxatidan olib tashlanadi. Kerak bo‘lsa, avval .docx qilib yuklab oling.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={()=>{clearTimeout(timer.current);timer.current=null;setStatus('saved');setItems(all=>all.filter(x=>x.id!==item.id));go('msfo');toast.success('Hujjat o‘chirildi.')}}><Icon name="trash"/>O‘chirish</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}

const quick=['MSFO atamalariga moslash','Jadval ko‘rinishiga keltirish','Qisqaroq va aniqroq yozish','Rasmiy uslubda qayta yozish'];

function RewritePanel({item,editor,hasSelection,aiConnected,disabled}:{item:Meta;editor:React.RefObject<EditorHandle|null>;hasSelection:boolean;aiConnected:boolean;disabled:boolean}){
 const [instruction,setInstruction]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [preview,setPreview]=useState<{html:string;note:string}|null>(null);
 async function run(text=instruction){
  const selection=editor.current?.getSelectionHtml()||'';
  if(!selection){setError('Avval hujjatdan qayta yoziladigan qismni belgilang.');return;}
  if(!text.trim()){setError('Ko‘rsatma yozing yoki tayyor variantni tanlang.');return;}
  setError('');setBusy(true);setPreview(null);
  try{const result=await callMsfo({action:'rewrite',mode:item.mode,language:item.language,title:item.title,instruction:text.trim(),selection,context:plainText(editor.current?.getHtml()||'').slice(0,6000)});setPreview({html:sanitizeHtml(result.html),note:result.note});}
  catch(e:any){setError(e.message||'AI so‘rovi bajarilmadi.')}finally{setBusy(false)}
 }
 return <Card className="gap-4 py-4">
  <CardHeader className="px-4"><CardTitle className="flex items-center gap-2 text-base"><Icon name="wand" className="text-primary"/>Tanlangan qismni qayta yozish</CardTitle><CardDescription>{hasSelection?'Belgilangan matn AI bilan qayta yoziladi.':'Hujjatdan paragraf yoki jadvalni belgilang.'}</CardDescription></CardHeader>
  <CardContent className="flex flex-col gap-3 px-4">
   {preview?<>
    <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-3"><div className={cn(pageClass,'max-w-none p-0 text-sm shadow-none ring-0 sm:min-h-0 sm:p-0 bg-transparent')} dangerouslySetInnerHTML={{__html:preview.html}}/></div>
    {preview.note&&<p className="text-sm text-muted-foreground">{preview.note}</p>}
    <div className="flex gap-2"><Button size="sm" onClick={()=>{if(!editor.current?.replaceSelection(preview.html))setError('Belgilangan joy topilmadi. Qismni qayta belgilang.');else{setPreview(null);toast.success('O‘zgarish qo‘llandi. Ctrl+Z bilan qaytarish mumkin.')}}}><Icon name="check"/>Qo‘llash</Button><Button size="sm" variant="outline" onClick={()=>setPreview(null)}>Bekor qilish</Button></div>
   </>:<>
    <div className="flex flex-wrap gap-1.5">{quick.map(q=><Button key={q} type="button" size="sm" variant="outline" className="h-auto min-h-8 py-1 text-left whitespace-normal" disabled={busy||disabled||!aiConnected||!hasSelection} onMouseDown={e=>e.preventDefault()} onClick={()=>{setInstruction(q);void run(q)}}>{q}</Button>)}</div>
    <Field><Label htmlFor="msfo-rewrite" className="sr-only">Ko‘rsatma</Label><Textarea id="msfo-rewrite" rows={2} maxLength={1000} placeholder="O‘z ko‘rsatmangiz: masalan, IFRS 16 bo‘yicha ijara izohini qo‘shing" value={instruction} onChange={e=>setInstruction(e.target.value)} disabled={busy||disabled||!aiConnected}/></Field>
    <Button size="sm" variant="secondary" className="self-start" disabled={busy||disabled||!aiConnected||!hasSelection} onMouseDown={e=>e.preventDefault()} onClick={()=>void run()}>{busy?<Spinner/>:<Icon name="wand"/>}{busy?'Yozilmoqda…':'Qayta yozish'}</Button>
   </>}
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </CardContent>
 </Card>;
}
