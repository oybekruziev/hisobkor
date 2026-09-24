import {ArrowRight, ChevronRight, CircleCheck, Clock, ClipboardCheck, FolderOpen, Upload} from 'lucide-react';
import {Ring} from './Dashboard';
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
    <section aria-labelledby="period-title" className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <Ring value={summary.progress.percent} size={64}/>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">{formatPeriod(period)} · hisobot davri</p>
            <h2 id="period-title" className="mt-1 text-xl font-semibold tracking-tight text-balance">{summary.title}</h2>
          </div>
        </div>
        <p className="max-w-[60ch] text-sm text-pretty text-muted-foreground">{summary.text}</p>
        <Button className="self-start" onClick={() => act(summary.action)}>{summary.action.label}<ArrowRight/></Button>
      </div>
      <ul role="list" className="flex flex-col divide-y border-t bg-muted/40 lg:border-t-0 lg:border-l">
        {[
          {key: 'review_required', label: 'Tekshirish kerak', hint: 'Qaroringizni kutmoqda', value: stats.review, icon: ClipboardCheck, tone: 'bg-amber-100 text-amber-800'},
          {key: 'missing', label: 'Kutilmoqda', hint: 'Fayl yoki tuzatish kerak', value: stats.missing, icon: Clock, tone: 'bg-muted text-muted-foreground border'},
          {key: 'accepted', label: 'Qabul qilingan', hint: 'Siz tasdiqlagan', value: stats.accepted, icon: CircleCheck, tone: 'bg-emerald-100 text-emerald-800'},
        ].map(item => (
          <li key={item.key} className="flex-1">
            <button type="button" onClick={() => onFilter(item.key)} aria-label={`${item.label}: ${item.value} ta hujjat. Ro‘yxatni ochish`}
              className="group/s flex h-full w-full items-center gap-3 px-5 py-4 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-6">
              <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-lg [&>svg]:size-4 ${item.tone}`}><item.icon/></span>
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-medium">{item.label}</span><span className="text-sm text-muted-foreground">{item.hint}</span></span>
              <span className="text-2xl font-semibold tabular-nums">{item.value}</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/s:translate-x-0.5"/>
            </button>
          </li>
        ))}
      </ul>
    </section>

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


  </div>;
}
