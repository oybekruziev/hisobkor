import {TableCell,TableBody,TableHead,TableRow,TableHeader,Table} from './components/ui/table';
import {Badge} from './components/ui/badge';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription,EmptyContent} from './components/ui/empty';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from './components/ui/chart';
import {AreaChart,Area,CartesianGrid,XAxis,YAxis} from 'recharts';
import {ToggleGroup,ToggleGroupItem} from './components/ui/toggle-group';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './components/ui/collapsible';
import {Card} from './components/ui/card';
import React,{useMemo,useState} from 'react';
import {Button} from './components/ui/button';
import {Icon} from './Icon';
import {documentName} from './format.mjs';
import {statuses} from './domain.mjs';

export function Dashboard({companies,docs,onCompany,onAdd}:any){
 const [days,setDays]=useState(30);
 const uploaded=docs.filter((d:any)=>d.status!=='missing'&&d.fileName);
 const review=docs.filter((d:any)=>d.status==='review_required').length;
 const accepted=docs.filter((d:any)=>d.status==='accepted').length;
 const points=useMemo(()=>{
  const today=new Date().toISOString().slice(0,10);
  const counts=new Map<string,number>();
  for(const d of docs){if(d.status!=='missing'&&d.fileName&&/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))counts.set(d.date,(counts.get(d.date)||0)+1)}
  return Array.from({length:days},(_,i)=>{const date=new Date(today+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-days+1+i);const key=date.toISOString().slice(0,10);return {date:key,count:counts.get(key)||0}});
 },[docs,days]);
 const total=points.reduce((n,p)=>n+p.count,0);
 const max=Math.ceil(Math.max(4,...points.map(p=>p.count))/2)*2;

 const recent=[...uploaded].reverse().sort((a:any,b:any)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
 const dateLabel=(date:string)=>date.slice(8,10)+'.'+date.slice(5,7);
 return <>
  <div className="page-heading"><div><h1>Umumiy ko‘rinish</h1><p>Kompaniyalaringiz va hujjatlaringiz bo‘yicha bugungi holat.</p></div><Button onClick={onAdd}><Icon name="plus"/>Kompaniya qo‘shish</Button></div>
  <div className="dashboard-stats">
   {[
    ['Kompaniyalar',companies.length,'company','Siz boshqarayotgan tashkilotlar'],
    ['Yuklangan hujjatlar',uploaded.length,'document','Barcha kompaniyalar bo‘yicha'],
    ['Tekshirish kerak',review,'search','Qaroringizni kutayotgan hujjatlar'],
    ['Qabul qilingan',accepted,'check','Tekshiruvdan o‘tgan hujjatlar'],
   ].map(([label,value,icon,hint])=><Card className="metric-card" key={String(label)}><div><span>{label}</span><Icon name={icon} size={18}/></div><strong>{value}</strong><p>{hint}</p></Card>)}
  </div>
  <Card className="panel activity-panel" aria-labelledby="activity-heading">
   <header><div><h2 id="activity-heading">Hujjatlar faolligi</h2><p>Oxirgi {days} kunda {total} ta hujjat yuklangan</p></div><ToggleGroup type="single" value={String(days)} onValueChange={v=>{if(v)setDays(Number(v))}} className="range-switch" aria-label="Grafik davri">{[7,30,90].map(d=><ToggleGroupItem key={d} value={String(d)} aria-label={`${d} kun`}>{d} kun</ToggleGroupItem>)}</ToggleGroup></header>
   <ChartContainer className="activity-chart" config={{count:{label:'Yuklangan hujjatlar',color:'var(--blue)'}}} aria-label={`Oxirgi ${days} kun: ${total} ta hujjat`}>
    <AreaChart accessibilityLayer data={points} margin={{left:0,right:12,top:16,bottom:0}}>
     <defs><linearGradient id="activity-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.24}/><stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02}/></linearGradient></defs>
     <CartesianGrid vertical={false} strokeDasharray="3 5"/>
     <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={65} tickMargin={12} fontSize={14}/>
     <YAxis domain={[0,max]} ticks={[0,max/2,max]} allowDecimals={false} tickLine={false} axisLine={false} width={32} fontSize={14}/>
     <ChartTooltip content={<ChartTooltipContent labelFormatter={label=>dateLabel(String(label))} />} />
     <Area dataKey="count" type="linear" fill="url(#activity-blue)" stroke="var(--color-count)" strokeWidth={2} isAnimationActive={false}/>
    </AreaChart>
   </ChartContainer>
   <footer><span className="chart-legend"><i/>Yuklangan hujjatlar</span>{!total&&<span>Hujjat yuklaganingizda grafik shu yerda ko‘rinadi.</span>}<Collapsible className="chart-values"><CollapsibleTrigger asChild><Button variant="link">Kunlar bo‘yicha<Icon name="down"/></Button></CollapsibleTrigger><CollapsibleContent>{points.filter(p=>p.count).length?points.filter(p=>p.count).map(p=><p key={p.date}>{dateLabel(p.date)} — {p.count} ta hujjat</p>):<p>Tanlangan davrda hujjat yuklanmagan.</p>}</CollapsibleContent></Collapsible></footer>
  </Card>
  <section className="dashboard-recent" aria-labelledby="recent-heading"><header className="section-heading"><div><h2 id="recent-heading">So‘nggi hujjatlar</h2><p>Barcha kompaniyalaringizdan oxirgi yuklangan fayllar.</p></div></header>
   <Card className="panel">{recent.length?<div className="recent-table-wrap"><Table><TableHeader><TableRow><TableHead>Hujjat</TableHead><TableHead>Kompaniya</TableHead><TableHead>Holat</TableHead><TableHead>Sana</TableHead><TableHead><span className="sr-only">Amal</span></TableHead></TableRow></TableHeader><TableBody>{recent.map((d:any)=>{const company=companies.find((c:any)=>c.id===d.company);return <TableRow key={d.id}><TableCell><span className="recent-document"><Icon name="document" size={18}/><span>{documentName(d)}</span></span></TableCell><TableCell>{company?.name||'—'}</TableCell><TableCell><Badge variant="outline" className={`badge ${d.status==='review_required'?'review':''}`}>{statuses[d.status]||d.status}</Badge></TableCell><TableCell>{d.date?dateLabel(d.date):'—'}</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`${documentName(d)} — kompaniyani ochish`} onClick={()=>onCompany(d.company)}><Icon name="arrow" size={16}/></Button></TableCell></TableRow>})}</TableBody></Table></div>:<Empty className="dashboard-empty"><EmptyHeader><EmptyMedia variant="icon"><Icon name="document" size={24}/></EmptyMedia><EmptyTitle>Hali hujjatlar yo‘q</EmptyTitle><EmptyDescription>{companies.length?'Kompaniyani ochib, birinchi hujjatingizni yuklang.':'Avval kompaniya qo‘shing, keyin hujjatlaringizni yuklang.'}</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={companies.length?()=>onCompany(companies[0].id):onAdd}>{companies.length?'Kompaniyani ochish':'Kompaniya qo‘shish'}<Icon name="arrow"/></Button></EmptyContent></Empty>}</Card>
  </section>
 </>
}
