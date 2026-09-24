import React, {useMemo, useState} from 'react';
import {ArrowRight, Building2, CheckCheck, FolderOpen, Plus, Upload} from 'lucide-react';
import {SearchField} from './components/SearchField';
import {PeriodPicker} from './components/app/PeriodPicker';
import {StatusBadge} from './components/app/StatusBadge';
import {FileTile} from './components/app/Tiles';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction} from './components/ui/card';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent} from './components/ui/empty';
import {Button} from './components/ui/button';
import {dashboardRows, waitingForReview, workspaceHeadline} from './dashboard-model.mjs';
import {companyStates} from './domain.mjs';
import {formatPeriod, documentName, formatDate, greeting, initialsOf} from './format.mjs';
import {cn} from './lib/utils';

/** A company's period state uses the same colour and icon vocabulary as a document status. */
const stateStatus: Record<string, string> = {ready: 'accepted', review: 'review_required', waiting: 'missing', empty: 'missing'};
const MAX_ATTENTION = 6;

/** Circular progress: how much of the period's paperwork is in. */
export function Ring({value, size = 44, className}: {value: number | null; size?: number; className?: string}) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{width: size, height: size}} aria-hidden="true">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-muted"/>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" strokeLinecap="round" className={v === 100 ? 'stroke-emerald-500' : 'stroke-primary'} strokeDasharray={c} strokeDashoffset={c - (c * v) / 100}/>
      </svg>
      <span className="absolute text-[0.6875rem] font-semibold tabular-nums">{value == null ? '—' : `${v}%`}</span>
    </span>
  );
}

function CompanyTile({row, onOpen}: any) {
  const {company, stats, uploaded, total} = row;
  const state = stats.review ? 'review' : row.state;
  return (
    <li>
      <button type="button" onClick={() => onOpen(company.id)} aria-label={`${company.name}: ${companyStates[state]}. Kompaniyani ochish`}
        className="group/tile flex h-full w-full flex-col gap-4 rounded-xl border bg-card p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <span className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground">{initialsOf(company.name)}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{company.name}</span>
            <span className="truncate text-sm text-muted-foreground tabular-nums">{company.stir ? `STIR ${company.stir}` : company.legal || 'Kompaniya'}</span>
          </span>
          <Ring value={row.received}/>
        </span>
        <span className="mt-auto flex items-center justify-between gap-2">
          <StatusBadge status={stateStatus[state]}>{companyStates[state]}</StatusBadge>
          <span className="text-sm text-muted-foreground tabular-nums">{total ? `${uploaded.length}/${total} hujjat` : 'Hujjat yo‘q'}</span>
        </span>
      </button>
    </li>
  );
}

/** Segmented bar: accepted · waiting for review · missing, across every company this period. */
function Breakdown({totals}: {totals: {accepted: number; review: number; missing: number}}) {
  const all = totals.accepted + totals.review + totals.missing;
  const parts = [
    {key: 'accepted', label: 'Qabul qilingan', value: totals.accepted, bar: 'bg-emerald-300', dot: 'bg-emerald-300'},
    {key: 'review', label: 'Tekshirish kerak', value: totals.review, bar: 'bg-amber-300', dot: 'bg-amber-300'},
    {key: 'missing', label: 'Kutilmoqda', value: totals.missing, bar: 'bg-white/25', dot: 'bg-white/40'},
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={parts.map(p => `${p.label}: ${p.value}`).join(', ')}>
        {all > 0 && parts.map(p => p.value > 0 && <span key={p.key} className={cn('h-full first:rounded-l-full last:rounded-r-full', p.bar)} style={{width: `${(p.value / all) * 100}%`}}/>)}
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {parts.map(p => <div key={p.key} className="flex items-center gap-2"><span aria-hidden="true" className={cn('size-2 rounded-full', p.dot)}/><dt className="text-white/75">{p.label}</dt><dd className="font-semibold tabular-nums">{p.value}</dd></div>)}
      </dl>
    </div>
  );
}

export function WorkspaceHome({companies, docs, period, profile, onPeriod, onOpenCompany, onReview, onUpload, onAddCompany, banner}: any) {
  const [query, setQuery] = useState('');
  const mine = companies.filter((c: any) => !c.isDemo);
  const rows = useMemo(() => dashboardRows(mine, docs, period), [mine, docs, period]);
  const waiting = useMemo(() => waitingForReview(mine, docs, period), [mine, docs, period]);
  const headline = workspaceHeadline(waiting);
  const searchable = mine.length > 6;
  const visible = searchable
    ? rows.filter((r: any) => `${r.company.name} ${r.company.stir || ''}`.toLowerCase().includes(query.toLowerCase()))
    : rows;
  // Companies that need the accountant come first.
  const ordered = [...visible].sort((a: any, b: any) => (b.stats.review - a.stats.review) || (b.stats.missing - a.stats.missing));
  const totals = rows.reduce((sum: any, r: any) => ({
    review: sum.review + r.stats.review,
    missing: sum.missing + r.stats.missing,
    accepted: sum.accepted + r.stats.accepted,
  }), {review: 0, missing: 0, accepted: 0});
  const firstName = String(profile?.fullName || '').trim().split(/\s+/)[0];

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:gap-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{formatPeriod(period)} · {mine.length} ta kompaniya</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-balance lg:text-[2rem]">{firstName ? `${greeting()}, ${firstName}` : greeting()}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PeriodPicker value={period} min="2000-01" max="2100-12" onChange={onPeriod}/>
          {mine.length > 0 && <Button className="lg:hidden" onClick={onUpload}><Upload/>Hujjat yuklash</Button>}
          <Button variant="outline" onClick={onAddCompany}><Plus/>Kompaniya</Button>
        </div>
      </header>

      {banner}

      {mine.length > 0 && (
        <section aria-labelledby="focus-title" className="relative overflow-hidden rounded-2xl bg-ink p-5 text-ink-foreground sm:p-7">
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-ink-primary/15 blur-3xl"/>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-xl flex-col gap-2">
              <p className="text-sm font-medium text-ink-primary">Bugungi ish</p>
              <h2 id="focus-title" className="text-2xl font-semibold tracking-tight text-balance text-white sm:text-[1.75rem]">{headline.title}</h2>
              <p className="text-sm text-pretty text-white/70">{headline.text}</p>
            </div>
            {waiting.length > 0 && <Button size="lg" className="bg-ink-primary font-semibold text-ink-primary-foreground hover:bg-ink-primary/90 max-lg:self-start" onClick={() => onReview(waiting[0].doc)}>Tekshirishni boshlash<ArrowRight/></Button>}
          </div>
          <div className="relative mt-6"><Breakdown totals={totals}/></div>
        </section>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-5 lg:gap-7">
        <Card className="gap-4 lg:col-span-3 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Tekshiruv navbati</CardTitle>
            <CardDescription>Eng yangi hujjatlar yuqorida</CardDescription>
            {waiting.length > 0 && <CardAction><span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800 tabular-nums">{waiting.length}</span></CardAction>}
          </CardHeader>
          <CardContent>
            {waiting.length ? (
              <ul role="list" className="-mx-2 flex flex-col">
                {waiting.slice(0, MAX_ATTENTION).map(({doc, company}: any) => (
                  <li key={doc.id}>
                    <button type="button" onClick={() => onReview(doc)} aria-label={`${documentName(doc)} hujjatini tekshirish`}
                      className="group/q flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50">
                      <FileTile fileName={doc.fileName}/>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{documentName(doc)}</span>
                        <span className="truncate text-sm text-muted-foreground">{company.name}<span className="max-sm:hidden"> · {doc.scope === 'permanent' ? 'Doimiy hujjat' : formatDate(doc.date) || 'Sana yo‘q'}</span></span>
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-80 group-hover/q:opacity-100">Tekshirish<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/q:translate-x-0.5"/></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CheckCheck aria-hidden="true"/></EmptyMedia>
                  <EmptyTitle>Navbat bo‘sh</EmptyTitle>
                  <EmptyDescription>{mine.length ? 'Bu davrda tekshirishni kutayotgan hujjat yo‘q. Yangi hujjat yuklasangiz, u shu yerda paydo bo‘ladi.' : 'Kompaniya qo‘shsangiz, tekshirishni kutayotgan hujjatlar shu yerda ko‘rinadi.'}</EmptyDescription>
                </EmptyHeader>
                {mine.length > 0 && <EmptyContent><Button variant="outline" onClick={onUpload}><Upload/>Hujjat yuklash</Button></EmptyContent>}
              </Empty>
            )}
          </CardContent>
          {waiting.length > MAX_ATTENTION && (
            <CardFooter className="text-sm text-muted-foreground">Yana {waiting.length - MAX_ATTENTION} ta hujjat navbatda — ularni kompaniya ichida ko‘rasiz.</CardFooter>
          )}
        </Card>

        <section aria-labelledby="companies-title" className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="companies-title" className="font-semibold">Kompaniyalar <span className="font-normal text-muted-foreground tabular-nums">{mine.length}</span></h2>
            {mine.length > 0 && <Button variant="ghost" size="sm" onClick={onAddCompany}><Plus/>Qo‘shish</Button>}
          </div>
          {searchable && <SearchField value={query} onChange={e => setQuery(e.target.value)} placeholder="Kompaniya nomi yoki STIR" aria-label="Kompaniyalarni qidirish"/>}
          {ordered.length ? (
            <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {ordered.map((row: any) => <CompanyTile key={row.company.id} row={row} onOpen={onOpenCompany}/>)}
            </ul>
          ) : (
            <Card className="py-0"><Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">{mine.length ? <FolderOpen aria-hidden="true"/> : <Building2 aria-hidden="true"/>}</EmptyMedia>
                <EmptyTitle>{mine.length ? 'Kompaniya topilmadi' : 'Birinchi kompaniyangizni qo‘shing'}</EmptyTitle>
                <EmptyDescription>{mine.length ? 'Boshqa nom yoki STIR bilan qidiring.' : 'Har bir mijoz tashkiloti alohida yuritiladi: hujjatlari, qarorlari va tarixi aralashmaydi.'}</EmptyDescription>
              </EmptyHeader>
              {!mine.length && <EmptyContent><Button onClick={onAddCompany}><Plus/>Kompaniya qo‘shish</Button></EmptyContent>}
            </Empty></Card>
          )}
        </section>
      </div>
    </div>
  );
}
