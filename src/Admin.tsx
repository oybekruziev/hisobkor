import React,{useEffect,useMemo,useState} from 'react';
import {PageHeader} from './components/PageHeader';
import {SearchField} from './components/SearchField';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from './components/ui/card';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from './components/ui/table';
import {Badge} from './components/ui/badge';
import {Button} from './components/ui/button';
import {Spinner} from './components/ui/spinner';
import {Skeleton} from './components/ui/skeleton';
import {Alert,AlertDescription} from './components/ui/alert';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription} from './components/ui/empty';
import * as Dropdown from './components/ui/dropdown-menu';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './components/ui/alert-dialog';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from './components/ui/dialog';
import {toast} from 'sonner';
import {Icon} from './Icon';
import {cn} from './lib/utils';
import {request} from './storage';
import {formatDate} from './format.mjs';

export type AdminUser={id:string;username:string;admin:boolean;disabled:boolean;createdAt:number;lastSeenAt:number|null;lastActivityAt:number|null;activeSessions:number;fullName:string;phone:string;companies:number;documents:number;msfo:number;files:number;fileBytes:number;stateBytes:number;aiJobs:number};

const DAY=24*60*60*1000;
export const formatBytes=(n:number)=>n<1024?`${n} B`:n<1048576?`${Math.round(n/1024)} KB`:n<1073741824?`${(n/1048576).toFixed(1).replace('.0','')} MB`:`${(n/1073741824).toFixed(2)} GB`;
/** "hozir", "3 soat oldin", "5 kun oldin"; older than a month falls back to a date. */
export function relativeTime(ms:number|null,now=Date.now()){
 if(!ms)return '—';
 const diff=Math.max(0,now-ms);
 if(diff<60_000)return 'hozir';
 if(diff<3_600_000)return `${Math.floor(diff/60_000)} daqiqa oldin`;
 if(diff<DAY)return `${Math.floor(diff/3_600_000)} soat oldin`;
 if(diff<30*DAY)return `${Math.floor(diff/DAY)} kun oldin`;
 return formatDate(new Date(ms).toISOString());
}
const activeAt=(u:AdminUser)=>Math.max(u.lastSeenAt||0,u.lastActivityAt||0)||null;

const sorters:Record<string,(a:AdminUser,b:AdminUser)=>number>={
 newest:(a,b)=>b.createdAt-a.createdAt,
 active:(a,b)=>(activeAt(b)||0)-(activeAt(a)||0),
 storage:(a,b)=>(b.fileBytes+b.stateBytes)-(a.fileBytes+a.stateBytes),
 name:(a,b)=>a.username.localeCompare(b.username),
};

function Stat({label,value,hint}:{label:string;value:React.ReactNode;hint?:string}){
 return <Card className="gap-1 py-4"><CardHeader className="px-4"><CardDescription>{label}</CardDescription><CardTitle className="text-2xl tabular-nums">{value}</CardTitle></CardHeader>{hint&&<CardContent className="px-4 text-xs text-muted-foreground">{hint}</CardContent>}</Card>;
}

export function AdminPage({currentUsername}:{currentUsername?:string}){
 const [users,setUsers]=useState<AdminUser[]|null>(null);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [sort,setSort]=useState('newest');
 const [show,setShow]=useState<'all'|'active'|'disabled'>('all');
 const [busy,setBusy]=useState<string|null>(null);
 const [confirm,setConfirm]=useState<{type:'disable'|'enable'|'delete'|'password';user:AdminUser}|null>(null);
 const [issued,setIssued]=useState<{username:string;password:string}|null>(null);
 const [now,setNow]=useState(()=>Date.now());

 async function load(){
  setError('');
  try{const data=await(await request('/api/admin/users')).json();setUsers(data.users);setNow(Date.now())}
  catch(e:any){setError(e.message||'Foydalanuvchilar ro‘yxati yuklanmadi.')}
 }
 useEffect(()=>{void load()},[]);

 const visible=useMemo(()=>{
  if(!users)return [];
  const q=query.trim().toLowerCase();
  return users.filter(u=>(show==='all'||(show==='disabled'?u.disabled:!u.disabled))&&(!q||`${u.username} ${u.fullName} ${u.phone}`.toLowerCase().includes(q))).sort(sorters[sort]||sorters.newest);
 },[users,query,sort,show]);

 const total=users?.length||0;
 const weekActive=users?.filter(u=>(activeAt(u)||0)>now-7*DAY).length||0;
 const disabled=users?.filter(u=>u.disabled).length||0;
 const storage=users?.reduce((s,u)=>s+u.fileBytes+u.stateBytes,0)||0;

 async function act(){
  if(!confirm)return;
  const {type,user}=confirm;setConfirm(null);setBusy(user.id);
  const headers={'Content-Type':'application/json'};
  try{
   if(type==='delete'){await request(`/api/admin/users/${user.id}`,{method:'DELETE',headers,body:'{}'});setUsers(list=>list?.filter(u=>u.id!==user.id)||null);toast.success(`${user.username} hisobi o‘chirildi.`)}
   else if(type==='password'){const data=await(await request(`/api/admin/users/${user.id}/password`,{method:'POST',headers,body:'{}'})).json();setIssued({username:data.username,password:data.password})}
   else{const disabled=type==='disable';await request(`/api/admin/users/${user.id}/disable`,{method:'POST',headers,body:JSON.stringify({disabled})});setUsers(list=>list?.map(u=>u.id===user.id?{...u,disabled,activeSessions:disabled?0:u.activeSessions}:u)||null);toast.success(disabled?`${user.username} bloklandi. Faol sessiyalari tugatildi.`:`${user.username} qayta yoqildi.`)}
  }catch(e:any){toast.error(e.message||'Amal bajarilmadi.')}
  finally{setBusy(null)}
 }

 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);toast.success('Nusxa olindi.')}catch{toast.error('Nusxa olib bo‘lmadi. Parolni qo‘lda ko‘chiring.')}};
 const dialogText:Record<string,[string,string,string]>={
  disable:['Foydalanuvchini bloklash','Foydalanuvchi tizimga kira olmaydi, faol sessiyalari darhol tugatiladi. Ma’lumotlari saqlanib qoladi.','Bloklash'],
  enable:['Blokdan chiqarish','Foydalanuvchi yana tizimga kira oladi.','Yoqish'],
  password:['Parolni tiklash','Yangi vaqtinchalik parol yaratiladi va bir marta ko‘rsatiladi. Eski parol va boshqa sessiyalar bekor bo‘ladi.','Yangi parol berish'],
  delete:['Hisobni butunlay o‘chirish','Foydalanuvchi, ish joyi, barcha hujjatlar va fayllar qaytarib bo‘lmaydigan tarzda o‘chiriladi.','O‘chirish'],
 };

 return <>
  <PageHeader title="Foydalanuvchilar" description="app.hisobkor.uz dagi barcha hisoblar: faollik, hajm va boshqaruv amallari." actions={<Button variant="outline" onClick={load} disabled={!users&&!error}><Icon name="undo"/>Yangilash</Button>}/>
  {error&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertDescription className="flex flex-wrap items-center gap-2">{error}<Button size="sm" variant="outline" onClick={load}>Qayta urinish</Button></AlertDescription></Alert>}
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <Stat label="Jami hisoblar" value={users?total:<Skeleton className="h-8 w-12"/>}/>
   <Stat label="So‘nggi 7 kunda faol" value={users?weekActive:<Skeleton className="h-8 w-12"/>} hint="Kirgan yoki ish joyini o‘zgartirgan"/>
   <Stat label="Bloklangan" value={users?disabled:<Skeleton className="h-8 w-12"/>}/>
   <Stat label="Umumiy hajm" value={users?formatBytes(storage):<Skeleton className="h-8 w-16"/>} hint="Fayllar + ish joyi ma’lumoti"/>
  </div>
  <Card className="gap-0 py-0">
   <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
    <SearchField className="sm:max-w-xs" placeholder="Login, ism yoki telefon…" aria-label="Foydalanuvchi qidirish" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="flex flex-wrap gap-1" role="group" aria-label="Holat bo‘yicha filtr">{([['all','Barchasi'],['active','Faol'],['disabled','Bloklangan']] as const).map(([k,l])=><Button key={k} size="sm" variant={show===k?'secondary':'ghost'} aria-pressed={show===k} onClick={()=>setShow(k)}>{l}</Button>)}</div>
    <label className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">Saralash<select className="h-8 rounded-md border bg-background px-2 text-sm text-foreground" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Yangi ro‘yxatdan o‘tganlar</option><option value="active">So‘nggi faollik</option><option value="storage">Hajm bo‘yicha</option><option value="name">Login (A–Z)</option></select></label>
   </div>
   {!users&&!error?<div className="flex flex-col gap-3 p-4" aria-busy="true">{[0,1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
   :visible.length===0?<Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><Icon name="search"/></EmptyMedia><EmptyTitle>Foydalanuvchi topilmadi</EmptyTitle><EmptyDescription>{query?'Qidiruv so‘zini o‘zgartirib ko‘ring.':'Hali hech kim ro‘yxatdan o‘tmagan.'}</EmptyDescription></EmptyHeader></Empty>
   :<div className="overflow-x-auto"><Table>
    <TableHeader><TableRow>
     <TableHead>Foydalanuvchi</TableHead><TableHead>Holat</TableHead><TableHead>Ro‘yxatdan o‘tgan</TableHead><TableHead>Faollik</TableHead>
     <TableHead className="text-right">Kompaniya</TableHead><TableHead className="text-right">Hujjat</TableHead><TableHead className="text-right">MSFO</TableHead><TableHead className="text-right">AI</TableHead><TableHead className="text-right">Hajm</TableHead><TableHead><span className="sr-only">Amallar</span></TableHead>
    </TableRow></TableHeader>
    <TableBody>{visible.map(u=>{const me=u.username.toLowerCase()===String(currentUsername||'').toLowerCase();return <TableRow key={u.id} className={cn(u.disabled&&'text-muted-foreground')}>
     <TableCell><div className="grid leading-tight"><span className="flex items-center gap-1.5 font-medium">{u.username}{u.admin&&<Badge variant="outline" className="text-primary">Admin</Badge>}{me&&<span className="text-xs text-muted-foreground">(siz)</span>}</span>{(u.fullName||u.phone)&&<span className="text-xs text-muted-foreground">{[u.fullName,u.phone].filter(Boolean).join(' · ')}</span>}</div></TableCell>
     <TableCell>{u.disabled?<Badge variant="destructive">Bloklangan</Badge>:u.activeSessions>0?<Badge variant="secondary" className="text-emerald-700">Onlayn</Badge>:<Badge variant="outline">Faol</Badge>}</TableCell>
     <TableCell className="tabular-nums whitespace-nowrap">{formatDate(new Date(u.createdAt).toISOString())}</TableCell>
     <TableCell className="whitespace-nowrap">{relativeTime(activeAt(u),now)}</TableCell>
     <TableCell className="text-right tabular-nums">{u.companies}</TableCell><TableCell className="text-right tabular-nums">{u.documents}</TableCell><TableCell className="text-right tabular-nums">{u.msfo}</TableCell><TableCell className="text-right tabular-nums">{u.aiJobs}</TableCell>
     <TableCell className="text-right tabular-nums whitespace-nowrap">{formatBytes(u.fileBytes+u.stateBytes)}</TableCell>
     <TableCell className="text-right"><Dropdown.DropdownMenu modal={false}><Dropdown.DropdownMenuTrigger asChild><Button data-slot="button" variant="ghost" size="icon" aria-label={`${u.username}: amallar`} disabled={busy===u.id}>{busy===u.id?<Spinner/>:<Icon name="more"/>}</Button></Dropdown.DropdownMenuTrigger>
      <Dropdown.DropdownMenuContent align="end">
       <Dropdown.DropdownMenuItem onSelect={()=>setConfirm({type:'password',user:u})}><Icon name="shield"/>Parolni tiklash</Dropdown.DropdownMenuItem>
       <Dropdown.DropdownMenuItem disabled={me||u.admin} onSelect={()=>setConfirm({type:u.disabled?'enable':'disable',user:u})}><Icon name={u.disabled?'check':'close'}/>{u.disabled?'Blokdan chiqarish':'Bloklash'}</Dropdown.DropdownMenuItem>
       <Dropdown.DropdownMenuSeparator/>
       <Dropdown.DropdownMenuItem variant="destructive" disabled={me||u.admin} onSelect={()=>setConfirm({type:'delete',user:u})}><Icon name="trash"/>Hisobni o‘chirish</Dropdown.DropdownMenuItem>
      </Dropdown.DropdownMenuContent></Dropdown.DropdownMenu></TableCell>
    </TableRow>})}</TableBody>
   </Table></div>}
   {users&&visible.length>0&&<p className="border-t px-4 py-3 text-xs text-muted-foreground">{visible.length} / {total} ta hisob ko‘rsatilmoqda.</p>}
  </Card>
  <AlertDialog open={!!confirm} onOpenChange={v=>!v&&setConfirm(null)}>{confirm&&<AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{dialogText[confirm.type][0]}: {confirm.user.username}</AlertDialogTitle><AlertDialogDescription>{dialogText[confirm.type][1]}{confirm.type==='delete'&&` Hozir: ${confirm.user.companies} kompaniya, ${confirm.user.documents} hujjat, ${confirm.user.files} fayl (${formatBytes(confirm.user.fileBytes)}).`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction className={cn(confirm.type==='delete'&&'bg-destructive text-white hover:bg-destructive/90')} onClick={act}>{dialogText[confirm.type][2]}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>}</AlertDialog>
  <Dialog open={!!issued} onOpenChange={v=>!v&&setIssued(null)}><DialogContent><DialogHeader><DialogTitle>Yangi vaqtinchalik parol</DialogTitle><DialogDescription>{issued?.username} uchun. Bu parol faqat hozir ko‘rsatiladi — foydalanuvchiga xavfsiz yo‘l bilan yetkazing va kirgach almashtirishni so‘rang.</DialogDescription></DialogHeader>
   <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3"><code className="min-w-0 flex-1 break-all font-mono text-base">{issued?.password}</code><Button variant="outline" size="sm" onClick={()=>issued&&copy(issued.password)}><Icon name="copy"/>Nusxa</Button></div>
   <DialogFooter><Button onClick={()=>setIssued(null)}>Yopish</Button></DialogFooter></DialogContent></Dialog>
 </>;
}
