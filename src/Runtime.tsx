import {Brand} from './components/Brand';
import {Skeleton} from './components/ui/skeleton';
import {Alert} from './components/ui/alert';
import {Label} from './components/ui/label';
import {Card} from './components/ui/card';
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
 return <div className="auth-layout session-screen isolate antialiased">
  <aside className="auth-intro">
   <Brand href="https://hisobkor.uz"/>
   <div className="auth-story"><p className="section-kicker">Buxgalterning ish joyi</p><h2>Hujjatlar tartibda.<br/>Ishingiz nazoratda.</h2><p>Har bir kompaniya uchun hujjatlar, tekshiruvlar va qarorlar bitta joyda.</p>
   <ol className="auth-steps" role="list"><li><span>01</span><div><strong>Hisobingizni yarating</strong><p>Login va parol bilan boshlang.</p></div></li><li><span>02</span><div><strong>Kompaniyangizni qo‘shing</strong><p>Har bir tashkilot alohida yuritiladi.</p></div></li><li><span>03</span><div><strong>Hujjatlar bilan ishlang</strong><p>Yuklang, solishtiring va qaror bering.</p></div></li></ol></div>
   <p className="auth-brand-note">Hisobkor.uz · Buxgalteriya, tartib bilan.</p>
  </aside>
  <main className="auth-main"><Brand href="https://hisobkor.uz" className="auth-mobile-brand"/>
  {session&&!session.authenticated&&session.mode==='production'?<Card className="login-panel" aria-labelledby="auth-heading">
   <p className="auth-eyebrow">{registering?"Hisobkor’ga xush kelibsiz":"Yana xush kelibsiz"}</p>
   <h1 id="auth-heading">{registering?'Hisob yarating':'Ish joyingizga kiring'}</h1>
   <p>{registering?'Login va parol tanlang. Keyin buxgalter ma’lumotlaringizni to‘ldirasiz.':'Kompaniyalaringiz va hujjatlaringiz bir joyda.'}</p>
   <form key={registering?'register':'login'} onSubmit={submit} aria-busy={busy}>
    <Label>Foydalanuvchi nomi<Input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus minLength={registering?3:undefined} maxLength={registering?40:128} pattern={registering?'[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}':undefined} placeholder={registering?'Masalan, oybek_uz':undefined} aria-describedby={registering?'username-hint':undefined}/></Label>
    {registering&&<p id="username-hint" className="auth-hint">3–40 belgi: lotin harflari, raqam, nuqta, chiziqcha yoki pastki chiziq.</p>}
    <Label>Parol<Input type="password" name="password" autoComplete={registering?'new-password':'current-password'} required minLength={registering?12:undefined} maxLength={registering?128:1024} aria-describedby={registering?'password-hint':undefined}/></Label>
    {registering&&<><p id="password-hint" className="auth-hint">Kamida 12 belgi. Bir necha so‘zdan iborat uzun parol tanlashingiz mumkin.</p><Label>Parolni takrorlang<Input type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={128}/></Label></>}
    {error&&<Alert className="form-error" role="alert">{error}</Alert>}
    <Button className="full-width" disabled={busy} type="submit">{busy?(registering?'Hisob yaratilmoqda…':'Kirilmoqda…'):(registering?'Hisob yaratish':'Kirish')}<Icon name="arrow"/></Button>
   </form>
   <div className="auth-switch"><span>{registering?'Hisobingiz bormi?':'Hali hisobingiz yo‘qmi?'}</span><Button type="button" variant="link" disabled={busy} onClick={switchMode}>{registering?'Kirish':'Hisob yaratish'}</Button></div>
  </Card>:<div className="loading-panel" role="status">{error?<><Icon name="alert" size={28}/><h1>Ish joyini ochib bo‘lmadi</h1><p>{error}</p><Button onClick={init}>Qayta urinish</Button></>:<><div className="loading-skeleton-stack" aria-hidden="true"><Skeleton className="loading-line title"/><Skeleton className="loading-line"/><Skeleton className="loading-block"/><Skeleton className="loading-line short"/></div><p>Ish joyingiz tayyorlanmoqda…</p></>}</div>}
  <p className="session-footer">Shaxsiy ish joyingiz.</p>
 </main></div>
}
export class ErrorBoundary extends React.Component<any,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="session-screen"><h1>Sahifani ochishda xatolik</h1><p>Saqlangan ma’lumotlarni qayta yuklash uchun sahifani yangilang.</p><Button onClick={()=>location.reload()}>Sahifani yangilash</Button></div>:this.props.children}
}
