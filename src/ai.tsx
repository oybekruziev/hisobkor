import {Card} from './components/ui/card';
import {Badge as UiBadge} from './components/ui/badge';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import React,{useEffect,useRef,useState} from 'react';
import {Button} from './components/ui/button';
import {Icon} from './Icon';
import {getFile} from './storage';
import {eligible,version,validAnalysis,compareDocument} from './ai-domain.mjs';

async function api(path:string,body?:any){
 const response=await fetch('/api/ai/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Mezon-Request':'1'},body:JSON.stringify(body)});
 let data;try{data=await response.json()}catch{throw Error('Avtomatik tekshiruv xizmati bilan bog‘lanib bo‘lmadi.')}
 if(!response.ok){const error:any=Error(data.error||'Avtomatik tekshiruv bajarilmadi.');error.status=response.status;throw error;}return data;
}
function base64(file:Blob){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Faylni o‘qib bo‘lmadi.'));r.readAsDataURL(file)})}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export function recoverAnalysis(d:any){
 if(!['queued','processing'].includes(d.ai?.status))return d;
 return d.ai?.jobId?d:{...d,ai:{...d.ai,status:'error',error:'Oldingi tekshiruv yakunlanmagan. Qayta tekshiring.'}};
}

export function useAI({docs,setDocs,companies,onEvent,auto,enabled,canAnalyze}:any){
 const [connection,setConnection]=useState<any>({connected:false,managed:true,background:false,loading:true});
 const [running,setRunning]=useState(false),[notice,setNotice]=useState('');
 const scheduled=useRef(new Set<string>()),locked=useRef(false),queue=useRef<any[]>([]),mounted=useRef(true);
 const latest=useRef({docs,companies,onEvent});latest.current={docs,companies,onEvent};
 useEffect(()=>()=>{mounted.current=false;queue.current=[];scheduled.current.clear()},[]);
 useEffect(()=>{api('status').then(value=>{if(mounted.current)setConnection({...value,loading:false})}).catch(()=>{if(mounted.current)setConnection({connected:false,managed:true,background:false,loading:false})})},[]);
 const current=(d:any)=>mounted.current&&latest.current.docs.some((x:any)=>x.id===d.id&&version(x)===version(d));
 const update=(d:any,ai:any)=>{if(!mounted.current)return;setDocs((all:any[])=>{let changed=false;const nextAI={...ai,fileKey:version(d)};const next=all.map(x=>{if(x.id!==d.id||version(x)!==version(d))return x;const previous=x.ai||{},keys=new Set([...Object.keys(previous),...Object.keys(nextAI)]);if([...keys].every(key=>previous[key]===nextAI[key]))return x;changed=true;return {...x,ai:nextAI};});return changed?next:all;});};
 async function poll(d:any,jobId:string,status='queued'){
  update(d,{status,jobId});
  for(;;){
    await delay(1500);if(!current(d))return;
    let job:any;try{job=await api(`jobs/${encodeURIComponent(jobId)}`)}catch(error:any){
     if(error.status>=400&&error.status<500){error.terminal=true;throw error;}
     await delay(3000);if(!current(d))return;continue;
    }
    if(job.status==='complete'){update(d,{status:'complete',jobId,result:job.result});return;}
    if(job.status==='error'){const error:any=Error(job.error||'Avtomatik tekshiruv bajarilmadi.');error.terminal=true;throw error;}
    update(d,{status:job.status==='processing'?'processing':'queued',jobId});
   }
 }
 async function run(d:any,force=false){
  if(connection.background){
   if(d.ai?.jobId&&['queued','processing'].includes(d.ai.status))return poll(d,d.ai.jobId,d.ai.status);
   const job=await api('analyze',{documentId:d.id,fileKey:version(d),...(force?{force:true}:{})});return poll(d,job.jobId,job.status);
  }
  update(d,{status:'processing'});const file=await getFile(version(d),d.fileName);
  if(!file)throw Error('Asl fayl topilmadi. Uni qayta yuklang.');
  const {result}=await api('analyze',{file:{name:d.fileName,base64:await base64(file)}});update(d,{status:'complete',result});
 }
 async function drain(){
  if(locked.current)return;locked.current=true;setRunning(true);
  try{while(queue.current.length){
   const item=queue.current.shift(),d=item.doc,key=d.id+':'+version(d);
   if(!current(d)){scheduled.current.delete(key);continue;}
   try{await run(d,item.force);if(current(d)){const c=latest.current.companies.find((c:any)=>c.id===d.company);if(c)latest.current.onEvent('Hujjat avtomatik tekshirildi',c,d.title,'spark');}}
   catch(e:any){if(current(d))update(d,{status:'error',jobId:e.terminal?undefined:d.ai?.jobId,error:e.message||'Tekshiruv bajarilmadi.'});}
   finally{scheduled.current.delete(key);}
  }}finally{locked.current=false;if(mounted.current)setRunning(false);}
 }
 function check(items:any[],force=false){
  if(!connection.connected){setNotice('Avtomatik tekshiruv hozir mavjud emas. Hujjatni qo‘lda tekshirishingiz mumkin.');return;}
  if(!canAnalyze?.()){setNotice('Ma’lumotlar saqlanmoqda. Saqlash tugagach qayta urinib ko‘ring.');return;}
  setNotice('');
  for(const d of items.filter(eligible)){
   const key=d.id+':'+version(d);
   if((!force&&validAnalysis(d))||scheduled.current.has(key))continue;
   if(['queued','processing'].includes(d.ai?.status)&&!d.ai?.jobId)continue;
   scheduled.current.add(key);queue.current.push({doc:d,force});if(!d.ai?.jobId&&!connection.background)update(d,{status:'queued'});
  }
  void drain();
 }
 useEffect(()=>{
  if(!enabled||!connection.connected||!canAnalyze?.())return;
  const recovering=docs.filter((d:any)=>eligible(d)&&d.ai?.jobId&&['queued','processing'].includes(d.ai.status));
  const fresh=auto?docs.filter((d:any)=>eligible(d)&&!d.ai):[];check([...recovering,...fresh]);
 },[connection.connected,connection.background,enabled,auto,docs,canAnalyze]);
 return {connection,running,notice,check,ready:canAnalyze?.()!==false};
}

const kinds:any={invoice:'Schyot-faktura',contract:'Shartnoma',bank_statement:'Bank ko‘chirmasi',act:'Dalolatnoma',other:'Boshqa hujjat'};
export function AIBadge({doc}:any){
 if(!eligible(doc))return null;const status=doc.ai?.status;
 const text=status==='complete'&&validAnalysis(doc)?(doc.ai.result.issues.length?'Avto: izohlar bor':'Avto: tayyor'):status==='processing'?'Tekshirilmoqda…':status==='queued'?'Navbatda':status==='error'?'Tekshiruv xatosi':'Tekshirilmagan';
 const state=status==='complete'&&validAnalysis(doc)?(doc.ai.result.issues.length?'issues':'clear'):status==='processing'||status==='queued'?'pending':status==='error'?'error':'idle';
 return <UiBadge variant="outline" className="ai-badge" data-ai={state}>{state!=='idle'&&<Icon name="spark" size={14}/>}{text}</UiBadge>;
}
export function AIBar({ai,docs}:any){
 const files=docs.filter(eligible),done=files.filter(validAnalysis).length,pending=files.filter((d:any)=>['queued','processing'].includes(d.ai?.status)).length;
 return <Card className="ai-bar" aria-label="Avtomatik hujjat tekshiruvi"><div className="ai-bar-title"><span className="ai-mark"><Icon name="spark"/></span><div><strong>Avtomatik tekshiruv</strong><p>{ai.connection.loading?'Holat tekshirilmoqda…':ai.connection.connected?pending?`${pending} ta hujjat tekshirilmoqda · ${done} ta tayyor`:`${done} / ${files.length} hujjat tekshirilgan`:'Xizmat hozir mavjud emas; hujjatlarni qo‘lda tekshiring'}</p></div></div>{ai.connection.connected&&<div className="ai-bar-actions"><Button variant="outline" disabled={!ai.ready||ai.running||!files.some((d:any)=>!validAnalysis(d)&&!['queued','processing'].includes(d.ai?.status))} onClick={()=>ai.check(files.filter((d:any)=>!validAnalysis(d)))}><Icon name="spark"/>{ai.running?'Tekshirilmoqda…':'Tekshirishni boshlash'}</Button></div>}{ai.notice&&<p className="ai-notice" role="status">{ai.notice}</p>}</Card>;
}
export function AIReview({doc,docs,company,ai,onRelated}:any){
 if(!eligible(doc))return null;
 const ready=validAnalysis(doc),r=ready?doc.ai.result:null,notes=compareDocument(doc,docs,company),pending=['queued','processing'].includes(doc.ai?.status);
 return <Card className="ai-review"><h3><Icon name="spark"/>Avtomatik xulosa</h3>{r?<><UiBadge variant="outline" className="badge">{kinds[r.kind]}</UiBadge><p className="ai-summary">{r.summary}</p>{r.issues.map((issue:any,i:number)=><Card className="ai-note" key={i}><strong>{issue.title}</strong><p>{issue.detail}</p>{issue.evidence&&<blockquote>{issue.evidence}</blockquote>}<p><b>Keyingi qadam:</b> {issue.action}</p></Card>)}{!r.issues.length&&<p>O‘qilgan qismda alohida izoh topilmadi.</p>}{notes.length>0&&<div className="ai-comparison"><h4>Kompaniya va shartnoma bilan solishtirish</h4>{notes.map((n:any,i:number)=><Card className="ai-note" key={i}><strong>{n.title}</strong><p>{n.detail}</p>{n.relatedId&&<Button variant="outline" onClick={()=>onRelated(docs.find((d:any)=>d.id===n.relatedId))}>Shartnomani ochish<Icon name="arrow" size={16}/></Button>}</Card>)}</div>}<Collapsible className="ai-evidence"><CollapsibleTrigger asChild><Button variant="ghost">Ajratilgan rekvizitlar va manba<Icon name="down"/></Button></CollapsibleTrigger><CollapsibleContent><dl>{[['Hujjat raqami',r.number],['Hujjat sanasi',r.date],['Shartnoma havolasi',r.contractNumber],['Shartnoma sanasi',r.contractDate],['Sotuvchi STIRi',r.sellerTaxId],['Xaridor STIRi',r.buyerTaxId],['Jami summa',r.total===null?null:`${r.total} ${r.currency||''}`]].map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v||'Aniqlanmadi'}</dd></React.Fragment>)}</dl><blockquote>{r.evidence||'Manba parchasi aniqlanmadi.'}</blockquote></CollapsibleContent></Collapsible>{r.limitations.length>0&&<div className="ai-limitations">{r.limitations.map((x:string,i:number)=><p key={i}>{x}</p>)}</div>}<p className="ai-time">{new Date(r.checkedAt).toLocaleString('uz-UZ')} · {r.model}</p></>:<p role="status">{doc.ai?.status==='error'?doc.ai.error:pending?(ai.connection.background?'Tekshiruv fonda davom etmoqda. Bu oynani yopishingiz mumkin.':'Tekshiruv davom etmoqda. Jarayon tugaguncha sahifani ochiq qoldiring.'):'Hujjat hali avtomatik tekshirilmagan.'}</p>}<p className="ai-disclaimer">Avtomatik xulosa yordamchi tavsiya. Yakuniy qarorni buxgalter beradi.</p><Button variant="outline" className="full-width" disabled={!ai.ready||pending||ai.running||!ai.connection.connected} onClick={()=>ai.check([doc],!!r||doc.ai?.status==='error')}><Icon name="spark"/>{pending?'Tekshirilmoqda…':r?'Qayta tekshirish':ai.connection.connected?'Tekshirish':'Tekshiruv mavjud emas'}</Button></Card>;
}
