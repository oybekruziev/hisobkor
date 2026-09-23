import React, {useMemo, useState} from 'react';
import {ArrowRight, Building2, CheckCheck, ChevronRight, CircleCheck, ClipboardCheck, Clock, FolderOpen, Plus, Upload} from 'lucide-react';
import {PageHeader} from './components/PageHeader';
import {SearchField} from './components/SearchField';
import {PeriodPicker} from './components/app/PeriodPicker';
import {StatusBadge} from './components/app/StatusBadge';
import {StatCards} from './components/app/StatCards';
import {InitialsTile, FileTile} from './components/app/Tiles';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction} from './components/ui/card';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent} from './components/ui/empty';
import {Progress} from './components/ui/progress';
import {Button} from './components/ui/button';
import {dashboardRows, waitingForReview, workspaceHeadline} from './dashboard-model.mjs';
import {companyStates} from './domain.mjs';
import {formatPeriod, documentName, companyTitle, formatDate, greeting} from './format.mjs';

/** A company's period state uses the same colour and icon vocabulary as a document status. */
const stateStatus: Record<string, string> = {ready: 'accepted', review: 'review_required', waiting: 'missing', empty: 'missing'};
const MAX_ATTENTION = 5;

function CompanyRow({row, onOpen}: any) {
  const {company, stats, uploaded, total} = row;
  // What the accountant must do comes first: a document waiting for a decision outranks a missing one.
  const state = stats.review ? 'review' : row.state;
  return (
    <li>
      <button type="button" className="group/row flex w-full items-center gap-3 rounded-md px-2 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => onOpen(company.id)} aria-label={`${company.name}: ${companyStates[state]}. Kompaniyani ochish`}>
        <InitialsTile name={company.name}/>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">{company.name}</span>
          <span className="text-sm text-muted-foreground tabular-nums">{total ? `${uploaded.length} / ${total} ta hujjat` : 'Bu davrda hali hujjat yo‘q'}</span>
          {total > 0 && <Progress className="mt-1 h-1.5" value={row.received ?? 0} aria-hidden="true"/>}
        </span>
        <StatusBadge status={stateStatus[state]} className="max-sm:hidden">{companyStates[state]}</StatusBadge>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>
      </button>
    </li>
  );
}

export function WorkspaceHome({companies, docs, period, profile, onPeriod, onOpenCompany, onReview, onUpload, onAddCompany, banner}: any) {
  const [query, setQuery] = useState('');
  const mine = companies.filter((c: any) => !c.isDemo);
  const rows = useMemo(() => dashboardRows(mine, docs, period), [mine, docs, period]);
  const waiting = useMemo(() => waitingForReview(mine, docs, period), [mine, docs, period]);
  const headline = workspaceHeadline(waiting);
  const searchable = mine.length > 5;
  const visible = searchable
    ? rows.filter((r: any) => `${r.company.name} ${r.company.stir || ''}`.toLowerCase().includes(query.toLowerCase()))
    : rows;
  const totals = rows.reduce((sum: any, r: any) => ({
    review: sum.review + r.stats.review,
    missing: sum.missing + r.stats.missing,
    accepted: sum.accepted + r.stats.accepted,
  }), {review: 0, missing: 0, accepted: 0});
  const firstName = String(profile?.fullName || '').trim().split(/\s+/)[0];

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        description={`${formatPeriod(period)} · ${mine.length} ta kompaniya`}
        actions={<>
          <PeriodPicker value={period} min="2000-01" max="2100-12" onChange={onPeriod}/>
          {mine.length > 0 && <Button onClick={onUpload}><Upload/>Hujjat yuklash</Button>}
          <Button variant="outline" onClick={onAddCompany}><Plus/>Kompaniya qo‘shish</Button>
        </>}
      />

      {banner}

      {mine.length > 0 && <StatCards items={[
        {key: 'review', label: 'Tekshirish kerak', value: totals.review, hint: 'Barcha kompaniyalar bo‘yicha', tone: 'warning', icon: ClipboardCheck},
        {key: 'missing', label: 'Kutilmoqda', value: totals.missing, hint: 'Fayl yoki tuzatish kerak', tone: 'neutral', icon: Clock},
        {key: 'accepted', label: 'Qabul qilingan', value: totals.accepted, hint: `${formatPeriod(period)} davri`, tone: 'success', icon: CircleCheck},
      ]}/>}

      <div className="grid min-w-0 gap-4 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{headline.title}</CardTitle>
            <CardDescription>{headline.text}</CardDescription>
          </CardHeader>
          <CardContent>
            {waiting.length ? (
              <ul role="list" className="divide-y">
                {waiting.slice(0, MAX_ATTENTION).map(({doc, company}: any) => (
                  <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <FileTile fileName={doc.fileName}/>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">{documentName(doc)}</span>
                      <span className="text-sm text-muted-foreground">{company.name} · {doc.scope === 'permanent' ? 'Doimiy hujjat' : formatPeriod(doc.period)} · {formatDate(doc.date) || 'Sana yo‘q'}</span>
                    </span>
                    <Button variant="outline" size="sm" onClick={() => onReview(doc)} aria-label={`${documentName(doc)} hujjatini tekshirish`}>Tekshirish<ArrowRight/></Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CheckCheck aria-hidden="true"/></EmptyMedia>
                  <EmptyTitle>Hozircha bo‘sh</EmptyTitle>
                  <EmptyDescription>{mine.length ? 'Bu davrda tekshirishni kutayotgan hujjat yo‘q. Yangi hujjat yuklasangiz, u shu yerda paydo bo‘ladi.' : 'Kompaniya qo‘shsangiz, tekshirishni kutayotgan hujjatlar shu yerda ko‘rinadi.'}</EmptyDescription>
                </EmptyHeader>
                {mine.length > 0 && <EmptyContent><Button variant="outline" onClick={onUpload}><Upload/>Hujjat yuklash</Button></EmptyContent>}
              </Empty>
            )}
          </CardContent>
          {waiting.length > MAX_ATTENTION && (
            <CardFooter className="text-sm text-muted-foreground">Yana {waiting.length - MAX_ATTENTION} ta hujjat tekshiruvni kutmoqda. Ularni kompaniya ichida ko‘rasiz.</CardFooter>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kompaniyalar</CardTitle>
            <CardDescription>{formatPeriod(period)} holati</CardDescription>
            {mine.length > 0 && <CardAction>
              <Button variant="ghost" size="sm" onClick={onAddCompany} aria-label="Kompaniya qo‘shish"><Plus/>Qo‘shish</Button>
            </CardAction>}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {searchable && <SearchField value={query} onChange={e => setQuery(e.target.value)} placeholder="Kompaniya nomi yoki STIR" aria-label="Kompaniyalarni qidirish"/>}
            {visible.length ? (
              <ul role="list" className="-mx-2 divide-y">
                {visible.map((row: any) => <CompanyRow key={row.company.id} row={row} onOpen={onOpenCompany}/>)}
              </ul>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">{mine.length ? <FolderOpen aria-hidden="true"/> : <Building2 aria-hidden="true"/>}</EmptyMedia>
                  <EmptyTitle>{mine.length ? 'Kompaniya topilmadi' : 'Birinchi kompaniyangizni qo‘shing'}</EmptyTitle>
                  <EmptyDescription>{mine.length ? 'Boshqa nom yoki STIR bilan qidiring.' : 'Har bir mijoz tashkiloti alohida yuritiladi: hujjatlari, qarorlari va tarixi aralashmaydi.'}</EmptyDescription>
                </EmptyHeader>
                {!mine.length && <EmptyContent><Button onClick={onAddCompany}><Plus/>Kompaniya qo‘shish</Button></EmptyContent>}
              </Empty>
            )}
          </CardContent>
          {visible.length > 0 && (
            <CardFooter className="text-sm text-muted-foreground tabular-nums">{mine.length} ta kompaniya · {rows.reduce((sum: number, r: any) => sum + r.uploaded.length, 0)} ta hujjat shu davrda</CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
