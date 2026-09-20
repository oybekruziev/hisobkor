import {ArrowRight, Clock, Building2, FolderOpen, Upload} from 'lucide-react';
import {StatStrip} from './components/StatStrip';
import {StatusBadge} from './components/app/StatusBadge';
import {Button} from './components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from './components/ui/card';
import {Item, ItemActions, ItemContent, ItemTitle, ItemGroup} from './components/ui/item';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent} from './components/ui/empty';
import {companyOverview} from './company-overview.mjs';
import {documentName, formatDate, formatPeriod} from './format.mjs';

export function CompanyOverview({company, docs, period, onNavigate, onOpen, onUpload}: any) {
  const {stats, uploaded, recent} = companyOverview(docs, company.id, period);
  return <div className="company-overview">
    <StatStrip items={[
      {label: 'Tekshirish kerak', value: stats.review, hint: 'Qaroringizni kutmoqda', tone: 'warning'},
      {label: 'Qabul qilingan', value: stats.accepted, hint: 'Siz tasdiqlagan', tone: 'success'},
      {label: 'Yuklangan hujjatlar', value: uploaded.length, hint: 'Oylik va doimiy'},
    ]}/>

    <Card className="overview-documents panel">
      <CardHeader>
        <CardTitle>So‘nggi hujjatlar</CardTitle>
        <CardDescription>{formatPeriod(period)} va doimiy hujjatlar. Hujjat nomini bossangiz, tekshiruv oynasi ochiladi.</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length ? (
          <ItemGroup>
            {recent.map((d: any) => (
              <Item key={d.id} asChild>
                <button type="button" className="overview-document" onClick={() => onOpen(d)} aria-label={`${documentName(d)} hujjatini ochish`}>
                  <ItemContent><ItemTitle>{documentName(d)}</ItemTitle></ItemContent>
                  <ItemActions>
                    <StatusBadge status={d.status}/>
                    <time dateTime={d.date || undefined}>{formatDate(d.date) || '—'}</time>
                  </ItemActions>
                </button>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <Empty className="empty">
            <EmptyHeader>
              <EmptyMedia variant="icon"><FolderOpen aria-hidden="true"/></EmptyMedia>
              <EmptyTitle>Bu davrda hali hujjat yo‘q</EmptyTitle>
              <EmptyDescription>{formatPeriod(period)} uchun birinchi faylni yuklang: PDF, rasm, Excel yoki CSV. Yuklangandan keyin uni tekshirib, qabul qilasiz.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button onClick={onUpload}><Upload data-icon="inline-start"/>Hujjat yuklash</Button></EmptyContent>
          </Empty>
        )}
      </CardContent>
      {recent.length > 0 && (
        <CardFooter>
          <Button variant="ghost" onClick={() => onNavigate('documents')}>Barcha hujjatlar<ArrowRight data-icon="inline-end"/></Button>
        </CardFooter>
      )}
    </Card>

    <div className="overview-links">
      <Button variant="outline" onClick={() => onNavigate('archive')}><FolderOpen data-icon="inline-start"/>Doimiy hujjatlar<ArrowRight data-icon="inline-end"/></Button>
      <Button variant="outline" onClick={() => onNavigate('history')}><Clock data-icon="inline-start"/>Amallar tarixi<ArrowRight data-icon="inline-end"/></Button>
      <Button variant="outline" onClick={() => onNavigate('info')}><Building2 data-icon="inline-start"/>Kompaniya ma’lumotlari<ArrowRight data-icon="inline-end"/></Button>
    </div>
  </div>;
}
