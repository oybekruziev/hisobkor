import React, {useMemo, useState} from 'react';
import {ArrowRight, Building2, CheckCheck, FileText, FolderOpen, Plus, Upload} from 'lucide-react';
import {PageHeader} from './components/PageHeader';
import {SearchField} from './components/SearchField';
import {PeriodPicker} from './components/app/PeriodPicker';
import {StatusBadge} from './components/app/StatusBadge';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from './components/ui/card';
import {Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle} from './components/ui/item';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent} from './components/ui/empty';
import {Progress} from './components/ui/progress';
import {Button} from './components/ui/button';
import {Separator} from './components/ui/separator';
import {dashboardRows, waitingForReview, workspaceHeadline} from './dashboard-model.mjs';
import {companyStates} from './domain.mjs';
import {formatPeriod, documentName, companyTitle, formatDate} from './format.mjs';

/** A company's period state uses the same colour and icon vocabulary as a document status. */
const stateStatus: Record<string, string> = {ready: 'accepted', review: 'review_required', waiting: 'missing', empty: 'missing'};
const MAX_ATTENTION = 5;

function CompanyRow({row, onOpen}: any) {
  const {company, stats, uploaded, total} = row;
  // What the accountant must do comes first: a document waiting for a decision outranks a missing one.
  const state = stats.review ? 'review' : row.state;
  const counts = total
    ? `${uploaded.length} / ${total} ta hujjat${stats.review ? ` · ${stats.review} ta tekshirish kerak` : stats.missing ? ` · ${stats.missing} ta kutilmoqda` : ''}`
    : 'Bu davrda hali hujjat yo‘q';
  return (
    <Item asChild>
      <button type="button" className="home-company" onClick={() => onOpen(company.id)} aria-label={`${company.name}: ${companyStates[state]}. Kompaniyani ochish`}>
        <ItemContent>
          <ItemTitle>{companyTitle(company)}</ItemTitle>
          <ItemDescription>{counts}</ItemDescription>
          {total > 0 && <Progress className="home-company-progress" value={row.received ?? 0} aria-hidden="true"/>}
        </ItemContent>
        <ItemActions>
          <StatusBadge status={stateStatus[state]}>{companyStates[state]}</StatusBadge>
          <ArrowRight aria-hidden="true" className="home-company-arrow"/>
        </ItemActions>
      </button>
    </Item>
  );
}

export function WorkspaceHome({companies, docs, period, onPeriod, onOpenCompany, onReview, onUpload, onAddCompany, banner}: any) {
  const [query, setQuery] = useState('');
  const mine = companies.filter((c: any) => !c.isDemo);
  const rows = useMemo(() => dashboardRows(mine, docs, period), [mine, docs, period]);
  const waiting = useMemo(() => waitingForReview(mine, docs, period), [mine, docs, period]);
  const headline = workspaceHeadline(waiting);
  const searchable = mine.length > 5;
  const visible = searchable
    ? rows.filter((r: any) => `${r.company.name} ${r.company.stir || ''}`.toLowerCase().includes(query.toLowerCase()))
    : rows;

  return (
    <div className="home">
      <PageHeader
        title="Bosh sahifa"
        description="Bugun nimaga e’tibor kerakligi va har bir kompaniyaning holati."
        actions={<>
          <PeriodPicker value={period} min="2000-01" max="2100-12" onChange={onPeriod}/>
          {mine.length > 0 && <Button onClick={onUpload}><Upload data-icon="inline-start"/>Hujjat yuklash</Button>}
          <Button variant="outline" onClick={onAddCompany}><Plus data-icon="inline-start"/>Kompaniya qo‘shish</Button>
        </>}
      />

      {banner}

      <Card className="home-panel" data-tone={headline.tone}>
        <CardHeader>
          <CardTitle>{headline.title}</CardTitle>
          <CardDescription>{headline.text}</CardDescription>
        </CardHeader>
        <CardContent>
          {waiting.length ? (
            <ItemGroup className="home-attention">
              {waiting.slice(0, MAX_ATTENTION).map(({doc, company}: any) => (
                <Item key={doc.id} role="listitem">
                  <ItemMedia variant="icon"><FileText aria-hidden="true"/></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{documentName(doc)}</ItemTitle>
                    <ItemDescription>{company.name} · {doc.scope === 'permanent' ? 'Doimiy hujjat' : formatPeriod(doc.period)} · {formatDate(doc.date) || 'Sana yo‘q'}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button onClick={() => onReview(doc)} aria-label={`${documentName(doc)} hujjatini tekshirish`}>Tekshirish<ArrowRight data-icon="inline-end"/></Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <Empty className="empty">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CheckCheck aria-hidden="true"/></EmptyMedia>
                <EmptyDescription>{mine.length ? 'Bu davrda tekshirishni kutayotgan hujjat yo‘q. Yangi hujjat yuklasangiz, u shu yerda paydo bo‘ladi.' : 'Kompaniya qo‘shsangiz, tekshirishni kutayotgan hujjatlar shu yerda ko‘rinadi.'}</EmptyDescription>
              </EmptyHeader>
              {mine.length > 0 && <EmptyContent><Button variant="outline" onClick={onUpload}><Upload data-icon="inline-start"/>Hujjat yuklash</Button></EmptyContent>}
            </Empty>
          )}
        </CardContent>
        {waiting.length > MAX_ATTENTION && (
          <CardFooter className="home-panel-footer">
            <span>Yana {waiting.length - MAX_ATTENTION} ta hujjat tekshiruvni kutmoqda. Ularni kompaniya ichida ko‘rasiz.</span>
          </CardFooter>
        )}
      </Card>

      <Separator/>

      <Card className="home-panel">
        <CardHeader>
          <CardTitle>Kompaniyalar</CardTitle>
          <CardDescription>{formatPeriod(period)} holati. Kompaniyani ochish uchun qatorni bosing.</CardDescription>
        </CardHeader>
        <CardContent>
          {searchable && <SearchField className="home-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Kompaniya nomi yoki STIR" aria-label="Kompaniyalarni qidirish"/>}
          {visible.length ? (
            <ItemGroup role={undefined} className="home-companies">
              {visible.map((row: any) => <CompanyRow key={row.company.id} row={row} onOpen={onOpenCompany}/>)}
            </ItemGroup>
          ) : (
            <Empty className="empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">{mine.length ? <FolderOpen aria-hidden="true"/> : <Building2 aria-hidden="true"/>}</EmptyMedia>
                <EmptyTitle>{mine.length ? 'Kompaniya topilmadi' : 'Birinchi kompaniyangizni qo‘shing'}</EmptyTitle>
                <EmptyDescription>{mine.length ? 'Boshqa nom yoki STIR bilan qidiring.' : 'Har bir mijoz tashkiloti alohida yuritiladi: hujjatlari, qarorlari va tarixi aralashmaydi.'}</EmptyDescription>
              </EmptyHeader>
              {!mine.length && <EmptyContent><Button onClick={onAddCompany}><Plus data-icon="inline-start"/>Kompaniya qo‘shish</Button></EmptyContent>}
            </Empty>
          )}
        </CardContent>
        {visible.length > 0 && (
          <CardFooter className="home-panel-footer">
            <span>{mine.length} ta kompaniya · {rows.reduce((sum: number, r: any) => sum + r.uploaded.length, 0)} ta hujjat shu davrda</span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
