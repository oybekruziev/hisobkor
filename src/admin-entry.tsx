import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Toaster} from 'sonner';
import {TooltipProvider} from './components/ui/tooltip';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {Field,FieldGroup,FieldLabel} from './components/ui/field';
import {Alert,AlertDescription} from './components/ui/alert';
import {Spinner} from './components/ui/spinner';
import {Icon} from './Icon';
import {request} from './storage';
import {AdminPage} from './Admin';

function Brand(){return <span className="flex items-center gap-2"><img src="/brand-h.png" width="28" height="28" alt="" className="size-7 object-contain"/><span className="text-base font-semibold tracking-tight">hisobkor<span className="font-normal text-muted-foreground">.uz</span></span><span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Admin</span></span>}

function AdminApp(){
 const [session,setSession]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function init(){setError('');try{setSession(await(await request('/api/session')).json())}catch(e:any){setError(e.message);setSession({authenticated:false})}}
 useEffect(()=>{void init()},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);setError('');setBusy(true);
  try{await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})});await init()}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function logout(){try{await request('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})}finally{location.reload()}}
 if(!session)return <div className="flex min-h-svh items-center justify-center" role="status"><Spinner/><span className="sr-only">Yuklanmoqda…</span></div>;
 if(!session.authenticated)return <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-6">
  <Brand/>
  <form onSubmit={submit} aria-busy={busy} className="w-full max-w-xs rounded-xl border bg-background p-6 shadow-xs"><FieldGroup>
   <div className="flex flex-col gap-1 text-center"><h1 className="text-xl font-semibold tracking-tight">Admin panelga kirish</h1><p className="text-sm text-muted-foreground">Faqat administrator hisoblari uchun.</p></div>
   <Field><FieldLabel htmlFor="admin-username">Login</FieldLabel><Input id="admin-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus/></Field>
   <Field><FieldLabel htmlFor="admin-password">Parol</FieldLabel><Input id="admin-password" name="password" type="password" autoComplete="current-password" required/></Field>
   {error&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertDescription>{error}</AlertDescription></Alert>}
   <Button type="submit" className="w-full" disabled={busy}>{busy&&<Spinner/>}{busy?'Kirilmoqda…':'Kirish'}</Button>
  </FieldGroup></form>
  <a href="https://app.hisobkor.uz" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Ilovaga qaytish</a>
 </main>;
 return <div className="min-h-svh bg-background antialiased">
  <header className="flex h-14 items-center gap-3 border-b px-4 lg:px-6"><Brand/><span className="ml-auto text-sm text-muted-foreground max-sm:hidden">{session.username}</span><Button variant="outline" size="sm" onClick={logout}><Icon name="logout"/>Chiqish</Button></header>
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:gap-6 lg:p-6"><AdminPage currentUsername={session.username}/></main>
  <Toaster theme="light" position="bottom-left" closeButton/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<TooltipProvider delayDuration={200}><AdminApp/></TooltipProvider>);
