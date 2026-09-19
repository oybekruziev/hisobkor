import {StatStrip} from './components/StatStrip';
import {Button} from './components/ui/button';
import {Card} from './components/ui/card';
import {Badge} from './components/ui/badge';
import {Icon} from './Icon';
import {companyOverview} from './company-overview.mjs';
import {documentName,formatDate} from './format.mjs';
import {statuses} from './domain.mjs';

export function CompanyOverview({company,docs,period,onNavigate,onOpen,onUpload}:any){
 const {stats,uploaded,recent}=companyOverview(docs,company.id,period);
 return <div className="company-overview">
  <StatStrip items={[
   {label:'Yuklangan hujjatlar',value:uploaded.length,hint:'Oylik va doimiy',tone:'info'},
   {label:'Tekshirish kerak',value:stats.review+stats.missing,hint:'Ko‘rib chiqish uchun',tone:'warning'},
   {label:'Qabul qilingan',value:stats.accepted,hint:'Buxgalter tasdiqlagan',tone:'success'},
  ]}/>
  <Card className="overview-documents"><header><h2>So‘nggi hujjatlar</h2><Button variant="ghost" onClick={()=>onNavigate('documents')}>Barchasi<Icon name="arrow"/></Button></header>
  {recent.length?<ul>{recent.map((d:any)=><li key={d.id}><Icon name="document"/><Button variant="ghost" className="overview-document-name" onClick={()=>onOpen(d)}>{documentName(d)}</Button><Badge variant="outline" className="badge" data-status={d.status}>{statuses[d.status]}</Badge><time dateTime={d.date||undefined}>{formatDate(d.date)||'—'}</time></li>)}</ul>:<div className="overview-empty"><Icon name="folder" size={28}/><p>Bu davrda hali hujjat yo‘q.</p><Button variant="outline" onClick={onUpload}><Icon name="upload"/>Hujjat yuklash</Button></div>}
  </Card>
  <div className="overview-links"><Button variant="outline" onClick={()=>onNavigate('archive')}><Icon name="folder"/>Doimiy hujjatlar<Icon name="arrow"/></Button><Button variant="outline" onClick={()=>onNavigate('history')}><Icon name="clock"/>Amallar tarixi<Icon name="arrow"/></Button><Button variant="outline" onClick={()=>onNavigate('info')}><Icon name="company"/>Kompaniya ma’lumotlari<Icon name="arrow"/></Button></div>
 </div>;
}
