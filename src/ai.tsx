import {Card,CardHeader,CardTitle,CardDescription,CardAction,CardContent} from './components/ui/card';
import {Alert,AlertTitle,AlertDescription} from './components/ui/alert';
import {Badge as UiBadge} from './components/ui/badge';
import {Separator} from './components/ui/separator';
import {Spinner} from './components/ui/spinner';
import {toneClasses} from './components/app/StatusBadge';
import {cn} from './lib/utils';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import React,{useEffect,useRef,useState} from 'react';
import {Button} from './components/ui/button';
import {Icon} from './Icon';
import {AiConsent} from './components/app/AiConsent';
import {getFile} from './storage';
import {eligible,version,validAnalysis,reviewFindings,issueTone} from './ai-domain.mjs';

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

export function useAI({docs,setDocs,companies,onEvent,auto,setAuto,enabled,canAnalyze}:any){
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
  if(!auto){setNotice('AI tahliliga ruxsat o‘chirilgan. Uni yoqsangiz, hujjatlar tekshiriladi.');return;}
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
 return {connection,running,notice,check,ready:canAnalyze?.()!==false,consent:!!auto,setConsent:(v:boolean)=>{setNotice('');setAuto?.(v)}};
}

const kinds:any={invoice:'Schyot-faktura',contract:'Shartnoma',bank_statement:'Bank ko‘chirmasi',act:'Dalolatnoma',other:'Boshqa hujjat'};

/** One vocabulary for AI findings: red = values disagree, amber = check by hand, blue = context. */
const tones:any={
 conflict:{label:'Ziddiyat',icon:'alert',box:'border-danger/25 bg-danger/10/60',bar:'bg-danger/100',text:'text-danger'},
 warning:{label:'Tekshiring',icon:'help',box:'border-warning/40 bg-warning/10/60',bar:'bg-warning/100',text:'text-warning'},
 info:{label:'Ma’lumot',icon:'check',box:'border-border bg-muted/40',bar:'bg-accent0',text:'text-accent-foreground'},
};

export function AIBadge({doc}:any){
 if(!eligible(doc))return null;const status=doc.ai?.status;
 const ready=status==='complete'&&validAnalysis(doc);
 const issues=ready?doc.ai.result.issues:[];
 const conflict=issues.some((x:any)=>issueTone(x)==='conflict');
 const state=ready?(conflict?'conflict':issues.length?'issues':'clear'):status==='processing'||status==='queued'?'pending':status==='error'?'error':'idle';
 const text={conflict:'Ziddiyat topildi',issues:'Izohlar bor',clear:'Izohsiz',pending:status==='queued'?'Navbatda':'Tekshirilmoqda…',error:'Tekshiruv xatosi',idle:'Tekshirilmagan'}[state];
 const tone={conflict:toneClasses.conflict,issues:toneClasses.warning,clear:toneClasses.success,pending:toneClasses.info,error:toneClasses.issue,idle:toneClasses.neutral}[state];
 if(state==='idle')return <span className="text-sm text-muted-foreground" data-ai={state}>{text}</span>;
 return <UiBadge variant="outline" className={tone} data-ai={state}>{state==='pending'?<Spinner/>:<Icon name={state==='conflict'||state==='error'?'alert':state==='clear'?'check':'spark'}/>}{text}</UiBadge>;
}

export function AIBar({ai,docs}:any){
 const files=docs.filter(eligible),done=files.filter(validAnalysis).length,pending=files.filter((d:any)=>['queued','processing'].includes(d.ai?.status)).length;
 return <Card className="gap-4 py-4" aria-label="Avtomatik hujjat tekshiruvi">
  <CardHeader className="px-4">
   <CardTitle className="flex items-center gap-2 text-base"><Icon name="spark" className="text-primary"/>Avtomatik tekshiruv</CardTitle>
   <CardDescription>{ai.connection.loading?'Holat tekshirilmoqda…':ai.connection.connected?pending?`${pending} ta hujjat tekshirilmoqda · ${done} ta tayyor`:`${done} / ${files.length} hujjat tekshirilgan`:'Xizmat hozir mavjud emas; hujjatlarni qo‘lda tekshiring'}</CardDescription>
   {ai.connection.connected&&ai.consent&&<CardAction><Button variant="outline" size="sm" disabled={!ai.ready||ai.running||!files.some((d:any)=>!validAnalysis(d)&&!['queued','processing'].includes(d.ai?.status))} onClick={()=>ai.check(files.filter((d:any)=>!validAnalysis(d)))}>{ai.running?<Spinner/>:<Icon name="spark"/>}{ai.running?'Tekshirilmoqda…':'Tekshirishni boshlash'}</Button></CardAction>}
  </CardHeader>
  {(ai.notice||ai.connection.connected||(!ai.connection.loading&&!ai.connection.connected))&&<CardContent className="flex flex-col gap-3 px-4">
   {ai.connection.connected&&<AiConsent checked={ai.consent} onCheckedChange={ai.setConsent} onHint="Yangi hujjatlar yuklanishi bilan avtomatik tekshiriladi."/>}
   {ai.notice&&<p className="text-sm text-muted-foreground" role="status">{ai.notice}</p>}
   {!ai.connection.loading&&!ai.connection.connected&&<Alert><Icon name="alert"/><AlertDescription>Avtomatik tekshiruv hozir ishlamayapti. Hujjatlarni odatdagidek qo‘lda tekshirib, qaror berishingiz mumkin.</AlertDescription></Alert>}
  </CardContent>}
 </Card>;
}

/** One finding: coloured rail, a tone chip, the claim, the quoted evidence, then the next step. */
function Finding({tone,title,detail,evidence,action,children}:any){
 const t=tones[tone]||tones.warning;
 return <li className={cn('relative overflow-hidden rounded-lg border py-3 pr-3 pl-4',t.box)}>
  <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1',t.bar)}/>
  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
   <h4 className="min-w-0 flex-1 text-sm font-semibold text-balance [overflow-wrap:anywhere]">{title}</h4>
   <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-medium',t.text)}><Icon name={t.icon} size={14}/>{t.label}</span>
  </div>
  <p className="mt-1 text-sm text-pretty text-foreground/80 [overflow-wrap:anywhere]">{detail}</p>
  {evidence&&<blockquote className="mt-2 border-l-2 border-foreground/15 pl-3 text-sm text-muted-foreground italic [overflow-wrap:anywhere]">{evidence}</blockquote>}
  {action&&<p className="mt-2 flex items-start gap-2 rounded-md bg-background/80 px-2.5 py-2 text-sm [overflow-wrap:anywhere]"><Icon name="arrow" size={14} className="mt-0.5 shrink-0 text-primary"/><span><span className="font-medium">Keyingi qadam: </span>{action}</span></p>}
  {children}
 </li>;
}

export function AIReview({doc,docs,company,ai,onRelated}:any){
 if(!eligible(doc))return null;
 const ready=validAnalysis(doc),r=ready?doc.ai.result:null,pending=['queued','processing'].includes(doc.ai?.status);
 const {issues,notes,counts}=reviewFindings(doc,docs,company);
 const fields=r?[['Hujjat raqami',r.number],['Hujjat sanasi',r.date],['Shartnoma havolasi',r.contractNumber],['Shartnoma sanasi',r.contractDate],['Sotuvchi STIRi',r.sellerTaxId],['Xaridor STIRi',r.buyerTaxId],['Jami summa',r.total===null?null:`${r.total.toLocaleString('uz-UZ')} ${r.currency||''}`]]:[];
 return <section className="flex flex-col gap-4" aria-label="Avtomatik xulosa">
  <div className="flex flex-wrap items-center gap-2">
   <h3 className="flex items-center gap-2 text-base font-semibold"><Icon name="spark" className="text-primary"/>Avtomatik xulosa</h3>
   {r&&<UiBadge variant="secondary">{kinds[r.kind]}</UiBadge>}
   {r&&<span className="ml-auto flex flex-wrap items-center gap-1.5">
    {counts.conflict>0&&<UiBadge variant="outline" className={toneClasses.conflict}><Icon name="alert"/>{counts.conflict} ta ziddiyat</UiBadge>}
    {counts.warning>0&&<UiBadge variant="outline" className={toneClasses.warning}><Icon name="help"/>{counts.warning} ta tekshirish</UiBadge>}
    {!counts.conflict&&!counts.warning&&<UiBadge variant="outline" className={toneClasses.success}><Icon name="check"/>Izohsiz</UiBadge>}
   </span>}
  </div>
  {r?<>
   <p className="text-sm text-pretty text-muted-foreground [overflow-wrap:anywhere]">{r.summary}</p>

   {issues.length>0?<div className="flex flex-col gap-2">
    <h4 className="text-sm font-medium">Hujjat ichidagi izohlar</h4>
    <ul role="list" className="flex flex-col gap-2">{issues.map((issue:any,i:number)=><Finding key={i} {...issue}/>)}</ul>
   </div>:<Alert className={toneClasses.success}><Icon name="check"/><AlertTitle>Alohida izoh topilmadi</AlertTitle><AlertDescription className="text-success">O‘qilgan qismda ziddiyat yoki yetishmayotgan rekvizit ko‘rinmadi.</AlertDescription></Alert>}

   {notes.length>0&&<div className="flex flex-col gap-2">
    <h4 className="text-sm font-medium">Kompaniya va shartnoma bilan solishtirish</h4>
    <ul role="list" className="flex flex-col gap-2">{notes.map((n:any,i:number)=><Finding key={i} tone={n.tone} title={n.title} detail={n.detail}>
     {n.relatedId&&<Button variant="outline" size="sm" className="mt-2" onClick={()=>onRelated(docs.find((d:any)=>d.id===n.relatedId))}>Shartnomani ochish<Icon name="arrow"/></Button>}
    </Finding>)}</ul>
   </div>}

   <Collapsible className="rounded-lg border">
    <CollapsibleTrigger asChild><Button variant="ghost" className="group/trigger w-full justify-between rounded-lg px-3">Ajratilgan rekvizitlar va manba<Icon name="down" className="text-muted-foreground transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger>
    <CollapsibleContent className="border-t px-3 py-3">
     <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">{fields.map(([k,v])=><React.Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className={cn('text-right font-medium tabular-nums [overflow-wrap:anywhere]',!v&&'font-normal text-muted-foreground')}>{v||'Aniqlanmadi'}</dd></React.Fragment>)}</dl>
     <blockquote className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground italic [overflow-wrap:anywhere]">{r.evidence||'Manba parchasi aniqlanmadi.'}</blockquote>
    </CollapsibleContent>
   </Collapsible>

   {r.limitations.length>0&&<Collapsible className="rounded-lg border">
    <CollapsibleTrigger asChild><Button variant="ghost" className="group/trigger w-full justify-between rounded-lg px-3">Tahlil chegaralari<span className="ml-auto text-muted-foreground tabular-nums">{r.limitations.length}</span><Icon name="down" className="text-muted-foreground transition-transform group-data-[state=open]/trigger:rotate-180"/></Button></CollapsibleTrigger>
    <CollapsibleContent className="border-t px-3 py-3"><ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">{r.limitations.map((x:string,i:number)=><li key={i} className="[overflow-wrap:anywhere]">{x}</li>)}</ul></CollapsibleContent>
   </Collapsible>}
  </>:<Alert role="status" className={doc.ai?.status==='error'?toneClasses.issue:undefined}>{pending?<Spinner/>:<Icon name={doc.ai?.status==='error'?'alert':'spark'}/>}<AlertDescription className={doc.ai?.status==='error'?'text-danger':undefined}>{doc.ai?.status==='error'?doc.ai.error:pending?(ai.connection.background?'Tekshiruv fonda davom etmoqda. Bu oynani yopishingiz mumkin.':'Tekshiruv davom etmoqda. Jarayon tugaguncha sahifani ochiq qoldiring.'):'Hujjat hali avtomatik tekshirilmagan.'}</AlertDescription></Alert>}

  <div className="flex flex-col gap-2">
   {ai.connection.connected&&!ai.consent?<AiConsent checked={false} onCheckedChange={ai.setConsent}/>:<Button variant="outline" className="w-full" disabled={!ai.ready||pending||ai.running||!ai.connection.connected} onClick={()=>ai.check([doc],!!r||doc.ai?.status==='error')}>{pending?<Spinner/>:<Icon name="spark"/>}{pending?'Tekshirilmoqda…':r?'Qayta tekshirish':ai.connection.connected?'Tekshirish':'Tekshiruv mavjud emas'}</Button>}
   <p className="text-xs text-pretty text-muted-foreground">Avtomatik xulosa yordamchi tavsiya. Yakuniy qarorni buxgalter beradi.{r&&<> Tekshirilgan: {new Date(r.checkedAt).toLocaleString('uz-UZ')} · {r.model}</>}</p>
  </div>
  <Separator/>
 </section>;
}
