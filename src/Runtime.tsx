import React,{useEffect,useState} from 'react';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {Icon} from './Icon';
import {openWorkspace,request} from './storage';
export function Runtime({children}:any){
 const [session,setSession]=useState<any>(null),[state,setState]=useState<any>(undefined),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function init(){setError('');try{const s=await(await request('/api/session')).json();setSession(s);if(s.authenticated||s.mode==='local')setState(await openWorkspace(s.storage));}catch(e:any){setError(e.message)}}
 useEffect(()=>{void init()},[]);
 async function login(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');try{await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});await init()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function logout(){await request('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.reload()}
 if(state!==undefined)return children({initial:state,session,logout});
 return <div className="session-screen"><a className="brand" href="/"><img src="/brand-h.png" alt=""/><strong>hisobkor<span>.uz</span></strong></a>{session&&!session.authenticated&&session.mode==='production'?<section className="login-panel"><span className="login-icon"><Icon name="shield" size={26}/></span><h1>Ish joyingizga kiring</h1><p>Kompaniyalaringiz va hujjatlaringiz bir joyda.</p><form onSubmit={login}><label>Foydalanuvchi nomi<Input name="username" autoComplete="username" required autoFocus maxLength={128}/></label><label>Parol<Input type="password" name="password" autoComplete="current-password" required maxLength={1024}/></label>{error&&<p className="form-error" role="alert">{error}</p>}<Button className="full-width" disabled={busy} type="submit">{busy?'Kirilmoqda…':'Kirish'}<Icon name="arrow"/></Button></form><p className="login-footnote">Hisobingiz ma’lumotlarini administrator beradi.</p></section>:<div className="loading-panel" role="status">{error?<><Icon name="alert" size={28}/><h1>Ish joyini ochib bo‘lmadi</h1><p>{error}</p><Button onClick={init}>Qayta urinish</Button></>:<><div className="loading-skeleton"/><p>Ish joyingiz tayyorlanmoqda…</p></>}</div>}<p className="session-footer">Hisobkor.uz · Buxgalteriya, tartib bilan.</p></div>
}
export class ErrorBoundary extends React.Component<any,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="session-screen"><h1>Sahifani ochishda xatolik</h1><p>Saqlangan ma’lumotlarni qayta yuklash uchun sahifani yangilang.</p><Button onClick={()=>location.reload()}>Sahifani yangilash</Button></div>:this.props.children}
}
