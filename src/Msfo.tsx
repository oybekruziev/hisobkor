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

type Meta={id:string;title:string;mode:'statements'|'text';language:string;companyId?:string|null;fileKey?:string|null;sourceName?:string;instruction?:string;createdAt:string;updatedAt:string;converted?:boolean;counts?:{conflict:number;warning:number;info:number;missing:number}};
type Content={version:1;html:string;sourceHtml:string;ai?:any};

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

export function MsfoPage({items,setItems,companies,route,go,aiConnected,aiLoading}:{items:Meta[];setItems:(fn:(all:Meta[])=>Meta[])=>void;companies:any[];route:string;go:(r:string)=>void;aiConnected:boolean;aiLoading:boolean}){
 const id=route.split('/')[1];
 const [creating,setCreating]=useState<null|{mode:'statements'|'text'}>(null);
 const item=id?items.find(x=>x.id===id):null;
 const mine=companies.filter(c=>!c.isDemo);
 const companyName=(cid?:string|null)=>mine.find(c=>c.id===cid)?.name;
 if(id&&item)return <MsfoWorkspace key={item.id} item={item} setItems={setItems} companyName={companyName(item.companyId)} go={go} aiConnected={aiConnected}/>;
 return <>
  <PageHeader title="MSFO hujjatlari" description="Word hujjatini xalqaro moliyaviy hisobot standartlari (MSFO / IFRS) shakliga AI yordamida o‘tkazing, redaktorda tekshirib tahrirlang va .docx qilib yuklab oling."
   actions={<Button onClick={()=>setCreating({mode:'statements'})}><Icon name="plus"/>Yangi hujjat</Button>}/>
  {id&&!item&&<Alert><Icon name="alert"/><AlertTitle>Hujjat topilmadi</AlertTitle><AlertDescription>U o‘chirilgan bo‘lishi mumkin. Ro‘yxatdan boshqasini tanlang.</AlertDescription></Alert>}
  {!aiLoading&&!aiConnected&&<Alert><Icon name="alert"/><AlertTitle>AI xizmati hozir ulanmagan</AlertTitle><AlertDescription>Hujjatni yuklab, redaktorda qo‘lda tahrirlash va .docx qilib saqlash ishlaydi. Avtomatik MSFOga o‘tkazish xizmat ulangach yoqiladi.</AlertDescription></Alert>}
  {items.length?<Card className="gap-0 py-0">
   <CardHeader className="border-b py-4"><CardTitle className="text-base">Hujjatlar</CardTitle><CardDescription>{items.length} ta hujjat · oxirgi o‘zgargani yuqorida</CardDescription></CardHeader>
   <ul role="list" className="divide-y">{[...items].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(x=>{const c=x.counts;return <li key={x.id}>
    <a href={`#msfo/${x.id}`} className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-6">
     <FileTile label="DOCX"/>
     <span className="grid min-w-0 flex-1 gap-0.5"><span className="truncate text-sm font-medium">{x.title}</span><span className="truncate text-sm text-muted-foreground">{msfoModes[x.mode]}{companyName(x.companyId)?` · ${companyName(x.companyId)}`:''} · {formatDate(x.updatedAt)}</span></span>
     <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">{!x.converted?<Badge variant="outline" className="text-muted-foreground">Qoralama</Badge>:<>
      {c?.conflict?<Badge variant="outline" className={toneBadge.conflict}>{c.conflict} ta ziddiyat</Badge>:null}
      {c?.missing?<Badge variant="outline" className={toneBadge.warning}>{c.missing} joyda ma’lumot kerak</Badge>:null}
      {!c?.conflict&&!c?.missing&&<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><Icon name="check"/>MSFOga o‘tkazilgan</Badge>}
     </>}</span>
     <Icon name="chevron" size={16} className="shrink-0 text-muted-foreground"/>
    </a></li>})}</ul>
  </Card>:<Card>
   <CardContent className="flex flex-col gap-8 py-4">
    <Empty className="border-0 p-0 md:p-0"><EmptyHeader><EmptyMedia variant="icon"><Icon name="msfo"/></EmptyMedia><EmptyTitle>Birinchi hujjatni MSFOga o‘tkazing</EmptyTitle><EmptyDescription>Word (.docx) faylni yuklang yoki matnni joylashtiring. AI uni MSFO tuzilishi va atamalariga moslab qayta yozadi, siz esa redaktorda tekshirib, tuzatasiz.</EmptyDescription></EmptyHeader></Empty>
    <div className="grid gap-3 md:grid-cols-2">
     {(['statements','text'] as const).map(mode=><button key={mode} type="button" onClick={()=>setCreating({mode})} className="group flex flex-col items-start gap-2 rounded-xl border bg-background p-5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={mode==='statements'?'table':'document'}/></span>
      <span className="font-medium">{msfoModes[mode]}</span>
      <span className="text-sm text-pretty text-muted-foreground">{mode==='statements'?'BHMS bo‘yicha balans, moliyaviy natijalar va pul oqimlari hisobotini MSFO shakllariga transformatsiya va tuzatishlar jadvali bilan.':'Hisob siyosati, izohlar, xat yoki reglamentni MSFO talablari va atamalariga moslab qayta yozish.'}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">Boshlash<Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-0.5"/></span>
     </button>)}
    </div>
    <ol role="list" className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-3">{[['Hujjatni bering','Word fayl, nusxa olingan matn yoki bo‘sh sahifa.'],['AI o‘tkazadi','MSFO shakli, qayta tasniflash va izohlar bilan qoralama.'],['Tekshiring va yuklab oling','Redaktorda tahrirlang, .docx sifatida saqlang.']].map(([t,d],i)=><li key={t} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">{i+1}</span><span><span className="block font-medium">{t}</span><span className="text-muted-foreground">{d}</span></span></li>)}</ol>
   </CardContent>
  </Card>}
  <p className="flex items-start gap-2 text-sm text-muted-foreground"><Icon name="shield" size={16} className="mt-0.5 shrink-0"/>AI natijasi — buxgalter tekshiradigan qoralama. Raqamlar o‘ylab topilmaydi: manbada yo‘q qiymatlar «[ma’lumot kerak: …]» deb belgilanadi.</p>
  <NewMsfoDialog open={!!creating} initialMode={creating?.mode||'statements'} companies={mine} aiConnected={aiConnected} onClose={()=>setCreating(null)} onCreate={async(meta,content,convert)=>{
   const fileKey=await saveContent(meta,content);const saved={...meta,fileKey};
   setItems(all=>[saved,...all]);setCreating(null);
   sessionStorageSafe.set(`msfo-autoconvert:${meta.id}`,convert?'1':'');
   go(`msfo/${meta.id}`);
  }}/>
 </>;
}

const sessionStorageSafe={get:(k:string)=>{try{return sessionStorage.getItem(k)}catch{return null}},set:(k:string,v:string)=>{try{v?sessionStorage.setItem(k,v):sessionStorage.removeItem(k)}catch{}}};

/* ------------------------------ New document ------------------------------ */

function NewMsfoDialog({open,initialMode,companies,aiConnected,onClose,onCreate}:{open:boolean;initialMode:'statements'|'text';companies:any[];aiConnected:boolean;onClose:()=>void;onCreate:(meta:Meta,content:Content,convert:boolean)=>Promise<void>}){
 const [mode,setMode]=useState(initialMode);
 const [source,setSource]=useState<'file'|'paste'|'blank'>('file');
 const [file,setFile]=useState<{name:string;html:string;stats:string}|null>(null);
 const [pasted,setPasted]=useState({text:'',html:''});
 const [title,setTitle]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [convert,setConvert]=useState(true);
 const [drag,setDrag]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open){setMode(initialMode);setSource('file');setFile(null);setPasted({text:'',html:''});setTitle('');setError('');setBusy(false);setConvert(true)}},[open,initialMode]);
 async function pick(f?:File|null){
  setError('');if(!f)return;
  if(/\.doc$/i.test(f.name)){setError('Eski .doc formati o‘qilmaydi. Faylni Word’da «Saqlash › .docx» qilib qayta saqlang.');return;}
  if(!/\.docx$/i.test(f.name)){setError('Word (.docx) fayl tanlang.');return;}
  if(f.size>15*1024*1024){setError('Fayl hajmi 15 MBdan oshmasin.');return;}
  try{
   const blocks=docxToBlocks(new Uint8Array(await f.arrayBuffer()));
   const tables=blocks.filter((b:any)=>b.type==='table').length;
   const chars=blocksText(blocks).length;
   setFile({name:f.name,html:blocksToHtml(blocks),stats:`${blocks.length} ta blok${tables?` · ${tables} ta jadval`:''} · ${chars.toLocaleString('ru-RU')} belgi`});
   if(!title)setTitle(f.name.replace(/\.docx$/i,''));
  }catch(e:any){setFile(null);setError(e.message||'Fayl o‘qilmadi.');}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');
  let html='';let sourceName='';
  if(source==='file'){if(!file){setError('Word faylni tanlang.');return;}html=file.html;sourceName=file.name;}
  if(source==='paste'){html=pasted.html?sanitizeHtml(pasted.html):textToHtml(pasted.text);if(!plainText(html)){setError('Matnni joylashtiring.');return;}}
  const name=title.trim()||(source==='file'?file!.name.replace(/\.docx$/i,''):msfoModes[mode]);
  const f=new FormData(e.currentTarget as HTMLFormElement);
  const meta=newMsfoItem({id:crypto.randomUUID(),title:name,mode,language:String(f.get('language')||'uz'),companyId:String(f.get('company')||'')||null,sourceName,instruction:String(f.get('instruction')||'').trim().slice(0,1000)} as any);
  setBusy(true);
  try{await onCreate(meta as Meta,{version:1,html:source==='blank'?'':html,sourceHtml:source==='blank'?'':html},convert&&aiConnected&&source!=='blank');}
  catch(e:any){setError(e.message||'Hujjat saqlanmadi.');setBusy(false);}
 }
 return <Dialog open={open} onOpenChange={v=>!v&&!busy&&onClose()}>
  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
   <DialogHeader><DialogTitle>Yangi MSFO hujjati</DialogTitle><DialogDescription>Hujjat turini va manbani tanlang. Keyin redaktorda ochiladi.</DialogDescription></DialogHeader>
   <form onSubmit={submit} noValidate><FieldGroup>
    <fieldset className="flex flex-col gap-3"><legend className="mb-3 text-sm font-medium">Hujjat turi</legend>
     <div className="grid gap-3 sm:grid-cols-2">{(['statements','text'] as const).map(m=><label key={m} className={cn('flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',mode===m?'border-primary bg-primary/5':'hover:bg-muted/50')}>
      <input type="radio" name="mode" value={m} checked={mode===m} onChange={()=>setMode(m)} className="mt-0.5 size-4 accent-[var(--primary)]"/>
      <span className="grid gap-1"><span className="text-sm font-medium">{msfoModes[m]}</span><span className="text-sm text-muted-foreground">{m==='statements'?'Balans, moliyaviy natijalar, pul oqimlari → MSFO shakllari':'Hisob siyosati, izohlar, xatlar → MSFO atamalari'}</span></span>
     </label>)}</div>
    </fieldset>
    <Field>
     <FieldLabel>Manba</FieldLabel>
     <Tabs value={source} onValueChange={v=>{setSource(v as any);setError('')}}>
      <TabsList className="w-full sm:w-fit"><TabsTrigger value="file"><Icon name="upload"/>Word fayl</TabsTrigger><TabsTrigger value="paste"><Icon name="copy"/>Matn</TabsTrigger><TabsTrigger value="blank"><Icon name="document"/>Bo‘sh</TabsTrigger></TabsList>
      <TabsContent value="file" className="pt-2">
       <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);pick(e.dataTransfer.files[0])}} className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors',drag?'border-primary bg-primary/5':'bg-muted/30')}>
        {file?<><FileTile label="DOCX"/><div><p className="text-sm font-medium [overflow-wrap:anywhere]">{file.name}</p><p className="text-sm text-muted-foreground">{file.stats}</p></div><Button type="button" variant="outline" size="sm" onClick={()=>input.current?.click()}>Boshqa fayl</Button></>
        :<><span className="flex size-10 items-center justify-center rounded-full bg-background ring-1 ring-border"><Icon name="upload"/></span><div><p className="text-sm font-medium">Word faylni shu yerga tashlang</p><p className="text-sm text-muted-foreground">.docx · 15 MBgacha · jadvallar va sarlavhalar saqlanadi</p></div><Button type="button" variant="outline" size="sm" onClick={()=>input.current?.click()}>Fayl tanlash</Button></>}
        <input ref={input} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" tabIndex={-1} aria-label="Word fayl" onChange={e=>{pick(e.target.files?.[0]);e.target.value=''}}/>
       </div>
      </TabsContent>
      <TabsContent value="paste" className="pt-2">
       <Textarea aria-label="Hujjat matni" rows={7} placeholder="Word yoki Excel’dan nusxa olib shu yerga joylashtiring (Ctrl+V). Jadvallar saqlanadi." value={pasted.text} onChange={e=>setPasted({text:e.target.value,html:''})} onPaste={e=>{const html=e.clipboardData.getData('text/html');const text=e.clipboardData.getData('text/plain');if(html){e.preventDefault();setPasted({text,html});}}}/>
       {pasted.html&&<FieldDescription className="mt-2">Formatlangan matn olindi: sarlavha va jadvallar redaktorda ko‘rinadi.</FieldDescription>}
      </TabsContent>
      <TabsContent value="blank" className="pt-2"><p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Bo‘sh sahifa ochiladi. Matnni o‘zingiz yozasiz yoki joylashtirasiz, keyin «MSFOga o‘tkazish» tugmasini bosasiz.</p></TabsContent>
     </Tabs>
    </Field>
    <div className="grid gap-4 sm:grid-cols-2">
     <Field className="sm:col-span-2"><FieldLabel htmlFor="msfo-title">Hujjat nomi</FieldLabel><Input id="msfo-title" value={title} maxLength={240} placeholder={source==='file'?'Fayl nomidan olinadi':'Masalan, 2025 yil moliyaviy hisoboti'} onChange={e=>setTitle(e.target.value)}/></Field>
     <Field><FieldLabel htmlFor="msfo-company">Kompaniya <span className="font-normal text-muted-foreground">Ixtiyoriy</span></FieldLabel><NativeSelect id="msfo-company" name="company" className="w-full" defaultValue=""><NativeSelectOption value="">Tanlanmagan</NativeSelectOption>{companies.map(c=><NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}</NativeSelect></Field>
     <Field><FieldLabel htmlFor="msfo-language">Natija tili</FieldLabel><NativeSelect id="msfo-language" name="language" className="w-full" defaultValue="uz">{Object.entries(msfoLanguages).map(([v,l])=><NativeSelectOption key={v} value={v}>{l as string}</NativeSelectOption>)}</NativeSelect></Field>
     <Field className="sm:col-span-2"><FieldLabel htmlFor="msfo-instruction">AI uchun qo‘shimcha ko‘rsatma <span className="font-normal text-muted-foreground">Ixtiyoriy</span></FieldLabel><Input id="msfo-instruction" name="instruction" maxLength={1000} placeholder="Masalan: hisobot davri 2025 yil, taqqoslama 2024 yil; valyuta ming so‘m"/></Field>
    </div>
    {source!=='blank'&&<div className="flex items-start gap-3"><Checkbox id="msfo-convert" className="mt-0.5" checked={convert&&aiConnected} disabled={!aiConnected} onCheckedChange={v=>setConvert(v===true)}/><Label htmlFor="msfo-convert" className="leading-snug font-normal">Ochilgach darhol AI bilan MSFOga o‘tkazish{!aiConnected&&<span className="text-muted-foreground"> — AI ulanmagan</span>}</Label></div>}
    {error&&<FieldError role="alert">{error}</FieldError>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Bekor qilish</Button><Button type="submit" disabled={busy}>{busy?<Spinner/>:<Icon name="arrow"/>}Redaktorda ochish</Button></DialogFooter>
   </FieldGroup></form>
  </DialogContent>
 </Dialog>;
}

/* ------------------------------ Workspace (editor + AI panel) ------------------------------ */

function MsfoWorkspace({item,setItems,companyName,go,aiConnected}:{item:Meta;setItems:(fn:(all:Meta[])=>Meta[])=>void;companyName?:string;go:(r:string)=>void;aiConnected:boolean}){
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

 async function convert(){
  setConfirmConvert(false);
  const html=editor.current?.getHtml()||content?.html||'';
  const source=plainText(html)?html:content?.sourceHtml||'';
  if(!plainText(source)){setAiError('Avval hujjatga matn kiriting yoki joylashtiring.');return;}
  setAiError('');setConverting(true);
  try{
   const result=await callMsfo({action:'convert',mode:item.mode,language:item.language,title:item.title,instruction:item.instruction||'',source});
   const previous=html;
   const clean=sanitizeHtml(result.documentHtml);
   editor.current?.setHtml(clean);
   const next:Content={version:1,html:clean,sourceHtml:content?.sourceHtml||source,ai:{summary:result.summary,changes:result.changes,limitations:result.limitations,model:result.model,createdAt:result.createdAt}};
   contentRef.current=next;setContent(next);setTab('msfo');
   setItems(all=>all.map(x=>x.id===item.id?{...x,converted:true}:x));
   await save();countMissing();
   toast.success('Hujjat MSFO shakliga o‘tkazildi. Izohlarni tekshiring.',{action:{label:'Bekor qilish',onClick:()=>{editor.current?.setHtml(previous);changed()}}});
  }catch(e:any){setAiError(e.message||'AI so‘rovi bajarilmadi.')}
  finally{setConverting(false)}
 }
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
    <TabsList aria-label="Ko‘rinish"><TabsTrigger value="msfo"><Icon name="msfo"/>MSFO hujjati</TabsTrigger><TabsTrigger value="source" disabled={!content?.sourceHtml}><Icon name="document"/>Asl hujjat</TabsTrigger></TabsList>
    <TabsContent value="msfo" forceMount className="relative min-w-0 data-[state=inactive]:hidden">
     {content?<DocumentEditor key={editorKey} ref={editor} label={`${item.title} — MSFO hujjati`} initialHtml={content.html} onChange={changed} onSelection={setHasSelection}/>
      :<div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"><Spinner className="mr-2"/>Hujjat ochilmoqda…</div>}
     {converting&&<div role="status" aria-live="polite" className="absolute inset-0 z-20 flex items-start justify-center rounded-lg bg-background/80 pt-32 backdrop-blur-[2px]">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border bg-background p-6 text-center shadow-lg"><Spinner className="size-6 text-primary"/><p className="font-medium">AI hujjatni MSFOga o‘tkazmoqda</p><p className="text-sm text-muted-foreground">Katta hisobotlar uchun 1–3 daqiqa ketadi. Sahifani yopmang — natija shu yerda paydo bo‘ladi.</p></div>
     </div>}
    </TabsContent>
    <TabsContent value="source" className="min-w-0">
     <p className="mb-3 text-sm text-muted-foreground">Yuklangan asl hujjat{item.sourceName?` · ${item.sourceName}`:''}. Faqat ko‘rish uchun — tahrir MSFO hujjatida qilinadi.</p>
     <div className="overflow-x-auto rounded-lg border bg-muted/50 py-4 sm:p-8"><article aria-label="Asl hujjat" className={pageClass} dangerouslySetInnerHTML={{__html:sanitizeHtml(content?.sourceHtml||'')}}/></div>
    </TabsContent>
   </Tabs>

   <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4" aria-label="AI yordamchi">
    <Card className="gap-4 py-4">
     <CardHeader className="px-4"><CardTitle className="flex items-center gap-2 text-base"><Icon name="spark" className="text-primary"/>AI xulosasi</CardTitle>
      {ai&&<CardDescription>{formatDate(ai.createdAt)} · {ai.changes?.length||0} ta izoh</CardDescription>}</CardHeader>
     <CardContent className="flex flex-col gap-3 px-4">
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

  <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hujjat qayta o‘tkazilsinmi?</AlertDialogTitle><AlertDialogDescription>AI redaktordagi joriy matnni qaytadan MSFO shakliga o‘tkazadi va natija bilan almashtiradi. Keyin «Bekor qilish» orqali oldingi holatga qaytishingiz mumkin.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={convert}><Icon name="spark"/>Qayta o‘tkazish</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
