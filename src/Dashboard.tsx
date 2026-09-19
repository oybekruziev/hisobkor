import {StatStrip} from './components/StatStrip';
import {SearchField} from './components/SearchField';
import React,{useMemo,useState} from 'react';
import {ArrowRight,Building2,CheckCheck,ChevronDown,FileCheck2,FileText,FolderOpen,Search,ShieldCheck,Sparkles,TriangleAlert,Clock3,Plus} from 'lucide-react';
import {PageHeader} from './components/PageHeader';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from './components/ui/table';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from './components/ui/card';
import {Badge} from './components/ui/badge';
import {Button} from './components/ui/button';
import {Input} from './components/ui/input';
import {NativeSelect,NativeSelectOption} from './components/ui/native-select';
import {Progress} from './components/ui/progress';
import {Alert,AlertDescription} from './components/ui/alert';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription,EmptyContent} from './components/ui/empty';
import {dashboardRows,comparisonPair} from './dashboard-model.mjs';
import {currentPeriod,formatPeriod,documentName} from './format.mjs';

const stateLabels={empty:'Hujjat yo‘q',waiting:'Hujjat kutilmoqda',ready:'Qabul qilingan',review:'Tekshirish kerak'};
const money=(r:any)=>typeof r?.total==='number'?`${new Intl.NumberFormat('uz-UZ').format(r.total)} ${r.currency||''}`:'Aniqlanmagan';
const date=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('.'):value||'Aniqlanmagan';

function EvidenceCard({doc,contract=false,mismatch=false,onOpen}:any){
 const result=doc?.ai.result;
 const title=contract?'Bog‘langan shartnoma':result?.kind==='invoice'?'Hisob-faktura':'Hujjat rekvizitlari';
 const fields=result?[
  ['Hujjat raqami',result.number||'Aniqlanmagan',false],
  ['Hujjat sanasi',date(result.date),contract&&mismatch],
  ['Sotuvchi STIRi',result.sellerTaxId||'Aniqlanmagan',false],
  ['Xaridor STIRi',result.buyerTaxId||'Aniqlanmagan',false],
  ...(!contract&&result.kind==='invoice'?[['Shartnoma havolasi',[result.contractNumber,date(result.contractDate)].filter(Boolean).join(' · '),mismatch]]:[]),
  ['Jami summa',money(result),false],
 ]:[];
 return <Card className="evidence-card">
  <CardHeader><CardTitle><FileText aria-hidden="true"/><h3>{title}</h3></CardTitle><Badge variant="secondary">{doc?'AI o‘qigan':'Kutilmoqda'}</Badge></CardHeader>
  <CardContent>{doc?<><p className="evidence-filename">{documentName(doc)}</p><dl>{fields.map(([label,value,highlight])=><div key={String(label)} data-highlight={highlight||undefined}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>:<Empty><EmptyHeader><EmptyMedia variant="icon"><FolderOpen/></EmptyMedia><EmptyTitle>{contract?'Bog‘langan shartnoma topilmadi':'Tekshiruv natijasi hali yo‘q'}</EmptyTitle><EmptyDescription>{contract?'Aniq raqam bilan mos kelgan va tekshirilgan shartnoma shu yerda ko‘rinadi.':'Hujjat yuklang. Avtomatik tekshiruv tugagach rekvizitlar ko‘rinadi.'}</EmptyDescription></EmptyHeader></Empty>}</CardContent>
  {doc&&<CardFooter><span>{doc.fileName?.split('.').pop()?.toUpperCase()} · {doc.size||'Fayl'}</span><Button variant="ghost" size="sm" onClick={()=>onOpen(doc)}>Hujjatlar bo‘limi<ArrowRight data-icon="inline-end"/></Button></CardFooter>}
 </Card>;
}

function Comparison({row,onCompany}:any){
 const [selected,setSelected]=useState('');
 const {primary,contract,dateMismatch}=comparisonPair(row,selected);
 const notes=primary?row.notes.filter((n:any)=>n.documentId===primary.id):[];
 const openDoc=(doc:any)=>onCompany(row.company.id,doc.scope==='permanent'?'archive':'documents');
 return <section className="comparison-panel" aria-label={`${row.company.name} hujjatlarini solishtirish`}>
  <header className="comparison-header"><h2><Sparkles aria-hidden="true"/>Hujjatlarni solishtirish</h2><div className="comparison-header-actions">{row.analyzed.length>1&&<NativeSelect name="comparisonDocument" aria-label="Solishtiriladigan hujjat" value={primary?.id||''} onChange={e=>setSelected(e.target.value)}>{row.analyzed.map((d:any)=><NativeSelectOption key={d.id} value={d.id}>{documentName(d)}</NativeSelectOption>)}</NativeSelect>}<Badge variant="outline">{row.analyzed.length}/{row.uploaded.length} tekshirilgan</Badge></div></header>
  <div className="evidence-grid"><EvidenceCard doc={primary} mismatch={dateMismatch} onOpen={openDoc}/><EvidenceCard doc={contract} contract mismatch={dateMismatch} onOpen={openDoc}/></div>
  {primary&&<div className="comparison-summary"><strong>AI xulosasi</strong><p>{primary.ai.result.summary}</p></div>}
  {notes.length>0&&<div className="comparison-notes">{notes.slice(0,3).map((note:any,index:number)=><Alert key={index} className="review-note" data-tone="warning"><TriangleAlert aria-hidden="true"/><AlertDescription><strong>{note.title}</strong><p>{note.detail}</p>{note.action&&<p><b>Tavsiya:</b> {note.action}</p>}</AlertDescription></Alert>)}{notes.length>3&&<p>Yana {notes.length-3} ta izoh hujjat ichida mavjud.</p>}</div>}
  <footer className="comparison-footer"><p><ShieldCheck aria-hidden="true"/>AI xulosasi yordamchi. Yakuniy qarorni buxgalter beradi.</p><Button variant="outline" onClick={()=>onCompany(row.company.id,primary?.scope==='permanent'?'archive':'documents')}>Hujjatlarni ko‘rish<ArrowRight data-icon="inline-end"/></Button></footer>
 </section>;
}

export function Dashboard({companies,docs,onCompany,onAdd}:any){
 const [period,setPeriod]=useState(currentPeriod());
 const [query,setQuery]=useState('');
 const [expanded,setExpanded]=useState<string|null|undefined>();
 const rows=useMemo(()=>dashboardRows(companies,docs,period),[companies,docs,period]);
 const visible=rows.filter((r:any)=>`${r.company.name} ${r.company.stir||''}`.toLowerCase().includes(query.toLowerCase()));
 const active=expanded===undefined?rows.find((r:any)=>r.analyzed.length)?.company.id:expanded;
 const totals=rows.reduce((s:any,r:any)=>({uploaded:s.uploaded+r.uploaded.length,total:s.total+r.total,notes:s.notes+r.notes.length,analyzed:s.analyzed+r.analyzed.length}),{uploaded:0,total:0,notes:0,analyzed:0});
 const percent=totals.total?Math.round(totals.uploaded/totals.total*100):null;
 const metrics=[
  {label:'Hujjatlar to‘plami',value:percent===null?'—':`${percent}%`,hint:`${totals.uploaded} / ${totals.total} ta yuklangan`,icon:FileCheck2,tone:'success'},
  {label:'AI tekshiruvi',value:`${totals.notes} ta izoh`,hint:`${totals.analyzed} ta hujjat tekshirilgan`,icon:Sparkles,tone:totals.notes?'warning':'info'},
  {label:'Kompaniyalar',value:`${companies.length} ta`,hint:formatPeriod(period),icon:Building2,tone:'info'},
 ];
 return <div className="control-dashboard">
  <PageHeader title="Umumiy ko‘rinish" description="Kompaniyalar, hujjatlar va tekshiruvlar — bir joyda." actions={<><Input name="period" type="month" className="period-input" aria-label="Dashboard davri" value={period} min="2000-01" max="2100-12" onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){setPeriod(e.target.value);setExpanded(undefined)}}}/><Button onClick={onAdd}><Plus data-icon="inline-start"/>Kompaniya qo‘shish</Button></>}/>
  <Card className="control-board">
   <StatStrip items={metrics} className="dashboard-metrics"/>
   <div className="control-toolbar"><SearchField aria-label="Dashboard kompaniyalarini qidirish" placeholder="Kompaniya nomi yoki STIR" value={query} onChange={e=>setQuery(e.target.value)}/><p>Tanlangan oy va doimiy hujjatlar</p></div>
   {visible.length?<div className="control-table"><Table><TableHeader><TableRow><TableHead>Kompaniya / STIR</TableHead> <TableHead>Davr</TableHead><TableHead>Yuklangan</TableHead><TableHead>AI tekshiruvi holati</TableHead><TableHead>Holat</TableHead><TableHead>Amallar</TableHead></TableRow></TableHeader><TableBody>{visible.map((row:any)=>{
    const tone=row.notes.length?'warning':row.state==='ready'?'success':'info';
    const open=active===row.company.id;
    const id=`comparison-${row.company.id}`;
    return <React.Fragment key={row.company.id}><TableRow className="control-company-row" data-open={open||undefined}>
     <TableCell><div className="control-company-name"><span className="status-dot" data-tone={tone}/><strong>{row.company.name} {row.company.legal||''}</strong></div><span className="control-tax">STIR: {row.company.stir||'Kiritilmagan'}</span></TableCell>
     <TableCell className="control-period">{formatPeriod(period)}</TableCell>
     <TableCell><div className="control-progress" data-tone={row.state==='ready'?'success':'info'}><Progress value={row.received??0} aria-label={`${row.company.name}: ${row.uploaded.length} / ${row.total} ta hujjat yuklangan`}/><span>{row.uploaded.length}/{row.total}</span></div></TableCell>
     <TableCell><div className="control-ai-status" data-tone={tone}>{row.notes.length?<TriangleAlert aria-hidden="true"/>:row.analyzed.length?<CheckCheck aria-hidden="true"/>:<Clock3 aria-hidden="true"/>}<span>{row.notes.length?`${row.notes.length} ta izoh · ${row.notes[0].title}`:row.analyzed.length?`${row.analyzed.length} ta tekshirilgan · izoh topilmadi`:row.uploaded.length?'Tekshiruv natijasi kutilmoqda':'Hujjat yuklanishini kutmoqda'}</span></div></TableCell>
     <TableCell><Badge variant="outline" className="control-state" data-tone={row.state==='ready'?'success':row.state==='review'?'warning':'info'}><span className="status-dot"/>{stateLabels[row.state]}</Badge></TableCell>
     <TableCell><div className="control-row-actions"><Button variant={open?'secondary':'outline'} size="sm" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setExpanded(open?null:row.company.id)}>{open?'Yopish':'Solishtirish'}<ChevronDown data-icon="inline-end" className={open?'rotate-180':undefined}/></Button><Button variant="ghost" size="icon" aria-label={`${row.company.name} kompaniyasini ochish`} onClick={()=>onCompany(row.company.id)}><ArrowRight/></Button></div></TableCell>
    </TableRow>{open&&<TableRow className="control-detail-row"><TableCell colSpan={6} id={id}><Comparison key={row.company.id} row={row} onCompany={onCompany}/></TableCell></TableRow>}</React.Fragment>;
   })}</TableBody></Table></div>:<Empty><EmptyHeader><EmptyMedia variant="icon"><Building2/></EmptyMedia><EmptyTitle>{companies.length?'Kompaniya topilmadi':'Birinchi kompaniyangizni qo‘shing'}</EmptyTitle><EmptyDescription>{companies.length?'Boshqa nom yoki STIR bilan qidiring.':'Kompaniyalar va hujjatlar holati shu yerda ko‘rinadi.'}</EmptyDescription></EmptyHeader>{!companies.length&&<EmptyContent><Button variant="outline" onClick={onAdd}><Plus data-icon="inline-start"/>Kompaniya qo‘shish</Button></EmptyContent>}</Empty>}
   <CardFooter className="control-board-footer"><span><ShieldCheck aria-hidden="true"/>Har bir kompaniyaning hujjatlari alohida yuritiladi.</span><span>{companies.length} ta kompaniya · {totals.uploaded} ta hujjat</span></CardFooter>
  </Card>
 </div>;
}
