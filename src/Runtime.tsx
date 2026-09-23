import {Brand} from './components/Brand';
import {Skeleton} from './components/ui/skeleton';
import {Alert,AlertDescription} from './components/ui/alert';
import {Field,FieldGroup,FieldLabel,FieldDescription} from './components/ui/field';
import {Spinner} from './components/ui/spinner';
import React,{useEffect,useState} from 'react';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {Icon} from './Icon';
import {openWorkspace,request} from './storage';
export function Runtime({children}:any){
 const [session,setSession]=useState<any>(null),[state,setState]=useState<any>(undefined),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [registering,setRegistering]=useState(()=>location.hash==='#register');
 async function init(){setError('');try{const s=await(await request('/api/session')).json();setSession(s);if(s.authenticated||s.mode==='local')setState(await openWorkspace(s.storage));}catch(e:any){setError(e.message)}}
 useEffect(()=>{void init()},[]);
 function switchMode(){setRegistering(!registering);setError('');history.replaceState(null,'',registering?'#login':'#register')}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=new FormData(e.currentTarget);setError('');
  if(registering&&form.get('password')!==form.get('confirmPassword')){setError('Parollar bir xil emas.');e.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();return}
  setBusy(true);
  try{
   await request(registering?'/api/register':'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password'),...(registering?{confirmPassword:form.get('confirmPassword')}:{})})});
   history.replaceState(null,'',location.pathname);await init();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function logout(){await request('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.reload()}
 if(state!==undefined)return children({initial:state,session,logout});
 const auth=session&&!session.authenticated&&session.mode==='production';
 return <div className="isolate grid min-h-svh antialiased lg:grid-cols-2">
  <main className="flex flex-col gap-6 p-6 md:p-10">
   <Brand href="https://hisobkor.uz"/>
   <div className="flex flex-1 items-center justify-center">
    {auth?<div className="w-full max-w-xs">
     <form key={registering?'register':'login'} onSubmit={submit} aria-busy={busy} aria-labelledby="auth-heading" noValidate={false}>
      <FieldGroup>
       <div className="flex flex-col gap-1 text-center">
        <h1 id="auth-heading" className="text-2xl font-semibold tracking-tight">{registering?'Hisob yarating':'Ish joyingizga kiring'}</h1>
        <p className="text-sm text-balance text-muted-foreground">{registering?'Login va parol tanlang. Keyin buxgalter ma’lumotlaringizni to‘ldirasiz.':'Kompaniyalaringiz va hujjatlaringiz bir joyda.'}</p>
       </div>
       <Field>
        <FieldLabel htmlFor="auth-username">Foydalanuvchi nomi</FieldLabel>
        <Input id="auth-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus minLength={registering?3:undefined} maxLength={registering?40:128} pattern={registering?'[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}':undefined} placeholder={registering?'Masalan, oybek_uz':undefined} aria-describedby={registering?'username-hint':undefined}/>
        {registering&&<FieldDescription id="username-hint">3–40 belgi: lotin harflari, raqam, nuqta, chiziqcha yoki pastki chiziq.</FieldDescription>}
       </Field>
       <Field>
        <FieldLabel htmlFor="auth-password">Parol</FieldLabel>
        <Input id="auth-password" type="password" name="password" autoComplete={registering?'new-password':'current-password'} required minLength={registering?12:undefined} maxLength={registering?128:1024} aria-describedby={registering?'password-hint':undefined}/>
        {registering&&<FieldDescription id="password-hint">Kamida 12 belgi. Bir necha so‘zdan iborat uzun parol tanlashingiz mumkin.</FieldDescription>}
       </Field>
       {registering&&<Field>
        <FieldLabel htmlFor="auth-confirm">Parolni takrorlang</FieldLabel>
        <Input id="auth-confirm" type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={128}/>
       </Field>}
       {error&&<Alert variant="destructive" role="alert"><Icon name="alert"/><AlertDescription>{error}</AlertDescription></Alert>}
       <Button className="w-full" disabled={busy} type="submit">{busy&&<Spinner/>}{busy?(registering?'Hisob yaratilmoqda…':'Kirilmoqda…'):(registering?'Hisob yaratish':'Kirish')}</Button>
       <p className="text-center text-sm text-muted-foreground">{registering?'Hisobingiz bormi?':'Hali hisobingiz yo‘qmi?'} <Button type="button" variant="link" className="h-auto p-0" disabled={busy} onClick={switchMode}>{registering?'Kirish':'Hisob yaratish'}</Button></p>
      </FieldGroup>
     </form>
    </div>:<div className="flex w-full max-w-xs flex-col items-center gap-4 text-center" role="status">
     {error?<><Icon name="alert" size={28} className="text-destructive"/><h1 className="text-xl font-semibold">Ish joyini ochib bo‘lmadi</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={init}>Qayta urinish</Button></>
     :<><div className="flex w-full flex-col gap-3" aria-hidden="true"><Skeleton className="h-5 w-3/5"/><Skeleton className="h-4 w-full"/><Skeleton className="h-24 w-full"/><Skeleton className="h-4 w-2/5"/></div><p className="text-sm text-muted-foreground">Ish joyingiz tayyorlanmoqda…</p></>}
    </div>}
   </div>
   <p className="text-center text-xs text-muted-foreground">Hisobkor.uz · Shaxsiy ish joyingiz.</p>
  </main>
  <aside className="flex flex-col justify-center gap-8 border-l bg-muted p-10 max-lg:hidden xl:p-16">
   <div className="flex max-w-md flex-col gap-4">
    <p className="text-sm font-medium text-primary">Buxgalterning ish joyi</p>
    <h2 className="text-4xl font-semibold tracking-tight text-balance">Hujjatlar tartibda. Ishingiz nazoratda.</h2>
    <p className="text-pretty text-muted-foreground">Har bir kompaniya uchun hujjatlar, tekshiruvlar va qarorlar bitta joyda.</p>
   </div>
   <ol role="list" className="flex max-w-md flex-col gap-5">
    {[['Hisobingizni yarating','Login va parol bilan boshlang.'],['Kompaniyangizni qo‘shing','Har bir tashkilot alohida yuritiladi.'],['Hujjatlar bilan ishlang','Yuklang, solishtiring va qaror bering.']].map(([title,text],i)=><li key={title} className="flex gap-4">
     <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-medium tabular-nums">{i+1}</span>
     <div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div>
    </li>)}
   </ol>
  </aside>
 </div>
}
export class ErrorBoundary extends React.Component<any,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-xl font-semibold">Sahifani ochishda xatolik</h1><p className="text-sm text-muted-foreground">Saqlangan ma’lumotlarni qayta yuklash uchun sahifani yangilang.</p><Button onClick={()=>location.reload()}>Sahifani yangilash</Button></div>:this.props.children}
}
