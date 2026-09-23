import {Brand} from './components/Brand';
import {SearchField} from './components/SearchField';
import {PageHeader} from './components/PageHeader';
import {ToggleGroup,ToggleGroupItem} from './components/ui/toggle-group';
import {NativeSelectOption,NativeSelect} from './components/ui/native-select';
import {TableCell,TableBody,TableHead,TableRow,TableHeader,TableCaption,Table} from './components/ui/table';
import {Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbLink,BreadcrumbPage,BreadcrumbSeparator} from './components/ui/breadcrumb';
import {Textarea} from './components/ui/textarea';
import {Badge as UiBadge} from './components/ui/badge';
import {Card,CardHeader,CardTitle,CardDescription,CardAction,CardContent,CardFooter} from './components/ui/card';
import {Alert,AlertTitle,AlertDescription} from './components/ui/alert';
import {Label} from './components/ui/label';
import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Dialog,DialogContent,DialogHeader,DialogFooter,DialogTitle,DialogDescription} from './components/ui/dialog';
import * as Dropdown from './components/ui/dropdown-menu';
import {SidebarProvider,Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupLabel,SidebarGroupContent,SidebarInset,SidebarMenu,SidebarMenuItem,SidebarMenuButton,SidebarTrigger,useSidebar} from './components/ui/sidebar';
import {Avatar,AvatarFallback} from './components/ui/avatar';
import {Checkbox} from './components/ui/checkbox';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import {Empty as EmptyRoot,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription,EmptyContent} from './components/ui/empty';
import {Toaster} from './components/ui/sonner';
import {toast as notify} from 'sonner';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {Field,FieldGroup,FieldLabel,FieldDescription,FieldError} from './components/ui/field';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './components/ui/alert-dialog';
import {Spinner} from './components/ui/spinner';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from './components/ui/tooltip';
import {Separator} from './components/ui/separator';
import {StatusBadge} from './components/app/StatusBadge';
import {InitialsTile,FileTile} from './components/app/Tiles';
import {WorkspaceHome} from './Dashboard';
import {Icon} from './Icon';
import {cn} from './lib/utils';
import {saveState,putFile,getFile,hasPendingWrites} from './storage';
import {summarize,statuses,csvCell,validateFile,transition,periodBlockers} from './domain.mjs';
import {useAI,recoverAnalysis,AIReview,AIBadge} from './ai';
import {formatPeriod as month,currentPeriod,documentName,companyTitle,formatDate} from './format.mjs';
import {PeriodPicker} from './components/app/PeriodPicker';
import {BottomNav} from './components/app/BottomNav';
import {Runtime,ErrorBoundary} from './Runtime';
import {BackupPanel} from './BackupPanel';
import {CompanyOverview} from './CompanyOverview';
import {AIOverlay} from './AIOverlay';
import {MsfoPage} from './Msfo';
import {appRoute} from './company-overview.mjs';
import {eligible} from './ai-domain.mjs';
import {migrateWorkspace,companyHistory,profileError,companyRequirements} from './workspace.mjs';

/** Routes. "archive" (permanent documents) is a view of the Hujjatlar section, not a section of its own. */
const tabs=[['overview','Umumiy ko‘rinish','chart','Umumiy'],['documents','Hujjatlar','document','Hujjatlar'],['history','Tarix','clock','Tarix'],['archive','Doimiy hujjatlar','folder','Doimiy'],['info','Ma’lumotlar','company','Ma’lumot']];
const sections=tabs.filter(t=>t[0]!=='archive');
const sectionOf=(tab:string)=>tab==='archive'?'documents':tab;

const initials=(name:string)=>name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const Badge=StatusBadge;
/** Icon-only controls always carry both a tooltip and an accessible name. */
function IconAction({label,onClick,icon,disabled,className}:any){return <Tooltip><TooltipTrigger asChild><Button data-slot="button" variant="outline" size="icon" className={className} disabled={disabled} aria-label={label} onClick={onClick}><Icon name={icon}/></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>}
function Confirm({open,onOpenChange,title,description,confirm,onConfirm,icon}:any){return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{icon&&<Icon name={icon}/>}{confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
function Empty({title,text,action,icon='folder'}:any){return <EmptyRoot><EmptyHeader><EmptyMedia variant="icon"><Icon name={icon}/></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{text}</EmptyDescription></EmptyHeader>{action&&<EmptyContent>{action}</EmptyContent>}</EmptyRoot>}
/** Stock shadcn Dialog; focus returns to whatever opened it. */
function Modal({open,onClose,title,description,children,wide=false}:any){const trigger=useRef<HTMLElement|null>(null);return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent onOpenAutoFocus={()=>{trigger.current=document.activeElement as HTMLElement}} onCloseAutoFocus={e=>{if(trigger.current?.isConnected){e.preventDefault();trigger.current.focus()}}} className={cn('max-h-[calc(100dvh-2rem)] overflow-y-auto',wide?'sm:max-w-6xl':'sm:max-w-lg')}><DialogHeader><DialogTitle className="pr-6 [overflow-wrap:anywhere]">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>}
const Optional=()=><span className="font-normal text-muted-foreground">Ixtiyoriy</span>;

function App({saved,session,logout}:any){
 const [initial]=useState(()=>migrateWorkspace(saved));
 const [companies,setCompanies]=useState<any[]>(initial.companies);
 const [docs,setDocs]=useState<any[]>(()=>initial.docs.map(recoverAnalysis));
 const [activity,setActivity]=useState<any[]>(initial.activity);
 const [profile,setProfile]=useState<any>(initial.profile);
 const [closed,setClosed]=useState<string[]>(initial.closed);
 const [msfo,setMsfo]=useState<any[]>(()=>Array.isArray(initial.msfo)?initial.msfo:[]);
 const [route,setRoute]=useState(()=>appRoute(location.hash.slice(1),initial.companies));
 const [period,setPeriod]=useState(currentPeriod());
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [modal,setModal]=useState<any>(null);
 const [error,setError]=useState('');
 const setToast=(message:string)=>notify.success(message);
 const [busy,setBusy]=useState(false);
 const [preview,setPreview]=useState('');
 const [fileError,setFileError]=useState('');
 const {openMobile:mobileMenu,setOpenMobile:setMobileMenu}=useSidebar();
 const [showExamples,setShowExamples]=useState(false);
 const [savedError,setSavedError]=useState('');
 const [saveStatus,setSaveStatus]=useState('saved');
 const [showSampleDocs,setShowSampleDocs]=useState(false);
 const [page,setPage]=useState(1);
 const pendingSave=useRef(false);
 const nextFilter=useRef<string|null>(null);
 const [aiAuto,setAiAuto]=useState(initial.aiAuto!==false);
 const [aiOpen,setAiOpen]=useState(false);
 useEffect(()=>{const update=()=>{setRoute(appRoute(location.hash.slice(1),companies));setQuery('');setFilter(nextFilter.current||'all');nextFilter.current=null;setMobileMenu(false)};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[companies]);
 const workspaceState={...initial,companies,docs,activity,closed,profile,aiAuto,msfo,workspace:profile?.workspace||initial.workspace};
 useEffect(()=>{let current=true;pendingSave.current=true;setSaveStatus('saving');const t=setTimeout(()=>{saveState(workspaceState).then(()=>{if(current){pendingSave.current=false;setSavedError('');setSaveStatus('saved')}}).catch(e=>{if(current){setSavedError(e.message||'Ma’lumotlar saqlanmadi.');setSaveStatus('error')}})},200);return()=>{current=false;clearTimeout(t)}},[companies,docs,activity,closed,profile,aiAuto,msfo]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(pendingSave.current||hasPendingWrites()){e.preventDefault();e.returnValue=''}};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn)},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const parts=route.split('/');
 const company=parts[0]==='company'?companies.find(c=>c.id===parts[1]):null;
 const isMsfo=parts[0]==='msfo';
 const msfoItem=isMsfo&&parts[1]?msfo.find(x=>x.id===parts[1]):null;
 const tab=tabs.some(t=>t[0]===parts[2])?parts[2]:'overview';
 useEffect(()=>setPage(1),[query,filter,period,company?.id,tab,showSampleDocs]);
 const mine=companies.filter(c=>!c.isDemo);
 const examples=companies.filter(c=>c.isDemo);
 const go=(r:string)=>{location.hash=r;setQuery('');setFilter(nextFilter.current||'all');setMobileMenu(false)};
 const open=(value:any)=>{setMobileMenu(false);setModal(value);setError('');setFileError('');setPreview('')};
 const event=(title:string,c:any,detail:string,type='document')=>setActivity(a=>[{id:crypto.randomUUID(),title,companyId:c.id,detail:`${c.name} · ${detail}`,type,at:new Date().toISOString(),time:new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}),actor:profile?.fullName||'Buxgalter'},...a]);
 const ai=useAI({docs,setDocs,companies,onEvent:event,auto:aiAuto,enabled:!!profile,canAnalyze:()=>saveStatus==='saved'&&!pendingSave.current&&!hasPendingWrites()});
 const activeDoc=modal?.doc?(docs.find(d=>d.id===modal.doc.id)||modal.doc):null;
 const reopen=(id:string)=>setClosed(a=>a.filter(x=>x!==`${id}:${period}`));
 const current=company?companyRequirements(docs,company.id,period).filter(d=>showSampleDocs||!d.demo):[];
 const stats=summarize(current);
 const documentList=company?(tab==='archive'?docs.filter(d=>d.company===company.id&&d.scope==='permanent'&&(showSampleDocs||!d.demo)):current):[];
 const visible=documentList.filter(d=>(filter==='all'||(filter==='outstanding'?['missing','correction_requested'].includes(d.status):d.status===filter))&&`${d.title} ${d.fileName}`.toLowerCase().includes(query.toLowerCase()));
 function saveProfile(e:any){e.preventDefault();const f=new FormData(e.currentTarget);const value={fullName:String(f.get('fullName')).trim(),phone:String(f.get('phone')).trim(),email:String(f.get('email')||'').trim(),workspace:String(f.get('workspace')||'').trim()};const message=profileError(value);if(message){setError(message);return;}setProfile(value);setError('');setModal(null);go('dashboard');setToast('Profil saqlandi. Endi kompaniyalaringiz bilan ishlashingiz mumkin.');}
 function ProfileForm({editing=false}:any){const errorId=error?'profile-error':undefined;const bad=!!error;return <form onSubmit={saveProfile} noValidate aria-describedby={errorId}><FieldGroup><Field data-invalid={bad||undefined}><FieldLabel htmlFor="profile-name">Ism va familiya</FieldLabel><Input id="profile-name" name="fullName" autoComplete="name" required maxLength={100} placeholder="Ism va familiyangiz" defaultValue={profile?.fullName||''} aria-invalid={bad||undefined} aria-describedby={errorId}/><FieldDescription>Hujjat qarorlarida va tarixda shu ism ko‘rinadi.</FieldDescription></Field><Field data-invalid={bad||undefined}><FieldLabel htmlFor="profile-phone">Telefon raqami</FieldLabel><Input id="profile-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="+998 90 123 45 67" defaultValue={profile?.phone||''} aria-invalid={bad||undefined} aria-describedby={errorId}/></Field><Field><FieldLabel htmlFor="profile-email">Elektron pochta <span className="font-normal text-muted-foreground">Ixtiyoriy</span></FieldLabel><Input id="profile-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="siz@pochta.uz" defaultValue={profile?.email||''}/></Field><Field><FieldLabel htmlFor="profile-workspace">Buxgalteriya xizmatingiz nomi <span className="font-normal text-muted-foreground">Ixtiyoriy</span></FieldLabel><Input id="profile-workspace" name="workspace" maxLength={80} placeholder="Masalan, Hisob Servis" defaultValue={profile?.workspace||''}/><FieldDescription>Yon panelda ismingiz ostida ko‘rinadi.</FieldDescription></Field>{error&&<FieldError id="profile-error">{error}</FieldError>}<Button type="submit" className="w-full">{editing?'Saqlash':'Davom etish'}<Icon name="arrow"/></Button></FieldGroup><p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><Icon name="shield" size={16} className="mt-0.5 shrink-0"/>{session.storage==='server'?'Ma’lumotlar serverdagi ish joyingizda saqlanadi.':'Ma’lumotlar shu brauzerda saqlanadi.'}</p></form>}
 function addCompany(e:any){e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();const stir=String(f.get('stir')||'').trim();if(!name){setError('Kompaniya nomini kiriting.');return;}if(stir&&!/^\d{9}$/.test(stir)){setError(stirError);return;}if(stir&&companies.some(c=>c.stir===stir)){setError('Bu STIR bilan kompaniya avval qo‘shilgan.');return;}const c={id:crypto.randomUUID(),name,stir,legal:String(f.get('legal')),contact:String(f.get('contact')||'').trim(),phone:String(f.get('phone')||'').trim(),owner:profile.fullName,isDemo:false,createdAt:new Date().toISOString()};setCompanies(a=>[...a,c]);event('Kompaniya qo‘shildi',c,profile.fullName,'company');setModal(null);go(`company/${c.id}/overview`);setToast('Kompaniya qo‘shildi. Birinchi hujjatni yuklashingiz mumkin.');}
 const pageSize=15;const totalPages=Math.max(1,Math.ceil(visible.length/pageSize));const safePage=Math.min(page,totalPages);const pageDocs=visible.slice((safePage-1)*pageSize,safePage*pageSize);
 const aiPending=company?docs.filter(d=>d.company===company.id&&eligible(d)&&['queued','processing'].includes(d.ai?.status)).length:0;
 async function restoreWorkspace(value:any){await saveState(value);location.reload()}
 async function retrySave(){setSaveStatus('saving');try{await saveState(workspaceState);pendingSave.current=false;setSavedError('');setSaveStatus('saved')}catch(e:any){setSavedError(e.message);setSaveStatus('error')}}
 async function signOut(){try{await saveState(workspaceState);pendingSave.current=false;await logout()}catch(e:any){setSavedError(e.message)}}
 /** Opens a document from the home screen: the company's documents section first, then the review dialog. */
 function reviewDocument(d:any){if(!company||company.id!==d.company)go(`company/${d.company}/${d.scope==='permanent'?'archive':'documents'}`);void showDocument(d);}
 async function showDocument(d:any){if(d.status==='missing'){open({type:'upload',target:d});return;}open({type:'document',doc:d});if(!d.demo){try{const file=await getFile(d.fileKey||d.id,d.fileName);if(!file)throw Error();if(/\.(pdf|png|jpe?g)$/i.test(file.name))setPreview(URL.createObjectURL(file))}catch{setFileError('Asl fayl topilmadi. Uni qayta yuklashingiz mumkin.')}}}
 async function upload(e:any,files:File[]){e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);if(!files.length){setError('Yuklash uchun fayl tanlang.');return;}if(files.length>(modal.target?1:20)){setError(modal.target?'Ushbu talab uchun bitta fayl tanlang.':'Bir martada 20 tagacha fayl yuklang.');return;}for(const file of files){const msg=validateFile(file);if(msg){setError(`${file.name}: ${msg}`);return;}}const owner=(modal.pick?companies.find(c=>c.id===String(f.get('company'))):null)||company;if(!owner){setError('Avval kompaniyani tanlang.');return;}setBusy(true);try{const items:any[]=[];for(const file of files){const old=modal.target;const fileKey=crypto.randomUUID();await putFile(fileKey,file);items.push({id:old?.id||crypto.randomUUID(),fileKey,versions:old?[...(old.versions||[]),{fileKey:old.fileKey||old.id,fileName:old.fileName,status:old.status}]:[],company:owner.id,title:old?.title||String(f.get('title')||'').trim()||file.name,fileName:file.name,status:'review_required',scope:old?.scope||String(f.get('scope')||'periodic'),period,date:new Date().toISOString().slice(0,10),size:file.size<1048576?Math.max(1,Math.round(file.size/1024))+' KB':(file.size/1048576).toFixed(1)+' MB',demo:false});}setDocs(all=>[...all.filter(d=>!items.some(x=>x.id===d.id)),...items]);setCompanies(all=>all.map(c=>c.id===owner.id?{...c,isDemo:false}:c));reopen(owner.id);event('Hujjat yuklandi',owner,files.map(x=>x.name).join(', '),'upload');setModal(null);if(!company)go(`company/${owner.id}/documents`);setToast(`${files.length} ta fayl saqlandi.${ai.connection.connected&&aiAuto?' Avtomatik tekshiruv fonda boshlanadi.':''}`);}catch{setError('Saqlash amalga oshmadi. Ulanishni va bo‘sh xotirani tekshiring.');}finally{setBusy(false)}}
 function decide(status:string,reason=''){try{const d=activeDoc;const owner=companies.find(c=>c.id===d.company)||company;const next={...transition(d,status,reason),reviewer:profile.fullName};setDocs(all=>all.map(x=>x.id===d.id?{...next,ai:x.ai}:x));event(status==='accepted'?'Hujjat qabul qilindi':'Tuzatish so‘raldi',owner,`${d.title}${reason?' · '+reason:''}`,status==='accepted'?'check':'request');setModal(null);setToast('Qaror kompaniya tarixida saqlandi.');}catch(e:any){setError(e.message)}}
 async function download(d:any){try{const file=await getFile(d.fileKey||d.id,d.fileName);if(!file)throw Error();const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=d.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setFileError('Asl fayl topilmadi.')}}
 function exportCSV(){const lines=[['Kompaniya','Hujjat','Davr','Holat'],...documentList.map(d=>[company.name,d.title,d.scope==='permanent'?'Doimiy':d.period,statuses[d.status]])];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${company.name}-${period}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Hujjatlar reyestri yuklab olindi.');}
 const shared=<>{savedError&&<Alert variant="destructive" role="alert" className="fixed bottom-20 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 shadow-lg"><Icon name="alert"/><AlertTitle>{savedError}</AlertTitle><AlertDescription><div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="outline" onClick={retrySave}>Qayta saqlash</Button><Button size="sm" variant="ghost" onClick={()=>open({type:'backup'})}>Zaxira olish</Button></div></AlertDescription></Alert>}<Toaster theme="light" position="bottom-left" closeButton toastOptions={{duration:4500}}/></>;
 if(!profile)return <div className="isolate flex min-h-svh w-full flex-col bg-muted/40 antialiased">
  <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3 lg:px-8"><Brand href="#dashboard"/><Button variant="outline" size="sm" onClick={()=>open({type:'backup'})}><Icon name="upload"/>Zaxiradan tiklash</Button></header>
  <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
   <section className="flex flex-col gap-6">
    <div className="flex flex-col gap-3"><p className="text-sm font-medium text-primary">Ishni boshlash</p><h1 className="text-3xl font-semibold tracking-tight text-balance">Barcha kompaniyalaringiz. Bitta tartibli ish joyi.</h1><p className="text-pretty text-muted-foreground">Hujjatlarni yig‘ing, tekshiring va har bir kompaniya bo‘yicha tarixni saqlang.</p></div>
    <ol role="list" className="flex flex-col gap-4">{[['O‘zingizni tanishtiring','Buxgalter ma’lumotlarini kiriting'],['Kompaniya qo‘shing','Xizmat ko‘rsatadigan tashkilotingiz'],['Hujjatlar bilan ishlang','Yuklang, tekshiring va tarixni kuzating']].map(([title,text],i)=><li key={title} className="flex gap-3" aria-current={i===0?'step':undefined}><span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums',i===0?'border-primary bg-primary text-primary-foreground':'bg-background text-muted-foreground')}>{i+1}</span><div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div></li>)}</ol>
    <p className="flex items-start gap-2 text-sm text-muted-foreground"><Icon name="folder" size={16} className="mt-0.5 shrink-0"/>Hujjatlar har bir kompaniyada alohida saqlanadi.</p>
   </section>
   <Card><CardHeader><CardDescription>1 / 3 · Buxgalter profili</CardDescription><CardTitle className="text-xl">Avval siz bilan tanishamiz</CardTitle><CardDescription>Hujjatlardagi qarorlar va tarixda ismingiz ko‘rinadi. Keyingi qadam — birinchi kompaniyani qo‘shish.</CardDescription></CardHeader><CardContent>{ProfileForm({})}</CardContent></Card>
  </main>
  <footer className="border-t bg-background px-4 py-4 text-sm text-muted-foreground lg:px-8">Hisobkor.uz · Buxgalterning kundalik ish joyi</footer>
  <Modal open={modal?.type==='backup'} onClose={()=>setModal(null)} title="Zaxira nusxalari" description="Ish joyingizni saqlash va ko‘chirish."><BackupPanel state={workspaceState} onRestore={restoreWorkspace}/></Modal>
  {shared}
 </div>;

 const section=sectionOf(tab);
 const closedNow=!!company&&closed.includes(`${company.id}:${period}`);
 const permanentCount=company?docs.filter(d=>d.company===company.id&&d.scope==='permanent'&&(showSampleDocs||!d.demo)).length:0;
 const history=company?companyHistory(activity,company):[];
 const chips=[['all','Jami',documentList.length],...['review_required','correction_requested','missing','accepted'].map(key=>[key,(statuses as any)[key],documentList.filter(d=>d.status===key).length]).filter(x=>(x[2] as number)>0)];
 const historyTone:any={check:'border-emerald-200 bg-emerald-50 text-emerald-700',request:'border-amber-200 bg-amber-50 text-amber-700',alert:'border-red-200 bg-red-50 text-red-700',spark:'border-blue-200 bg-blue-50 text-blue-700'};

 return <>
  <a className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Asosiy mazmunga o‘tish</a>

  <Sidebar variant="inset" collapsible="offcanvas"><div role="navigation" aria-label="Asosiy menyu" className="contents">
   <SidebarHeader>
    <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild><a href="#dashboard" aria-label="Hisobkor.uz bosh sahifasi"><img src="/brand-h.png" width="28" height="28" alt="" className="size-7 shrink-0 object-contain"/><span className="text-base font-semibold tracking-tight">hisobkor<span className="font-normal text-muted-foreground">.uz</span></span></a></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
   </SidebarHeader>
   <SidebarContent>
    <SidebarGroup><SidebarGroupContent><SidebarMenu aria-label="Asosiy">
     <SidebarMenuItem><SidebarMenuButton isActive={!company&&!isMsfo} aria-current={company||isMsfo?undefined:'page'} onClick={()=>go('dashboard')}><Icon name="dashboard"/><span>Bosh sahifa</span></SidebarMenuButton></SidebarMenuItem>
     <SidebarMenuItem><SidebarMenuButton isActive={isMsfo} aria-current={isMsfo?'page':undefined} onClick={()=>go('msfo')}><Icon name="msfo"/><span>MSFO hujjatlari</span></SidebarMenuButton></SidebarMenuItem>
    </SidebarMenu></SidebarGroupContent></SidebarGroup>

    <SidebarGroup>
     <SidebarGroupLabel>Kompaniya</SidebarGroupLabel>
     <SidebarGroupContent className="flex flex-col gap-2">
      <SidebarMenu><SidebarMenuItem>
       <Dropdown.DropdownMenu modal={false}>
        <Dropdown.DropdownMenuTrigger asChild>
         <SidebarMenuButton size="lg" className="border bg-background shadow-xs data-[state=open]:bg-sidebar-accent" aria-label={company?`Kompaniyani almashtirish: ${company.name}`:'Kompaniya tanlash'}>
          {company?<InitialsTile name={company.name} size="sm"/>:<span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon name="company"/></span>}
          <span className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{company?.name||'Kompaniya tanlash'}</span><span className="truncate text-xs text-muted-foreground tabular-nums">{company?(company.stir?`STIR ${company.stir}`:(company.legal||'MChJ')):`${mine.length} ta kompaniya`}</span></span>
          <Icon name="switch" className="ml-auto text-muted-foreground"/>
         </SidebarMenuButton>
        </Dropdown.DropdownMenuTrigger>
        <Dropdown.DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg" align="start" sideOffset={4} collisionPadding={12} onCloseAutoFocus={e=>{if(modal)e.preventDefault()}}>
         <Dropdown.DropdownMenuLabel className="text-xs text-muted-foreground">Kompaniyalar</Dropdown.DropdownMenuLabel>
         <div className="max-h-72 overflow-y-auto">
          {(company?.isDemo?[...mine,company]:mine).map(c=><Dropdown.DropdownMenuItem key={c.id} className="gap-2 p-2" onSelect={()=>go(`company/${c.id}/overview`)}>
           <InitialsTile name={c.name} size="sm" className="size-7 rounded-md"/>
           <span className="grid flex-1 leading-tight"><span className="truncate">{c.name}</span><span className="truncate text-xs text-muted-foreground tabular-nums">{c.isDemo?'Namuna kompaniya':c.stir?`STIR ${c.stir}`:(c.legal||'Kompaniya')}</span></span>
           {company?.id===c.id&&<Icon name="check" className="text-primary"/>}
          </Dropdown.DropdownMenuItem>)}
          {!mine.length&&!company&&<p className="px-2 py-3 text-sm text-muted-foreground">Hali kompaniya qo‘shilmagan</p>}
         </div>
         <Dropdown.DropdownMenuSeparator/>
         <Dropdown.DropdownMenuItem className="gap-2 p-2" onSelect={()=>open({type:'company'})}><span className="flex size-7 items-center justify-center rounded-md border bg-transparent"><Icon name="plus"/></span><span className="font-medium text-muted-foreground">Kompaniya qo‘shish</span></Dropdown.DropdownMenuItem>
        </Dropdown.DropdownMenuContent>
       </Dropdown.DropdownMenu>
      </SidebarMenuItem></SidebarMenu>
      {company&&<SidebarMenu aria-label="Kompaniya bo‘limlari">{sections.map(([id,label,icon])=><SidebarMenuItem key={id}><SidebarMenuButton isActive={section===id} aria-current={section===id?'page':undefined} onClick={()=>go(`company/${company.id}/${id}`)}><Icon name={icon}/><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>}
     </SidebarGroupContent>
    </SidebarGroup>

    <SidebarGroup className="mt-auto"><SidebarGroupContent><SidebarMenu aria-label="Qo‘shimcha">
     <SidebarMenuItem><SidebarMenuButton onClick={()=>open({type:'backup'})}><Icon name="download"/><span>Zaxira nusxalari</span></SidebarMenuButton></SidebarMenuItem>
     <SidebarMenuItem><SidebarMenuButton onClick={()=>open({type:'help'})}><Icon name="help"/><span>Yordam</span></SidebarMenuButton></SidebarMenuItem>
    </SidebarMenu></SidebarGroupContent></SidebarGroup>
   </SidebarContent>
   <SidebarFooter>
    <SidebarMenu><SidebarMenuItem>
     <Dropdown.DropdownMenu modal={false}>
      <Dropdown.DropdownMenuTrigger asChild>
       <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label="Hisob menyusi">
        <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg text-xs font-medium">{initials(profile.fullName)}</AvatarFallback></Avatar>
        <span className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{profile.fullName}</span><span className="truncate text-xs text-muted-foreground">{profile.workspace||'Buxgalter'}</span></span>
        <Icon name="switch" className="ml-auto text-muted-foreground"/>
       </SidebarMenuButton>
      </Dropdown.DropdownMenuTrigger>
      <Dropdown.DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side="top" align="start" sideOffset={4} collisionPadding={12} onCloseAutoFocus={e=>{if(modal)e.preventDefault()}}>
       <Dropdown.DropdownMenuLabel className="p-0 font-normal"><span className="flex items-center gap-2 px-1 py-1.5 text-left text-sm"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg text-xs font-medium">{initials(profile.fullName)}</AvatarFallback></Avatar><span className="grid flex-1 leading-tight"><span className="truncate font-medium">{profile.fullName}</span><span className="truncate text-xs text-muted-foreground">{profile.phone}</span></span></span></Dropdown.DropdownMenuLabel>
       <Dropdown.DropdownMenuSeparator/>
       <Dropdown.DropdownMenuItem onSelect={()=>open({type:'profile'})}><Icon name="settings"/>Profilni tahrirlash</Dropdown.DropdownMenuItem>
       {session.mode==='production'&&<><Dropdown.DropdownMenuSeparator/><Dropdown.DropdownMenuItem onSelect={()=>open({type:'logout'})}><Icon name="logout"/>Chiqish</Dropdown.DropdownMenuItem></>}
      </Dropdown.DropdownMenuContent>
     </Dropdown.DropdownMenu>
    </SidebarMenuItem></SidebarMenu>
   </SidebarFooter>
  </div></Sidebar>

  <SidebarInset className="min-w-0">
   <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
    <Tooltip><TooltipTrigger asChild><SidebarTrigger data-slot="sidebar-trigger" className="-ml-1" aria-label="Menyu"/></TooltipTrigger><TooltipContent>Menyu</TooltipContent></Tooltip>
    <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4"/>
    <Breadcrumb className="min-w-0" aria-label="Sahifa yo‘li"><BreadcrumbList className="flex-nowrap">
     <BreadcrumbItem className={company||isMsfo?'max-sm:hidden':''}>{company||isMsfo?<BreadcrumbLink href="#dashboard">Bosh sahifa</BreadcrumbLink>:<BreadcrumbPage>Bosh sahifa</BreadcrumbPage>}</BreadcrumbItem>
     {isMsfo&&<><BreadcrumbSeparator className="max-sm:hidden"/><BreadcrumbItem className="min-w-0">{msfoItem?<BreadcrumbLink href="#msfo">MSFO hujjatlari</BreadcrumbLink>:<BreadcrumbPage>MSFO hujjatlari</BreadcrumbPage>}</BreadcrumbItem>{msfoItem&&<><BreadcrumbSeparator className="max-md:hidden"/><BreadcrumbItem className="min-w-0 max-md:hidden"><BreadcrumbPage className="truncate">{msfoItem.title}</BreadcrumbPage></BreadcrumbItem></>}</>}
     {company&&<><BreadcrumbSeparator className="max-sm:hidden"/><BreadcrumbItem className="min-w-0"><BreadcrumbLink className="truncate" href={`#company/${company.id}/overview`}>{company.name}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="max-md:hidden"/><BreadcrumbItem className="max-md:hidden"><BreadcrumbPage>{sections.find(t=>t[0]===section)?.[1]}</BreadcrumbPage></BreadcrumbItem></>}
    </BreadcrumbList></Breadcrumb>
    <div className="ml-auto flex items-center gap-1">
     <UiBadge variant="outline" role="status" className={cn('gap-1.5 text-muted-foreground',saveStatus==='error'&&'border-red-200 bg-red-50 text-red-700')}>{saveStatus==='saving'?<Spinner/>:<Icon name={saveStatus==='error'?'alert':'check'} className={saveStatus==='error'?'':'text-emerald-600'}/>}{saveStatus==='error'?'Saqlanmadi':saveStatus==='saving'?'Saqlanmoqda…':'Saqlandi'}</UiBadge>
     <Tooltip><TooltipTrigger asChild><Button data-slot="button" variant="ghost" size="icon" aria-label="Yordam" onClick={()=>open({type:'help'})}><Icon name="help"/></Button></TooltipTrigger><TooltipContent>Yordam: ish tartibi haqida qisqacha</TooltipContent></Tooltip>
    </div>
   </header>

   <div id="main-content" tabIndex={-1} className={cn("mx-auto flex w-full min-w-0",msfoItem?"max-w-[90rem]":"max-w-6xl","flex-1 flex-col gap-4 p-4 outline-none max-lg:pb-24 lg:gap-6 lg:p-6")}>
{isMsfo?<MsfoPage items={msfo} setItems={setMsfo} companies={companies} route={route} go={go} aiConnected={!!ai.connection.connected} aiLoading={!!ai.connection.loading}/>:!company?<>
    <WorkspaceHome companies={companies} docs={docs} period={period} profile={profile} onPeriod={(value:string)=>setPeriod(value)} onOpenCompany={(id:string)=>go(`company/${id}/overview`)} onReview={reviewDocument} onUpload={()=>open({type:'upload',pick:true})} onAddCompany={()=>open({type:'company'})} banner={mine.length===0&&<Card><CardHeader><CardDescription>2 / 3 · Kompaniya qo‘shish</CardDescription><CardTitle>Profilingiz tayyor</CardTitle><CardDescription>Endi birinchi mijoz tashkilotini qo‘shing, so‘ng uning hujjatlarini yuklaysiz.</CardDescription></CardHeader><CardContent><ol role="list" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">{['Profil to‘ldirildi','Kompaniya qo‘shish','Hujjat yuklash va tekshirish'].map((label,i)=><li key={label} className={cn('flex items-center gap-2',i===1?'font-medium':'text-muted-foreground')}><span className={cn('flex size-6 items-center justify-center rounded-full border text-xs tabular-nums',i===0&&'border-emerald-200 bg-emerald-50 text-emerald-700',i===1&&'border-primary bg-primary text-primary-foreground')}>{i===0?<Icon name="check" size={14}/>:i+1}</span>{label}</li>)}</ol></CardContent></Card>}/>
    <Card className="gap-0 py-0"><a href="#msfo" className="flex items-center gap-4 rounded-xl p-4 outline-none hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-6">
     <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="msfo"/></span>
     <span className="grid min-w-0 flex-1 gap-0.5"><span className="flex flex-wrap items-center gap-2 font-medium">MSFO redaktori<UiBadge variant="secondary">Yangi</UiBadge></span><span className="text-sm text-pretty text-muted-foreground">Word hujjatini AI yordamida MSFO (IFRS) shakliga o‘tkazing, tahrirlang va .docx qilib yuklab oling.{msfo.length?` · ${msfo.length} ta hujjat`:''}</span></span>
     <Icon name="chevron" className="shrink-0 text-muted-foreground"/>
    </a></Card>
    {examples.length>0&&<Collapsible open={showExamples} onOpenChange={setShowExamples} className="flex flex-col gap-3"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="group/trigger self-start text-muted-foreground"><Icon name="folder"/>Avvalgi namuna kompaniyalar ({examples.length})<Icon name="down" className="transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger><CollapsibleContent className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">Oldingi preview ma’lumotlari saqlangan. Bu kompaniyalar namuna uchun.</p><div className="grid gap-3 md:grid-cols-2">{examples.map(c=><CompanyCard key={c.id} c={c} docs={docs} onOpen={()=>go(`company/${c.id}/overview`)}/>)}</div></CollapsibleContent></Collapsible>}
    <p className="flex items-start gap-2 text-sm text-muted-foreground"><Icon name="shield" size={16} className="mt-0.5 shrink-0"/>Har bir kompaniyaning hujjatlari, qarorlari va tarixi alohida saqlanadi.</p>
</>:<>
    <PageHeader media={section==='overview'?<InitialsTile name={company.name} size="lg"/>:undefined}
     title={section==='overview'?companyTitle(company):sections.find(t=>t[0]===section)?.[1]||'Kompaniya'}
     description={section==='overview'?`${company.stir?'STIR '+company.stir:'STIR kiritilmagan'} · ${month(period)}`:section==='documents'?'Oylik hujjatlar davr bo‘yicha yuritiladi, doimiy hujjatlar (ustav, guvohnoma, shartnoma) esa kompaniyada qoladi.':section==='history'?'Kim, qachon va qaysi hujjat bo‘yicha qaror qabul qilgani.':'Kompaniya rekvizitlari va mas’ul shaxslar.'}
     actions={<>
      {(section==='overview'||tab==='documents')&&<PeriodPicker value={period} min="2000-01" max="2100-12" onChange={(value:string)=>{setPeriod(value);setFilter('all')}}/>}
      {(section==='overview'||section==='documents')&&<Button variant={section==='overview'?'outline':'default'} onClick={()=>open({type:'upload'})}><Icon name="upload"/>Hujjat yuklash</Button>}
      <Button variant="outline" aria-label={`AI tahlil${aiPending?`: ${aiPending} ta hujjat tekshirilmoqda`:''}`} onClick={()=>setAiOpen(true)}><Icon name="spark"/>AI tahlil{aiPending>0&&<UiBadge role="status" className="h-5 min-w-5 rounded-full px-1 tabular-nums">{aiPending}</UiBadge>}</Button>
     </>}/>

{section==='overview'&&<CompanyOverview company={company} docs={docs} period={period} closed={closed} onNavigate={(target:string)=>go(`company/${company.id}/${target}`)} onOpen={showDocument} onUpload={()=>open({type:'upload'})} onFilter={(value:string)=>{nextFilter.current=value;go(`company/${company.id}/documents`)}}/>}

{section==='documents'&&<>
    <ToggleGroup type="single" value={tab} onValueChange={value=>value&&go(`company/${company.id}/${value}`)} aria-label="Hujjatlar turi" className="max-w-full rounded-lg bg-muted p-[3px]">
      <ToggleGroupItem className="h-8 gap-1.5 rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm" value="documents"><Icon name="calendar"/>Oylik hujjatlar<UiBadge variant="secondary" className="h-5 min-w-5 rounded-full px-1 tabular-nums">{current.length}</UiBadge></ToggleGroupItem>
      <ToggleGroupItem className="h-8 gap-1.5 rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm" value="archive"><Icon name="folder"/>Doimiy hujjatlar<UiBadge variant="secondary" className="h-5 min-w-5 rounded-full px-1 tabular-nums">{permanentCount}</UiBadge></ToggleGroupItem>
    </ToggleGroup>

    <Card>
     <CardHeader>
      <CardTitle>{tab==='archive'?'Doimiy hujjatlar':`${month(period)} hujjatlari`}</CardTitle>
      <CardDescription className="tabular-nums">{tab==='archive'?'Ustav, guvohnoma, shartnoma: oy almashganda ham shu yerda qoladi. ':''}{visible.length===documentList.length?`${documentList.length} ta hujjat`:`${visible.length} / ${documentList.length} ta hujjat`}</CardDescription>
      <CardAction className="flex items-center gap-2">
       <IconAction className="size-8" icon="download" disabled={!documentList.length} onClick={exportCSV} label="Hujjatlar reyestrini Excel (CSV) faylga yuklash"/>
      </CardAction>
     </CardHeader>
     <CardContent className="flex flex-col gap-4">
      {documentList.length>0&&<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
       <ToggleGroup type="single" variant="outline" size="sm" value={filter} onValueChange={value=>setFilter(value||'all')} aria-label="Hujjat holati bo‘yicha filtr" spacing={1} className="max-w-full flex-wrap justify-start">{chips.map(([key,label,count])=><ToggleGroupItem key={key} value={String(key)} className="shrink-0 gap-1.5 px-2.5">{label}<span className="text-muted-foreground tabular-nums">{count}</span></ToggleGroupItem>)}</ToggleGroup>
       <SearchField className="w-full lg:w-64" placeholder="Hujjat nomini qidirish" aria-label="Hujjat qidirish" value={query} onChange={e=>setQuery(e.target.value)}/>
      </div>}
      {visible.length?<div className="overflow-hidden rounded-lg border"><Table>
       <TableCaption className="sr-only">{company.name} hujjatlari</TableCaption>
       <TableHeader className="bg-muted"><TableRow><TableHead scope="col">Hujjat</TableHead><TableHead scope="col" className="max-md:hidden">Sana</TableHead><TableHead scope="col" className="max-sm:hidden">Holat</TableHead><TableHead scope="col" className="max-lg:hidden">Avto tekshiruv</TableHead><TableHead scope="col" className="max-sm:hidden"><span className="sr-only">Amal</span></TableHead></TableRow></TableHeader>
       <TableBody>{pageDocs.map(d=><TableRow key={d.id}>
        <TableCell className="whitespace-normal"><button type="button" className="flex w-full min-w-36 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={()=>showDocument(d)}>
         {d.status==='missing'?<FileTile label="TALAB" className="border-amber-200 bg-amber-50 text-[0.625rem] text-amber-700"/>:<FileTile fileName={d.fileName}/>}
         <span className="flex min-w-0 flex-col"><span className="font-medium [overflow-wrap:anywhere]">{documentName(d)}</span><span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{d.demo?'Namuna hujjati':d.status==='missing'?'Fayl kutilmoqda':`${d.fileName?.split('.').pop()?.toUpperCase()||'Fayl'} · ${d.size}`}{d.reason?` · ${d.reason}`:''}</span><Badge status={d.status} className="mt-1.5 sm:hidden"/></span>
        </button></TableCell>
        <TableCell className="text-muted-foreground tabular-nums max-md:hidden"><time dateTime={d.date||undefined}>{formatDate(d.date)||'—'}</time></TableCell>
        <TableCell className="max-sm:hidden"><Badge status={d.status}/></TableCell>
        <TableCell className="max-lg:hidden">{eligible(d)?<AIBadge doc={d}/>:<span className="text-sm text-muted-foreground">{d.demo?'Namuna':'—'}</span>}</TableCell>
        <TableCell className="text-right max-sm:hidden"><Button variant="ghost" size="sm" onClick={()=>showDocument(d)}><span>{d.status==='missing'?'Yuklash':d.status==='review_required'?'Tekshirish':'Ochish'}</span><Icon name="arrow"/></Button></TableCell>
       </TableRow>)}</TableBody>
      </Table></div>
      :<Empty title={documentList.length?'Hujjat topilmadi':tab==='archive'?'Doimiy hujjatlarni shu yerda saqlang':'Birinchi hujjatni yuklang'} text={documentList.length?'Qidiruvni yoki holat filtrini o‘zgartiring.':tab==='archive'?'Ustav, guvohnoma, shartnoma va rekvizitlarni shu yerga yuklang — ular oy almashganda ham kompaniyada qoladi.':`${month(period)} uchun PDF, rasm, Excel yoki CSV fayl yuklang. Yuklangandan keyin uni tekshirib, qabul qilasiz.`} action={!documentList.length&&<Button onClick={()=>open({type:'upload'})}><Icon name="upload"/>Hujjat yuklash</Button>}/>}
      {visible.length>0&&<div className="flex items-center justify-between gap-4 text-sm text-muted-foreground tabular-nums">
       <span>{`${(safePage-1)*pageSize+1}–${Math.min(safePage*pageSize,visible.length)} / ${visible.length} ta hujjat`}</span>
       <div className="flex items-center gap-2"><Button variant="outline" size="icon-sm" disabled={safePage<=1} onClick={()=>setPage(safePage-1)} aria-label="Oldingi sahifa"><Icon name="arrow" className="rotate-180"/></Button><span className="px-1">{safePage} / {totalPages}</span><Button variant="outline" size="icon-sm" disabled={safePage>=totalPages} onClick={()=>setPage(safePage+1)} aria-label="Keyingi sahifa"><Icon name="arrow"/></Button></div>
      </div>}
     </CardContent>
    </Card>

    {docs.some(d=>d.company===company.id&&d.demo)&&<Label className="flex items-center gap-2 font-normal text-muted-foreground"><Checkbox checked={showSampleDocs} onCheckedChange={v=>setShowSampleDocs(v===true)}/>Avvalgi namuna hujjatlarini ko‘rsatish</Label>}

    {tab==='documents'&&current.length>0&&<Card>
     <CardHeader className="max-sm:grid-cols-1!"><CardTitle>Davrni yopish</CardTitle><CardDescription>{closedNow?`${month(period)} yopilgan. Yangi hujjat qo‘shilsa, davr o‘zi qayta ochiladi.`:stats.ready?`${month(period)} bo‘yicha barcha hujjatlar qabul qilingan. Davrni yopsangiz, oy yakunlangan deb belgilanadi.`:`${month(period)} hali yopilmaydi. Quyidagilar bajarilishi kerak:`}</CardDescription>
      <CardAction className={cn("max-sm:col-start-1 max-sm:row-start-3 max-sm:justify-self-start max-sm:pt-2",!stats.ready&&!closedNow&&"max-sm:hidden")}><Button variant={stats.ready&&!closedNow?'default':'outline'} disabled={!stats.ready||closedNow} onClick={()=>open({type:'close'})}>{closedNow?'Davr yopilgan':'Davrni yopish'}</Button></CardAction></CardHeader>
     {!stats.ready&&!closedNow&&<CardContent><ul role="list" className="flex flex-col gap-2">{periodBlockers(current).map((b:any)=><li key={b.status} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><StatusBadge status={b.status}/>{b.label}</li>)}</ul></CardContent>}
    </Card>}
</>}

{section==='history'&&<Card>
     <CardHeader><CardTitle>Amallar tarixi</CardTitle><CardDescription className="tabular-nums">{history.length} ta amal · eng yangisi yuqorida</CardDescription></CardHeader>
     <CardContent>{history.length?<ol role="list" className="flex flex-col">{history.map((a:any,i:number)=><li key={a.id||i} className="relative flex gap-3 pb-6 last:pb-0">
      {i<history.length-1&&<span aria-hidden="true" className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border"/>}
      <span className={cn('z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground',historyTone[a.type])}><Icon name={a.type||'clock'} size={15}/></span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1"><div className="flex flex-wrap items-baseline justify-between gap-x-4"><p className="text-sm font-medium">{a.title}</p><time className="text-xs text-muted-foreground tabular-nums" dateTime={a.at||undefined}>{formatDate(a.at)} {a.time}</time></div><p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{a.detail?.replace(company.name+' · ','')}</p><p className="text-xs text-muted-foreground">{a.actor||'Avvalgi preview'}</p></div>
     </li>)}</ol>:<Empty icon="clock" title="Hali amallar yo‘q" text="Hujjat yuklaganingizda yoki qaror berganingizda, amal shu yerda sana va ismingiz bilan saqlanadi."/>}</CardContent>
    </Card>}

{section==='info'&&<Card>
     <CardHeader><CardTitle>Rekvizitlar</CardTitle><CardDescription>Hujjatlarni solishtirishda shu ma’lumotlar ishlatiladi.</CardDescription><CardAction><Button variant="outline" size="sm" onClick={()=>open({type:'edit-company'})}><Icon name="settings"/>Tahrirlash</Button></CardAction></CardHeader>
     <CardContent><dl className="grid gap-x-8 sm:grid-cols-2">{[['Kompaniya nomi',companyTitle(company)],['STIR',company.stir||'Kiritilmagan'],['Mas’ul buxgalter',company.isDemo?company.owner:profile.fullName],['Mijoz vakili',company.contact||'Kiritilmagan'],['Telefon raqami',company.phone||'Kiritilmagan'],['Asosiy valyuta','UZS — O‘zbekiston so‘mi']].map(([label,value])=><div key={label} className="flex flex-col gap-1 border-t py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{value}</dd></div>)}</dl></CardContent>
    </Card>}
</>}
    <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1 border-t pt-4 text-xs text-muted-foreground"><span>Hisobkor.uz · Buxgalterning ish joyi</span><span>{session.storage==='server'?'Ma’lumotlar serverda saqlanadi':'Ma’lumotlar shu qurilmada saqlanadi'}</span></footer>
   </div>
  </SidebarInset>

{company&&<BottomNav items={[['home','Bosh sahifa','dashboard','Bosh sahifa'],...sections]} current={section} onSelect={(id:string)=>go(id==='home'?'dashboard':`company/${company.id}/${id}`)}/>}
{company&&<AIOverlay key={company.id} company={company} docs={docs} ai={ai} open={aiOpen} onOpenChange={setAiOpen}/>}
<Modal open={modal?.type==='backup'} onClose={()=>setModal(null)} title="Zaxira nusxalari" description="Ish joyingizni saqlash va ko‘chirish."><BackupPanel state={workspaceState} onRestore={restoreWorkspace}/></Modal>

<Confirm open={modal?.type==='logout'} onOpenChange={(v:boolean)=>!v&&setModal(null)} title="Hisobdan chiqasizmi?" description="Ma’lumotlaringiz avval saqlanadi. Qaytish uchun hisobingizga qayta kirasiz." confirm="Chiqish" icon="logout" onConfirm={()=>{setModal(null);void signOut()}}/>
<Modal open={modal?.type==='profile'} onClose={()=>setModal(null)} title="Buxgalter profili" description="Qarorlar va tarixda ko‘rinadigan ma’lumotlaringiz.">{ProfileForm({editing:true})}</Modal>
<Modal open={modal?.type==='company'} onClose={()=>setModal(null)} title="Kompaniya qo‘shish" description="Avval nomini kiriting. Boshqa ma’lumotlar ixtiyoriy."><form onSubmit={addCompany}><CompanyFields error={error}/>{error&&error!==stirError&&<Alert variant="destructive" role="alert" className="mt-4"><Icon name="alert"/><AlertDescription>{error}</AlertDescription></Alert>}<DialogFooter className="mt-6"><Button variant="outline" type="button" onClick={()=>setModal(null)}>Bekor qilish</Button><Button type="submit">Kompaniyani qo‘shish<Icon name="arrow"/></Button></DialogFooter></form></Modal>
<Modal open={modal?.type==='edit-company'} onClose={()=>setModal(null)} title="Kompaniya ma’lumotlari" description={company?.name}><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();const stir=String(f.get('stir')||'').trim();if(!name){setError('Kompaniya nomini kiriting.');return;}if(stir&&!/^\d{9}$/.test(stir)){setError(stirError);return;}if(stir&&companies.some(c=>c.id!==company.id&&c.stir===stir)){setError('Bu STIR boshqa kompaniyada mavjud.');return;}const changes={name,stir,legal:String(f.get('legal')),contact:String(f.get('contact')||'').trim(),phone:String(f.get('phone')||'').trim()};setCompanies(all=>all.map(c=>c.id===company.id?{...c,...changes}:c));event('Kompaniya ma’lumotlari yangilandi',company,profile.fullName,'company');setModal(null);setToast('Ma’lumotlar saqlandi.');}}><CompanyFields company={company} error={error}/>{error&&error!==stirError&&<Alert variant="destructive" role="alert" className="mt-4"><Icon name="alert"/><AlertDescription>{error}</AlertDescription></Alert>}<DialogFooter className="mt-6"><Button variant="outline" type="button" onClick={()=>setModal(null)}>Bekor qilish</Button><Button type="submit">Saqlash</Button></DialogFooter></form></Modal>
<Modal open={modal?.type==='upload'} onClose={()=>!busy&&setModal(null)} title="Hujjat yuklash" description={modal?.pick?`${month(period)} · PDF, rasm, Excel yoki CSV fayl`:`${company?.name||''} · ${tab==='archive'?'Doimiy hujjatlar':month(period)}`}>
{modal?.type==='upload'&&<UploadForm onSubmit={upload} busy={busy} error={error} archive={tab==='archive'} target={modal.target} pick={!!modal.pick} companies={mine}/>}</Modal>

<Modal open={modal?.type==='document'} onClose={()=>setModal(null)} title={activeDoc?documentName(activeDoc):'Hujjat'} description={company?.name} wide>{activeDoc&&<div className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
 <section className="flex flex-col gap-3 lg:sticky lg:top-0" aria-label="Fayl ko‘rinishi">
  <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted lg:min-h-[32rem]">{preview?(activeDoc.fileName.toLowerCase().endsWith('.pdf')?<iframe className="h-[70dvh] w-full" title="PDF hujjat" src={preview+'#navpanes=0&view=FitH'}/>:<img className="max-h-[70dvh] max-w-full" src={preview} alt={activeDoc.title}/>):<Empty icon="document" title={activeDoc.demo?'Namuna hujjati':'Fayl saqlangan'} text={activeDoc.demo?'Avvalgi preview’dan qolgan namuna. Asl fayl biriktirilmagan.':'Excel yoki CSV faylini yuklab olib ochishingiz mumkin.'}/>}</div>
  {fileError&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertDescription>{fileError}</AlertDescription></Alert>}
 </section>
 <section className="flex min-w-0 flex-col gap-4" aria-label="Hujjat ma’lumotlari va qaror">
  <div className="flex items-center gap-3"><FileTile fileName={activeDoc.fileName}/><div className="min-w-0 flex-1"><p className="text-sm font-medium [overflow-wrap:anywhere]">{activeDoc.fileName}</p><p className="text-sm text-muted-foreground tabular-nums">{formatDate(activeDoc.date)||'Sana ko‘rsatilmagan'} · {activeDoc.size}</p></div><Badge status={activeDoc.status}/></div>
  <Separator/>
  <AIReview doc={activeDoc} docs={docs} company={company} ai={ai} onRelated={showDocument}/>
  {!eligible(activeDoc)&&<Alert><Icon name="spark"/><AlertDescription>Avtomatik tekshiruv bu hujjatni ko‘rmagan. Qarorni o‘zingiz berasiz.</AlertDescription></Alert>}
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Kompaniya</dt><dd className="text-right font-medium">{company?.name}</dd><dt className="text-muted-foreground">Bo‘lim</dt><dd className="text-right font-medium">{activeDoc.scope==='permanent'?'Doimiy hujjatlar':month(activeDoc.period)}</dd><dt className="text-muted-foreground">Fayl hajmi</dt><dd className="text-right font-medium tabular-nums">{activeDoc.size}</dd>{activeDoc.reviewer&&<><dt className="text-muted-foreground">Qabul qilgan buxgalter</dt><dd className="text-right font-medium">{activeDoc.reviewer}</dd></>}</dl>
  {activeDoc.reason&&<Alert className="border-amber-200 bg-amber-50 text-amber-900"><Icon name="alert"/><AlertTitle>Tuzatish sababi</AlertTitle><AlertDescription className="text-amber-800">{activeDoc.reason}</AlertDescription></Alert>}
  {activeDoc.status==='review_required'&&<Card className="gap-4 bg-muted/40 py-5 shadow-none"><CardHeader className="px-5"><CardTitle>Qaroringiz</CardTitle><CardDescription>Hujjatni va AI topgan xato hamda ziddiyatlarni ko‘rib chiqing. Qaror kompaniya tarixida ismingiz bilan saqlanadi.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4 px-5">
   <Button className="w-full" onClick={()=>decide('accepted')}><Icon name="check"/>Qabul qilish</Button>
  </CardContent></Card>}
  {error&&activeDoc.status!=='review_required'&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertDescription>{error}</AlertDescription></Alert>}
  {activeDoc.status==='correction_requested'&&<Button className="w-full" onClick={()=>open({type:'upload',target:activeDoc})}><Icon name="upload"/>Yangi nusxa yuklash</Button>}
  {!activeDoc.demo&&<Button variant="ghost" className="w-full" onClick={()=>download(activeDoc)}><Icon name="download"/>Asl faylni yuklab olish</Button>}
 </section>
</div>}</Modal>
<Confirm open={modal?.type==='close'} onOpenChange={(v:boolean)=>!v&&setModal(null)} title={`${month(period)} davrini yopasizmi?`} description={`${company?.name||''} bo‘yicha barcha talablar qabul qilingan. Yopilgandan keyin yangi hujjat yoki talab qo‘shilsa, davr o‘zi qayta ochiladi.`} confirm="Davrni yopish" icon="check" onConfirm={()=>{if(!stats.ready){setToast('Hali bajarilmagan talablar bor.');return;}setClosed(a=>[...a,`${company.id}:${period}`]);event('Hisobot davri yopildi',company,month(period),'check');setModal(null);setToast('Davr yopildi.');}}/>
<Modal open={modal?.type==='help'} onClose={()=>setModal(null)} title="Hisobkor.uz bilan ishlash" description="Kundalik ish uchta qadamdan iborat."><div className="flex flex-col gap-4 text-sm text-pretty text-muted-foreground [&_b]:font-medium [&_b]:text-foreground"><p><b>1. Bosh sahifadan boshlang.</b> U yerda tekshiruvingizni kutayotgan hujjatlar va har bir kompaniyaning shu oydagi holati ko‘rinadi.</p><p><b>2. Hujjatni oching va qaror bering.</b> “Tekshirish” tugmasi hujjat oynasini ochadi: AI topgan xato va ziddiyatlarni ko‘rib, hujjatni qabul qilasiz.</p><p><b>3. Oyni yakunlang.</b> Barcha talablar qabul qilinganda “Davrni yopish” ishga tushadi. Barcha amallar “Tarix” bo‘limida saqlanadi.</p><Alert><Icon name="help"/><AlertDescription>{session.storage==='server'?'Bu shaxsiy buxgalter kabineti. Ma’lumotlar serverda saqlanadi.':'Bu lokal ish joyi. Mavjud bo‘lsa, avtomatik tekshiruv fayllarga yordamchi xulosa beradi.'} Schyot-faktura va shartnoma rekvizitlari kompaniya ichida solishtiriladi. Didox va mijozga xabar yuborish ulanmagan. Brauzer ma’lumotlari o‘chirilsa, saqlangan fayllar ham yo‘qoladi.</AlertDescription></Alert></div></Modal>
{shared}</>;
}
function CompanyCard({c,docs,onOpen}:any){const all=docs.filter((d:any)=>d.company===c.id&&(c.isDemo||!d.demo));const n=all.filter((d:any)=>d.status==='review_required').length;const count=all.filter((d:any)=>d.status!=='missing').length;return <Card className="flex-row items-center gap-3 px-4 py-4"><InitialsTile name={c.name}/><span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{c.name}</span><span className="truncate text-sm text-muted-foreground tabular-nums">{c.legal||'MChJ'}{c.stir?` · STIR ${c.stir}`:''} · {count} ta hujjat{n?` · ${n} ta tekshirish kerak`:''}</span></span><Button variant="outline" size="sm" onClick={onOpen} aria-label={`${c.name} kompaniyasini ochish`}>Ochish<Icon name="arrow"/></Button></Card>}
const stirError='STIR 9 ta raqamdan iborat bo‘lishi kerak.';
function CompanyFields({company,error}:any){const bad=error===stirError;return <FieldGroup>
 <Field><FieldLabel htmlFor="company-name">Kompaniya nomi</FieldLabel><Input id="company-name" required name="name" maxLength={100} placeholder="Masalan, Atlas Savdo" defaultValue={company?.name||''}/><FieldDescription>Ro‘yxatlarda va hujjatlarda shu nom ko‘rinadi.</FieldDescription></Field>
 <div className="grid gap-4 sm:grid-cols-2">
  <Field><FieldLabel htmlFor="company-legal">Tashkiliy shakli</FieldLabel><NativeSelect id="company-legal" name="legal" className="w-full" defaultValue={company?.legal||'MChJ'}><NativeSelectOption>MChJ</NativeSelectOption><NativeSelectOption>YTT</NativeSelectOption><NativeSelectOption>AJ</NativeSelectOption><NativeSelectOption>Boshqa</NativeSelectOption></NativeSelect></Field>
  <Field data-invalid={bad||undefined}><FieldLabel htmlFor="company-stir">STIR <Optional/></FieldLabel><Input id="company-stir" name="stir" inputMode="numeric" autoComplete="off" maxLength={9} placeholder="9 ta raqam" defaultValue={company?.stir||''} aria-invalid={bad||undefined} aria-describedby={bad?'stir-error':'stir-hint'}/></Field>
 </div>
 {bad?<FieldError id="stir-error">{stirError}</FieldError>:<FieldDescription id="stir-hint" className="-mt-4">STIR kiritilsa, hujjatdagi rekvizitlar shu kompaniya bilan solishtiriladi.</FieldDescription>}
 <Collapsible defaultOpen={!!company} className="flex flex-col gap-4"><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="group/trigger -ml-2 self-start text-muted-foreground">Mijoz vakili va aloqa ma’lumotlari<Icon name="down" className="transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger><CollapsibleContent forceMount className="data-[state=closed]:hidden"><FieldGroup>
  <Field><FieldLabel htmlFor="company-contact">Mijoz vakili <Optional/></FieldLabel><Input id="company-contact" name="contact" autoComplete="name" maxLength={100} placeholder="Ism va familiya" defaultValue={company?.contact||''}/></Field>
  <Field><FieldLabel htmlFor="company-phone">Telefon raqami <Optional/></FieldLabel><Input id="company-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+998" defaultValue={company?.phone||''}/></Field>
 </FieldGroup></CollapsibleContent></Collapsible>
</FieldGroup>}
function UploadForm({onSubmit,busy,error,archive,target,companies,pick}:any){const [files,setFiles]=useState<File[]>([]);const [over,setOver]=useState(false);return <form onSubmit={e=>onSubmit(e,files)} noValidate><FieldGroup>
 {pick&&<Field><FieldLabel htmlFor="upload-company">Qaysi kompaniyaga?</FieldLabel><NativeSelect id="upload-company" name="company" className="w-full" defaultValue={companies[0]?.id}>{companies.map((c:any)=><NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}</NativeSelect><FieldDescription>Fayl shu kompaniyaning hujjatlari orasida saqlanadi.</FieldDescription></Field>}
 <Field><label htmlFor="upload-files" onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);setFiles(Array.from(e.dataTransfer.files))}} className={cn('relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50',over&&'border-primary bg-primary/5')}>
  <span aria-hidden="true" className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon name="upload" size={20}/></span>
  <span className="text-sm font-medium">{files.length?`${files.length} ta fayl tanlandi`:'Fayl tanlang yoki shu yerga tashlang'}</span>
  <span className="text-sm text-muted-foreground">PDF, JPG, PNG, XLSX yoki CSV · har bir fayl 25 MBgacha</span>
  <input id="upload-files" name="files" type="file" className="absolute inset-0 cursor-pointer opacity-0" aria-label="Fayl tanlash" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" multiple={!target} onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
 </label></Field>
 {files.length>0&&<ul role="list" className="max-h-40 divide-y overflow-y-auto rounded-lg border text-sm">{files.map((f,i)=><li key={i} className="flex items-center gap-2 px-3 py-2"><Icon name="document" size={16} className="shrink-0 text-muted-foreground"/><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="shrink-0 text-muted-foreground tabular-nums">{Math.max(1,Math.round(f.size/1024))} KB</span></li>)}</ul>}
 {target?<Alert><Icon name="request"/><AlertDescription>Talab: {target.title}</AlertDescription></Alert>:<>
  <Field><FieldLabel htmlFor="upload-title">Hujjat nomi <Optional/></FieldLabel><Input id="upload-title" name="title" maxLength={120} placeholder="Kiritmasangiz, fayl nomi saqlanadi"/></Field>
  <Field><FieldLabel htmlFor="upload-scope">Saqlash joyi</FieldLabel><NativeSelect id="upload-scope" name="scope" className="w-full" defaultValue={archive?'permanent':'periodic'}><NativeSelectOption value="periodic">Oylik hujjatlar</NativeSelectOption><NativeSelectOption value="permanent">Doimiy hujjatlar</NativeSelectOption></NativeSelect><FieldDescription>Doimiy hujjatlar (ustav, shartnoma, guvohnoma) oy almashganda ham kompaniyada qoladi.</FieldDescription></Field>
 </>}
 {error&&<FieldError>{error}</FieldError>}
</FieldGroup><DialogFooter className="mt-6 sm:items-center"><span className="text-sm text-pretty text-muted-foreground sm:mr-auto">Yuklangan hujjat avtomatik qabul qilinmaydi — qarorni siz berasiz.</span><Button type="submit" disabled={busy}>{busy?<Spinner/>:<Icon name="upload"/>}{busy?'Saqlanmoqda…':'Yuklash'}</Button></DialogFooter></form>}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><Runtime>{({initial,session,logout}:any)=><TooltipProvider delayDuration={200}><SidebarProvider className="isolate antialiased [--sidebar-width:16rem]"><App saved={initial} session={session} logout={logout}/></SidebarProvider></TooltipProvider>}</Runtime></ErrorBoundary>);
