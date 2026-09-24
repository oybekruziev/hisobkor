import React, {useMemo, useRef, useState} from 'react';
import {toast} from 'sonner';
import {Button} from '../components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction} from '../components/ui/card';
import {Badge} from '../components/ui/badge';
import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {Checkbox} from '../components/ui/checkbox';
import {Label} from '../components/ui/label';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '../components/ui/tabs';
import {Field, FieldGroup, FieldLabel, FieldDescription, FieldError} from '../components/ui/field';
import {NativeSelect, NativeSelectOption} from '../components/ui/native-select';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '../components/ui/dialog';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '../components/ui/table';
import {Character} from '../components/Character';
import {Icon} from '../Icon';
import {cn} from '../lib/utils';
import {LINES, LINE, FRAMEWORKS, parseTrialBalance, checkTrialBalance, suggestLine, computeStatements, blockers, adjustmentError, nextAdjustmentStatus, reversalOf, frameworkFor, inputsHash, reportHtml, fmt} from './core.mjs';

type Project = any;
const now = () => new Date().toISOString();
const statusText: Record<string, string> = {draft: 'Qoralama', review: 'Tekshiruvda', approved: 'Tasdiqlangan', reversed: 'Storno qilingan'};
const statusTone: Record<string, string> = {draft: 'border-border bg-background text-muted-foreground', review: 'border-transparent bg-warning/12 text-warning-ink', approved: 'border-transparent bg-success/10 text-success', reversed: 'border-border bg-muted text-muted-foreground'};
const StatusChip = ({status}: {status: string}) => <Badge variant="outline" className={cn('rounded-full', statusTone[status])}>{status === 'approved' ? <Icon name="check"/> : status === 'review' ? <Icon name="clock"/> : null}{statusText[status] || status}</Badge>;

/**
 * Company MHXS transformation workspace: TB → mapping → adjustments → report draft.
 * Numbers come only from the uploaded TB, approved mappings and approved adjustments (see core.mjs).
 */
export function MhxsProjects({company, projects, setProjects, actor, onOpenInEditor, onDocx}: {company: any; projects: Project[]; setProjects: (fn: (all: Project[]) => Project[]) => void; actor: string; onOpenInEditor: (html: string, title: string) => void; onDocx: (html: string, title: string) => void}) {
  const mine = projects.filter(p => p.companyId === company.id).sort((a, b) => b.year - a.year);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const project = mine.find(p => p.id === selectedId) || mine[0] || null;
  const update = (fn: (p: Project) => Project, action?: string, detail = '') => setProjects(all => all.map(p => {
    if (p.id !== project.id) return p;
    const next = fn(p);
    return action ? {...next, audit: [{at: now(), by: actor, action, detail}, ...(next.audit || [])].slice(0, 2000)} : next;
  }));

  return <section aria-labelledby="mhxs-projects" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="mhxs-projects" className="text-lg font-semibold tracking-tight">MHXS transformatsiya loyihasi</h2>
        <p className="text-sm text-pretty text-muted-foreground">Aylanma-saldo vedomosti → hisoblar mappingi → tuzatishlar → hisobot qoralamasi. Har raqam manbaga bog‘langan.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {mine.length > 1 && <NativeSelect aria-label="Loyiha" value={project?.id} onChange={e => setSelectedId(e.target.value)}>{mine.map(p => <NativeSelectOption key={p.id} value={p.id}>{p.year} · {p.reportDate}</NativeSelectOption>)}</NativeSelect>}
        <Button variant={mine.length ? 'outline' : 'default'} onClick={() => setCreating(true)}><Icon name="plus"/>Yangi loyiha</Button>
      </div>
    </div>
    {project ? <ProjectView key={project.id} project={project} company={company} actor={actor} update={update} onOpenInEditor={onOpenInEditor} onDocx={onDocx}/> :
      <Card><CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
        <Character pose="invite" width={160} className="max-sm:w-28!"/>
        <div className="flex flex-col gap-2 sm:items-start">
          <h3 className="text-lg font-semibold">MHXS loyihasini boshlang</h3>
          <p className="max-w-[60ch] text-sm text-pretty text-muted-foreground">Kerak bo‘ladi: yil oxiridagi aylanma-saldo vedomosti (CSV: hisob, nomi, boshlang‘ich/aylanma/yakuniy debet va kredit), hisob siyosati va transformatsiya tuzatishlari uchun dalil hujjatlar. Birinchi marta o‘tilsa — ochilish balansi ham.</p>
          <Button className="mt-1" onClick={() => setCreating(true)}><Icon name="plus"/>MHXS loyihasini boshlash</Button>
        </div>
      </CardContent></Card>}
    <NewProjectDialog open={creating} company={company} actor={actor} existingYears={mine.map(p => p.year)} onClose={() => setCreating(false)} onCreate={p => { setProjects(all => [p, ...all]); setSelectedId(p.id); setCreating(false); toast.success('MHXS loyihasi yaratildi. Endi aylanma-saldo vedomostini yuklang.'); }}/>
  </section>;
}

function NewProjectDialog({open, company, actor, existingYears, onClose, onCreate}: any) {
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - (new Date().getMonth() < 6 ? 1 : 0));
  const [first, setFirst] = useState(false);
  const [early, setEarly] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return setError('Yilni to‘g‘ri kiriting.');
    if (existingYears.includes(year)) return setError(`${year}-yil uchun loyiha allaqachon bor.`);
    const currency = String(f.get('currency') || 'UZS').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return setError('Valyuta kodini 3 harf bilan yozing (masalan, UZS).');
    const framework = frameworkFor(year, early);
    onCreate({id: crypto.randomUUID(), companyId: company.id, year, reportDate: `${year}-12-31`, comparativeDate: `${year - 1}-12-31`, currency, basis: 'Full IFRS',
      framework, earlyAdoption: early && year < 2027, firstTime: first, transitionDate: first ? `${year - 1}-01-01` : '', exemptions: '', openingConfirmed: false,
      preparer: actor, reviewer: '', status: 'draft', tb: {rows: []}, mapping: {}, adjustments: [], snapshots: [],
      audit: [{at: now(), by: actor, action: 'Loyiha yaratildi', detail: `${year} · ${FRAMEWORKS[framework].label}`}]});
  }
  return <Dialog open={open} onOpenChange={v => !v && onClose()}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>Yangi MHXS loyihasi</DialogTitle><DialogDescription>{company.name} · hisobot bazasi: to‘liq MHXS (Full IFRS). Boshqa bazalar aralashtirilmaydi.</DialogDescription></DialogHeader>
    <form onSubmit={submit} noValidate><FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field><FieldLabel htmlFor="mhxs-year">Hisobot yili</FieldLabel><Input id="mhxs-year" type="number" inputMode="numeric" min={2000} max={2100} value={year} onChange={e => setYear(Number(e.target.value))}/></Field>
        <Field><FieldLabel htmlFor="mhxs-currency">Taqdimot valyutasi</FieldLabel><Input id="mhxs-currency" name="currency" defaultValue="UZS" maxLength={3} className="uppercase"/></Field>
      </div>
      <Label className="flex items-start gap-2 font-normal"><Checkbox checked={first} onCheckedChange={v => setFirst(v === true)} className="mt-0.5"/><span><span className="font-medium">Birinchi marta MHXSga o‘tish (IFRS 1)</span><span className="block text-sm text-muted-foreground">O‘tish sanasi, ochilish balansi va ozod etishlar bo‘yicha qaror alohida qayd etiladi.</span></span></Label>
      {year < 2027 && <Label className="flex items-start gap-2 font-normal"><Checkbox checked={early} onCheckedChange={v => setEarly(v === true)} className="mt-0.5"/><span><span className="font-medium">IFRS 18 ni erta qo‘llash</span><span className="block text-sm text-muted-foreground">Aks holda {year}-yil uchun IAS 1 bo‘yicha taqdimot ishlatiladi. IFRS 18 2027-yil 1-yanvardan majburiy.</span></span></Label>}
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">Taqdimot asosi: <span className="font-medium text-foreground">{FRAMEWORKS[frameworkFor(year, early)].label}</span></p>
      {error && <FieldError>{error}</FieldError>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Bekor qilish</Button><Button type="submit"><Icon name="check"/>Yaratish</Button></DialogFooter>
    </FieldGroup></form>
  </DialogContent></Dialog>;
}

function ProjectView({project, company, actor, update, onOpenInEditor, onDocx}: any) {
  const [tab, setTab] = useState('tb');
  const stats = useMemo(() => computeStatements(project), [project]);
  const blocks = useMemo(() => blockers(project), [project]);
  const mappedCount = (project.tb?.rows || []).filter((r: any) => project.mapping?.[r.account]?.status === 'approved').length;
  const open = (project.adjustments || []).filter((a: any) => a.status === 'draft' || a.status === 'review').length;
  // Changing inputs after approval re-opens the project; the approved snapshot stays in history.
  const edit = (fn: (p: Project) => Project, action: string, detail = '') => update((p: Project) => ({...fn(p), status: p.status === 'approved' ? 'draft' : p.status}), action, detail);
  const steps = [
    ['tb', '1. Aylanma-saldo', project.tb?.rows?.length ? `${project.tb.rows.length} hisob` : 'Yuklanmagan'],
    ['mapping', '2. Mapping', project.tb?.rows?.length ? `${mappedCount}/${project.tb.rows.length}` : '—'],
    ['adjustments', '3. Tuzatishlar', `${(project.adjustments || []).length}${open ? ` · ${open} ochiq` : ''}`],
    ['report', '4. Hisobot', statusText[project.status]],
    ['audit', 'Tarix', `${(project.audit || []).length}`],
  ];
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b py-4">
      <CardTitle className="flex flex-wrap items-center gap-2 text-base">{project.year}-yil · {project.reportDate} holatiga<StatusChip status={project.status}/></CardTitle>
      <CardDescription>{FRAMEWORKS[project.framework].label}{project.earlyAdoption ? ' (erta qo‘llash)' : ''} · {project.currency} · Tayyorlovchi: {project.preparer || '—'}{project.firstTime ? ' · IFRS 1 birinchi o‘tish' : ''}</CardDescription>
    </CardHeader>
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <div className="overflow-x-auto border-b px-2 sm:px-4"><TabsList className="h-auto gap-1 bg-transparent p-0">{steps.map(([id, label, hint]) => <TabsTrigger key={id} value={id} className="flex-col items-start gap-0 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><span className="text-sm font-medium">{label}</span><span className="text-xs font-normal text-muted-foreground tabular-nums">{hint}</span></TabsTrigger>)}</TabsList></div>
      <TabsContent value="tb" className="p-4 sm:p-6"><TrialBalanceStep project={project} edit={edit}/></TabsContent>
      <TabsContent value="mapping" className="p-4 sm:p-6"><MappingStep project={project} edit={edit} actor={actor}/></TabsContent>
      <TabsContent value="adjustments" className="p-4 sm:p-6"><AdjustmentsStep project={project} edit={edit} update={update} actor={actor}/></TabsContent>
      <TabsContent value="report" className="p-4 sm:p-6"><ReportStep project={project} company={company} stats={stats} blocks={blocks} update={update} edit={edit} actor={actor} onOpenInEditor={onOpenInEditor} onDocx={onDocx}/></TabsContent>
      <TabsContent value="audit" className="p-4 sm:p-6"><ol role="list" className="flex flex-col divide-y">{(project.audit || []).map((e: any, i: number) => <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm"><span><span className="font-medium">{e.action}</span>{e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}</span><span className="text-muted-foreground tabular-nums">{e.by} · {new Date(e.at).toLocaleString('uz-UZ')}</span></li>)}</ol></TabsContent>
    </Tabs>
  </Card>;
}

function TrialBalanceStep({project, edit}: any) {
  const [errors, setErrors] = useState<string[]>([]);
  const [paste, setPaste] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const checks = checkTrialBalance(project.tb);
  function load(text: string, fileName: string) {
    const tb = parseTrialBalance(text);
    setErrors(tb.errors);
    if (!tb.rows.length) return;
    // Suggestions are stored as suggestions only; nothing counts until the accountant approves it.
    edit((p: Project) => {
      const mapping = {...(p.mapping || {})};
      for (const r of tb.rows) if (!mapping[r.account]) { const line = suggestLine(r.account); if (line) mapping[r.account] = {line, status: 'suggested'}; }
      return {...p, tb: {rows: tb.rows.map(({line, ...r}: any) => r), hasOpening: !!tb.hasOpening, hasTurnover: !!tb.hasTurnover, fileName}, mapping};
    }, 'Aylanma-saldo vedomosti yuklandi', `${fileName} · ${tb.rows.length} hisob${tb.errors.length ? ` · ${tb.errors.length} qator o‘qilmadi` : ''}`);
    setPaste('');
  }
  const rows = project.tb?.rows || [];
  const total = (k: string) => rows.reduce((s: number, r: any) => s + (r[k] || 0), 0);
  return <div className="flex flex-col gap-5">
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
        <p className="text-sm font-medium">CSV fayl (Excel’dan «CSV UTF-8» qilib saqlang)</p>
        <p className="text-sm text-muted-foreground">Ustunlar sarlavhadan topiladi: <span className="text-foreground">Hisob, Nomi, Boshlang‘ich debet/kredit, Aylanma debet/kredit, Yakuniy debet/kredit</span>. Ruscha sarlavhalar ham o‘qiladi.</p>
        <input ref={input} type="file" accept=".csv,.txt,text/csv" className="sr-only" aria-label="Aylanma-saldo CSV fayli" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) load(await f.text(), f.name); }}/>
        <Button variant="outline" className="self-start" onClick={() => input.current?.click()}><Icon name="upload"/>{rows.length ? 'Yangi versiyani yuklash' : 'CSV yuklash'}</Button>
      </div>
      <Field><FieldLabel htmlFor="tb-paste">Yoki jadvalni joylashtiring</FieldLabel><Textarea id="tb-paste" rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Hisob;Nomi;Yakuniy debet;Yakuniy kredit"/><Button variant="outline" size="sm" className="self-start" disabled={!paste.trim()} onClick={() => load(paste, 'joylashtirilgan jadval')}>O‘qish</Button></Field>
    </div>
    {errors.length > 0 && <div role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger"><p className="font-medium">Fayl to‘liq o‘qilmadi</p><ul className="mt-1 list-disc pl-5">{errors.slice(0, 8).map(e => <li key={e}>{e}</li>)}</ul></div>}
    {rows.length > 0 && <>
      <ul role="list" className="flex flex-col gap-1.5">{checks.map((c: any) => <li key={c.text} className={cn('flex items-start gap-2 text-sm', c.level === 'block' ? 'text-danger' : c.level === 'warn' ? 'text-warning-ink' : 'text-success')}><Icon name={c.level === 'ok' ? 'check' : 'alert'} size={16} className="mt-0.5 shrink-0"/>{c.text}</li>)}</ul>
      <div className="overflow-hidden rounded-xl border"><div className="max-h-[420px] overflow-auto"><Table>
        <TableHeader className="sticky top-0 z-10 bg-muted"><TableRow><TableHead>Hisob</TableHead><TableHead>Nomi</TableHead>{project.tb.hasTurnover && <><TableHead className="text-right">Aylanma Dt</TableHead><TableHead className="text-right">Aylanma Kt</TableHead></>}<TableHead className="text-right">Yakuniy Dt</TableHead><TableHead className="text-right">Yakuniy Kt</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r: any) => <TableRow key={r.account}><TableCell className="font-medium tabular-nums">{r.account}</TableCell><TableCell className="max-w-64 truncate">{r.name}</TableCell>{project.tb.hasTurnover && <><TableCell className="text-right tabular-nums">{fmt(r.turnDebit)}</TableCell><TableCell className="text-right tabular-nums">{fmt(r.turnCredit)}</TableCell></>}<TableCell className="text-right tabular-nums">{fmt(r.closeDebit)}</TableCell><TableCell className="text-right tabular-nums">{fmt(r.closeCredit)}</TableCell></TableRow>)}
          <TableRow className="bg-muted/60 font-semibold"><TableCell colSpan={2}>Jami</TableCell>{project.tb.hasTurnover && <><TableCell className="text-right tabular-nums">{fmt(total('turnDebit'))}</TableCell><TableCell className="text-right tabular-nums">{fmt(total('turnCredit'))}</TableCell></>}<TableCell className="text-right tabular-nums">{fmt(total('closeDebit'))}</TableCell><TableCell className="text-right tabular-nums">{fmt(total('closeCredit'))}</TableCell></TableRow>
        </TableBody></Table></div></div>
      <p className="text-sm text-muted-foreground">Manba: {project.tb.fileName || '—'}. Yangi versiya yuklansa, oldingi mapping saqlanadi; o‘zgarish tarixga yoziladi.</p>
    </>}
  </div>;
}

const lineOptions = (statement?: string) => LINES.filter(l => !statement || l.statement === statement);
function LineSelect({value, onChange, label, id}: {value: string; onChange: (v: string) => void; label: string; id?: string}) {
  return <NativeSelect id={id} aria-label={label} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full min-w-52">
    <NativeSelectOption value="" disabled>Satrni tanlang</NativeSelectOption>
    <optgroup label="Moliyaviy holat">{lineOptions('sfp').map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>
    <optgroup label="Foyda yoki zarar">{lineOptions('pl').map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>
  </NativeSelect>;
}

function MappingStep({project, edit, actor}: any) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const rows = project.tb?.rows || [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">Avval 1-bosqichda aylanma-saldo vedomostini yuklang.</p>;
  const mapping = project.mapping || {};
  const open = rows.filter((r: any) => mapping[r.account]?.status !== 'approved');
  const shown = onlyOpen ? open : rows;
  const setLine = (account: string, line: string) => edit((p: Project) => ({...p, mapping: {...p.mapping, [account]: {line, status: 'approved', by: actor, at: now()}}}), 'Mapping tasdiqlandi', `${account} → ${LINE[line]?.label}`);
  const approveSuggestion = (account: string) => setLine(account, mapping[account].line);
  const suggested = open.filter((r: any) => mapping[r.account]?.status === 'suggested');
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-pretty text-muted-foreground"><span className="font-medium text-foreground">{rows.length - open.length} / {rows.length}</span> hisob tasdiqlangan. «Taklif» — BHMS hisob rejasi bo‘yicha dastlabki moslik; siz tasdiqlamaguningizcha hisobotga kirmaydi.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Label className="flex items-center gap-2 font-normal"><Checkbox checked={onlyOpen} onCheckedChange={v => setOnlyOpen(v === true)}/>Faqat tasdiqlanmaganlar</Label>
        {suggested.length > 0 && <Button size="sm" variant="outline" onClick={() => { if (confirm(`${suggested.length} ta taklifni ko‘rib chiqdingizmi? Ular sizning nomingizdan tasdiqlanadi.`)) edit((p: Project) => ({...p, mapping: {...p.mapping, ...Object.fromEntries(suggested.map((r: any) => [r.account, {line: p.mapping[r.account].line, status: 'approved', by: actor, at: now()}]))}}), 'Takliflar tasdiqlandi', `${suggested.length} ta hisob`); }}><Icon name="check"/>Ko‘rib chiqilgan {suggested.length} ta taklifni tasdiqlash</Button>}
      </div>
    </div>
    {shown.length ? <div className="overflow-hidden rounded-xl border"><div className="max-h-[520px] overflow-auto"><Table>
      <TableHeader className="sticky top-0 z-10 bg-muted"><TableRow><TableHead>Hisob</TableHead><TableHead>Yakuniy qoldiq</TableHead><TableHead>MHXS satri</TableHead><TableHead>Holat</TableHead></TableRow></TableHeader>
      <TableBody>{shown.map((r: any) => { const m = mapping[r.account]; return <TableRow key={r.account}>
        <TableCell className="whitespace-normal"><span className="font-medium tabular-nums">{r.account}</span><span className="block max-w-64 text-sm text-muted-foreground">{r.name}</span></TableCell>
        <TableCell className="tabular-nums">{fmt((r.closeDebit || 0) - (r.closeCredit || 0))}</TableCell>
        <TableCell><LineSelect label={`${r.account} hisobi uchun MHXS satri`} value={m?.line} onChange={v => setLine(r.account, v)}/></TableCell>
        <TableCell>{m?.status === 'approved' ? <span className="text-sm text-success"><Icon name="check" size={14} className="mr-1 inline"/>{m.by}</span> : m?.status === 'suggested' ? <Button size="sm" variant="outline" onClick={() => approveSuggestion(r.account)}>Taklifni tasdiqlash</Button> : <span className="text-sm text-danger">Biriktirilmagan</span>}</TableCell>
      </TableRow>; })}</TableBody></Table></div></div>
      : <div className="flex items-center gap-4 rounded-xl border bg-success/5 p-4"><Character pose="complete" width={96}/><p className="text-sm"><span className="font-medium">Barcha hisoblar tasdiqlab biriktirildi.</span> Endi kerakli transformatsiya tuzatishlarini kiriting yoki hisobotni ko‘ring.</p></div>}
  </div>;
}

function AdjustmentsStep({project, edit, update, actor}: any) {
  const [form, setForm] = useState<any>({debitLine: '', creditLine: '', amount: '', reason: '', standard: '', evidence: ''});
  const [error, setError] = useState('');
  const list = project.adjustments || [];
  function add(e: React.FormEvent) {
    e.preventDefault();
    const a = {...form, amount: Number(String(form.amount).replace(/\s/g, '').replace(',', '.'))};
    const msg = adjustmentError(a);
    if (msg) return setError(msg);
    setError('');
    edit((p: Project) => ({...p, adjustments: [...(p.adjustments || []), {...a, id: crypto.randomUUID(), status: 'draft', author: actor, createdAt: now()}]}), 'Tuzatish qo‘shildi', `Dt ${LINE[a.debitLine].label} / Kt ${LINE[a.creditLine].label} · ${fmt(a.amount)}`);
    setForm({debitLine: '', creditLine: '', amount: '', reason: '', standard: '', evidence: ''});
  }
  const act = (a: any, action: string) => {
    const status = nextAdjustmentStatus(a.status, action);
    const label = {submit: 'Tuzatish tekshiruvga yuborildi', approve: 'Tuzatish tasdiqlandi', reject: 'Tuzatish qaytarildi'}[action] || action;
    (action === 'approve' ? edit : update)((p: Project) => ({...p, adjustments: p.adjustments.map((x: any) => x.id === a.id ? {...x, status, ...(action === 'approve' ? {reviewer: actor, approvedAt: now()} : {})} : x)}), label, `${a.reason} · ${fmt(a.amount)}`);
  };
  const reverse = (a: any) => edit((p: Project) => ({...p, adjustments: [...p.adjustments, reversalOf(a, crypto.randomUUID(), actor, now())]}), 'Storno yozuvi yaratildi', `${a.reason} · ${fmt(a.amount)}`);
  return <div className="flex flex-col gap-5">
    <form onSubmit={add} noValidate className="rounded-xl border p-4"><FieldGroup className="gap-4">
      <p className="text-sm font-medium">Yangi transformatsion tuzatish (qoralama)</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Field><FieldLabel htmlFor="adj-dt">Debet</FieldLabel><LineSelect id="adj-dt" label="Debet satri" value={form.debitLine} onChange={v => setForm({...form, debitLine: v})}/></Field>
        <Field><FieldLabel htmlFor="adj-kt">Kredit</FieldLabel><LineSelect id="adj-kt" label="Kredit satri" value={form.creditLine} onChange={v => setForm({...form, creditLine: v})}/></Field>
        <Field><FieldLabel htmlFor="adj-sum">Summa ({project.currency})</FieldLabel><Input id="adj-sum" inputMode="decimal" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="tabular-nums"/></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field className="md:col-span-2"><FieldLabel htmlFor="adj-reason">Sabab</FieldLabel><Input id="adj-reason" value={form.reason} maxLength={400} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Masalan: ijara shartnomasi bo‘yicha foydalanish huquqi aktivi"/></Field>
        <Field><FieldLabel htmlFor="adj-std">Standart va tahrir</FieldLabel><Input id="adj-std" value={form.standard} maxLength={120} onChange={e => setForm({...form, standard: e.target.value})} placeholder="IFRS 16 (2016)"/></Field>
      </div>
      <Field><FieldLabel htmlFor="adj-ev">Dalil (hujjat, sahifa, katak)</FieldLabel><Input id="adj-ev" value={form.evidence} maxLength={400} onChange={e => setForm({...form, evidence: e.target.value})} placeholder="Ijara shartnomasi №12, 3-bet; hisob-kitob varag‘i B14"/><FieldDescription>Tuzatish faqat tasdiqlangach hisobotga ta’sir qiladi. Tasdiqlangan yozuv tahrirlanmaydi — storno va yangi yozuv bilan tuzatiladi.</FieldDescription></Field>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" className="self-start"><Icon name="plus"/>Qoralama sifatida qo‘shish</Button>
    </FieldGroup></form>
    {list.length ? <ul role="list" className="flex flex-col divide-y rounded-xl border">{list.map((a: any) => <li key={a.id} className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
      <div className="min-w-0 flex-1"><p className="text-sm font-medium">Dt {LINE[a.debitLine]?.label} / Kt {LINE[a.creditLine]?.label} · <span className="tabular-nums">{fmt(a.amount)}</span></p><p className="text-sm text-pretty text-muted-foreground">{a.reason} · {a.standard}{a.evidence ? ` · Dalil: ${a.evidence}` : ''} · {a.author}{a.reviewer ? ` → ${a.reviewer}` : ''}</p></div>
      <StatusChip status={a.status}/>
      {a.status === 'draft' && <Button size="sm" variant="outline" onClick={() => act(a, 'submit')}>Tekshiruvga</Button>}
      {a.status === 'review' && <><Button size="sm" variant="outline" onClick={() => act(a, 'reject')}>Qaytarish</Button><Button size="sm" onClick={() => act(a, 'approve')}><Icon name="check"/>Tasdiqlash</Button></>}
      {a.status === 'approved' && !a.reverses && !list.some((x: any) => x.reverses === a.id) && <Button size="sm" variant="ghost" onClick={() => reverse(a)}>Storno</Button>}
    </li>)}</ul> : <p className="text-sm text-muted-foreground">Hali tuzatish yo‘q.</p>}
  </div>;
}

function ReportStep({project, company, stats, blocks, update, edit, actor, onOpenInEditor, onDocx}: any) {
  const [drill, setDrill] = useState<string | null>(null);
  const html = useMemo(() => reportHtml(project, company), [project, company]);
  const title = `${company.name} — MHXS qoralamasi ${project.year}`;
  const approve = () => {
    const hash = inputsHash(project);
    update((p: Project) => ({...p, status: 'approved', reviewer: actor, snapshots: [{id: crypto.randomUUID(), at: now(), by: actor, hash, framework: p.framework, totals: {assets: stats.totalAssets, equity: stats.totalEquity, liabilities: stats.totalLiabilities, profit: stats.pl.profit}}, ...(p.snapshots || [])].slice(0, 20)}), 'Hisobot qoralamasi tasdiqlandi', `Snapshot ${hash}`);
  };
  const Row = ({id, value}: {id: string; value?: number}) => { const v = value ?? stats.amounts[id]; if (Math.abs(v) < 0.005 && !stats.sources[id].accounts.length) return null; return <li><button type="button" onClick={() => setDrill(id)} className="flex w-full items-baseline justify-between gap-4 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"><span>{LINE[id].label}</span><span className="tabular-nums">{fmt(v)}</span></button></li>; };
  const Total = ({label, value}: {label: string; value: number}) => <li className="flex items-baseline justify-between gap-4 border-t px-2 py-1.5 text-sm font-semibold"><span>{label}</span><span className="tabular-nums">{fmt(value)}</span></li>;
  const group = (g: string) => LINES.filter(l => l.statement === 'sfp' && l.group === g && l.id !== 'retained').map(l => <Row key={l.id} id={l.id}/>);
  const pl = (id: string) => LINE[id].side === 'credit' ? stats.amounts[id] : -stats.amounts[id];
  const src = drill ? stats.sources[drill] : null;
  return <div className="flex flex-col gap-5">
    {blocks.length ? <div className="flex flex-col gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-start">
      <Character pose="review" width={104} className="max-sm:hidden"/>
      <div><p className="font-medium">Yakuniy paketdan oldin {blocks.length} ta masala ochiq</p><ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-pretty">{blocks.map((b: string) => <li key={b}>{b}</li>)}</ul><p className="mt-2 text-sm text-muted-foreground">Qoralamani ko‘rish va redaktorga olish mumkin, lekin tasdiqlash yopiq.</p></div>
    </div> : project.status === 'approved' ? <div className="flex items-center gap-4 rounded-xl border border-success/25 bg-success/5 p-4"><Character pose="complete" width={104} className="max-sm:w-20!"/><div><p className="font-medium">{project.year}-yil MHXS ishchi qoralamasi tasdiqlandi</p><p className="text-sm text-muted-foreground">Snapshot {project.snapshots?.[0]?.hash} · {project.snapshots?.[0]?.by} · {project.snapshots?.[0] && new Date(project.snapshots[0].at).toLocaleString('uz-UZ')}. Kirish ma’lumotlari o‘zgarsa, loyiha qayta qoralamaga o‘tadi, bu snapshot esa tarixda qoladi.</p></div></div>
      : <p className="rounded-xl border border-success/25 bg-success/5 p-3 text-sm text-success">Nazoratlar o‘tdi: TB teng, barcha hisoblar biriktirilgan, balans muvozanatda, ochiq tuzatish yo‘q.</p>}
    {project.firstTime && <IfrsOne project={project} edit={edit}/>}
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Moliyaviy holat to‘g‘risidagi hisobot</h3><ul role="list" className="flex flex-col">
        <li className="px-2 pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Aktivlar</li>{group('Uzoq muddatli aktivlar')}{group('Joriy aktivlar')}<Total label="Jami aktivlar" value={stats.totalAssets}/>
        <li className="px-2 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Kapital</li>{group('Kapital')}<Row id="retained" value={stats.retained}/><Total label="Jami kapital" value={stats.totalEquity}/>
        <li className="px-2 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Majburiyatlar</li>{group('Uzoq muddatli majburiyatlar')}{group('Joriy majburiyatlar')}<Total label="Jami majburiyatlar" value={stats.totalLiabilities}/>
        <li className={cn('mt-2 flex justify-between rounded-md px-2 py-1.5 text-sm font-medium', Math.abs(stats.difference) > 0.5 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success')}><span>Balans nazorati (aktiv − kapital − majburiyat)</span><span className="tabular-nums">{fmt(stats.difference)}</span></li>
      </ul></div>
      <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">{FRAMEWORKS[project.framework].pl}</h3><ul role="list" className="flex flex-col">
        {project.framework === 'ifrs18' && <li className="px-2 pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Operatsion kategoriya</li>}
        <Row id="revenue" value={pl('revenue')}/><Row id="cost_of_sales" value={pl('cost_of_sales')}/><Total label="Yalpi foyda" value={stats.pl.grossProfit}/>
        <Row id="selling" value={pl('selling')}/><Row id="admin" value={pl('admin')}/><Row id="other_income" value={pl('other_income')}/><Row id="other_expenses" value={pl('other_expenses')}/><Total label="Operatsion foyda" value={stats.pl.operatingProfit}/>
        {project.framework === 'ifrs18' && <li className="px-2 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Investitsiya kategoriyasi</li>}
        <Row id="finance_income" value={pl('finance_income')}/>
        {project.framework === 'ifrs18' && <><Total label="Moliyalashtirish va foyda solig‘igacha foyda" value={stats.pl.beforeFinancing}/><li className="px-2 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Moliyalashtirish kategoriyasi</li></>}
        <Row id="finance_costs" value={pl('finance_costs')}/><Total label="Soliqqa tortilgunga qadar foyda" value={stats.pl.beforeTax}/>
        <Row id="income_tax" value={pl('income_tax')}/><Total label="Davr uchun foyda (zarar)" value={stats.pl.profit}/>
      </ul>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Pul oqimlari hisoboti (IAS 7) avtomatik tuzilmaydi: faqat ikkita qoldiqdan to‘g‘ri pul oqimi chiqmaydi. Qoralamada «[ma’lumot kerak]» bilan belgilanadi.</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => onOpenInEditor(html, title)}><Icon name="document"/>Redaktorda ochish</Button>
      <Button variant="outline" onClick={() => onDocx(html, title)}><Icon name="fileDown"/>Word (.docx)</Button>
      {project.status === 'draft' && <Button variant="outline" disabled={blocks.length > 0} onClick={() => update((p: Project) => ({...p, status: 'review'}), 'Hisobot tekshiruvga yuborildi')}>Tekshiruvga yuborish</Button>}
      {project.status === 'review' && <Button disabled={blocks.length > 0} onClick={approve}><Icon name="check"/>Tasdiqlash va snapshot</Button>}
    </div>
    {(project.snapshots || []).length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Tasdiqlangan snapshotlar ({project.snapshots.length})</summary><ul className="mt-2 flex flex-col gap-1 text-muted-foreground">{project.snapshots.map((s: any) => <li key={s.id} className="tabular-nums">{new Date(s.at).toLocaleString('uz-UZ')} · {s.by} · {s.hash} · aktivlar {fmt(s.totals.assets)} · foyda {fmt(s.totals.profit)}</li>)}</ul></details>}
    <Dialog open={!!drill} onOpenChange={v => !v && setDrill(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{drill && LINE[drill].label}</DialogTitle><DialogDescription>Bu raqam qayerdan: hisoblar va tasdiqlangan tuzatishlar.</DialogDescription></DialogHeader>
      {src && <div className="flex max-h-[60vh] flex-col gap-3 overflow-auto text-sm">
        {drill === 'retained' && <p className="text-muted-foreground">Joriy davr natijasi va foyda-zarar tuzatishlari ham shu satrga qo‘shiladi.</p>}
        <ul className="flex flex-col divide-y">{src.accounts.map((a: any) => <li key={a.account} className="flex justify-between gap-4 py-1.5"><span><span className="font-medium tabular-nums">{a.account}</span> {a.name}</span><span className="tabular-nums">{fmt(a.amount)}</span></li>)}</ul>
        {src.adjustments.length > 0 && <><p className="font-medium">Tuzatishlar</p><ul className="flex flex-col divide-y">{src.adjustments.map((a: any) => <li key={a.id} className="flex justify-between gap-4 py-1.5"><span>{a.reason}</span><span className="tabular-nums">{fmt(a.amount)}</span></li>)}</ul></>}
      </div>}
    </DialogContent></Dialog>
  </div>;
}

function IfrsOne({project, edit}: any) {
  return <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-3">
    <p className="font-medium md:col-span-3">IFRS 1 — birinchi marta qo‘llash</p>
    <Field><FieldLabel htmlFor="ifrs1-date">MHXSga o‘tish sanasi</FieldLabel><Input id="ifrs1-date" type="date" value={project.transitionDate || ''} onChange={e => edit((p: Project) => ({...p, transitionDate: e.target.value}), 'IFRS 1: o‘tish sanasi', e.target.value)}/></Field>
    <Field className="md:col-span-2"><FieldLabel htmlFor="ifrs1-ex">Qo‘llangan ozod etish va istisnolar (ekspert qarori)</FieldLabel><Textarea id="ifrs1-ex" rows={2} defaultValue={project.exemptions || ''} maxLength={4000} onBlur={e => e.target.value !== (project.exemptions || '') && edit((p: Project) => ({...p, exemptions: e.target.value}), 'IFRS 1: ozod etishlar yangilandi')}/></Field>
    <Label className="flex items-center gap-2 font-normal md:col-span-3"><Checkbox checked={!!project.openingConfirmed} onCheckedChange={v => edit((p: Project) => ({...p, openingConfirmed: v === true}), v === true ? 'IFRS 1: ochilish balansi tasdiqlandi' : 'IFRS 1: ochilish balansi tasdig‘i olindi')}/>Ochilish balansi va oldingi bazadan MHXSga solishtirishlar tekshirildi</Label>
  </div>;
}
