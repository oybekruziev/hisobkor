import {ArrowRight, Building2, ChevronRight, CircleCheck, Clock, ClipboardCheck, FolderOpen, History, Upload} from 'lucide-react';
import {StatCards} from './components/app/StatCards';
import {PeriodHero} from './components/app/PeriodHero';
import {LinkCards} from './components/app/LinkCards';
import {FileTile} from './components/app/Tiles';
import {StatusBadge} from './components/app/StatusBadge';
import {Button} from './components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction} from './components/ui/card';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent} from './components/ui/empty';
import {companyOverview, periodSummary} from './company-overview.mjs';
import {documentName, formatDate, formatPeriod} from './format.mjs';

export function CompanyOverview({company, docs, period, closed, onNavigate, onOpen, onUpload, onFilter}: any) {
  const {stats, uploaded, recent} = companyOverview(docs, company.id, period);
  const summary = periodSummary(docs, company, period, closed || []);

  const act = (action: any) => {
    if (action.kind === 'upload') return onUpload();
    if (action.kind === 'review') {
      const doc = docs.find((d: any) => d.id === action.documentId);
      return doc ? onOpen(doc) : onNavigate('documents');
    }
    return onNavigate('documents');
  };

  return <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
    <PeriodHero summary={summary} period={period} onAction={act}/>

    <StatCards items={[
      {key: 'review_required', label: 'Tekshirish kerak', value: stats.review, hint: 'Qaroringizni kutmoqda', tone: 'warning', icon: ClipboardCheck,
        onSelect: () => onFilter('review_required'), selectLabel: `Tekshirish kerak: ${stats.review} ta hujjat. Ro‘yxatni ochish`},
      {key: 'missing', label: 'Kutilmoqda', value: stats.missing, hint: 'Fayl yoki tuzatish kerak', tone: 'neutral', icon: Clock,
        onSelect: () => onFilter('missing'), selectLabel: `Kutilmoqda: ${stats.missing} ta hujjat. Ro‘yxatni ochish`},
      {key: 'accepted', label: 'Qabul qilingan', value: stats.accepted, hint: 'Siz tasdiqlagan', tone: 'success', icon: CircleCheck,
        onSelect: () => onFilter('accepted'), selectLabel: `Qabul qilingan: ${stats.accepted} ta hujjat. Ro‘yxatni ochish`},
    ]}/>

    <Card>
      <CardHeader>
        <CardTitle>So‘nggi hujjatlar</CardTitle>
        <CardDescription>{formatPeriod(period)} va doimiy hujjatlar · jami {uploaded.length} ta</CardDescription>
        {recent.length > 0 && <CardAction>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('documents')}>Barchasi<ArrowRight/></Button>
        </CardAction>}
      </CardHeader>
      <CardContent>
        {recent.length ? (
          <ul role="list" className="-mx-2 divide-y">
            {recent.map((d: any) => (
              <li key={d.id}>
                <button type="button" className="flex w-full items-center gap-x-3 gap-y-1 rounded-md px-2 py-3 text-left outline-none hover:bg-muted/50 max-sm:flex-wrap focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => onOpen(d)} aria-label={`${documentName(d)} hujjatini ochish`}>
                  <FileTile fileName={d.fileName}/>
                  <span className="flex min-w-0 flex-1 flex-col max-sm:basis-[calc(100%-3.5rem)]">
                    <span className="text-sm font-medium [overflow-wrap:anywhere]">{documentName(d)}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">{[d.size, formatDate(d.date)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <StatusBadge status={d.status} className="max-sm:order-last max-sm:ml-12"/>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground max-sm:hidden"/>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FolderOpen aria-hidden="true"/></EmptyMedia>
              <EmptyTitle>Bu davrda hali hujjat yo‘q</EmptyTitle>
              <EmptyDescription>{formatPeriod(period)} uchun birinchi faylni yuklang: PDF, rasm, Excel yoki CSV. Yuklangandan keyin uni tekshirib, qabul qilasiz.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button onClick={onUpload}><Upload/>Hujjat yuklash</Button></EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>

    <LinkCards items={[
      {key: 'history', title: 'Amallar tarixi', description: 'Kim, qachon, qanday qaror berdi', icon: History, onSelect: () => onNavigate('history')},
      {key: 'info', title: 'Kompaniya ma’lumotlari', description: 'Rekvizitlar va aloqa', icon: Building2, onSelect: () => onNavigate('info')},
      {key: 'archive', title: 'Doimiy hujjatlar', description: 'Ustav, guvohnoma, shartnomalar', icon: FolderOpen, onSelect: () => onNavigate('archive')},
    ]}/>
  </div>;
}
