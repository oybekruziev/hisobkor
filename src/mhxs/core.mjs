// MHXS (IFRS) transformation core — pure and deterministic, so the same inputs always give the same report.
// Chain: trial balance (TB) → checks → account mapping (accountant-approved) → adjustments journal
// (draft → review → approved) → statement lines → controls. Nothing here guesses a number: an
// account without an approved mapping is "unmapped" and blocks the final package.

/** Presentation lines. `side` decides the sign: debit-natured lines = Dt − Kt, credit-natured = Kt − Dt. */
export const LINES = [
  // Statement of financial position — assets
  {id: 'ppe', label: 'Asosiy vositalar', statement: 'sfp', group: 'Uzoq muddatli aktivlar', side: 'debit'},
  {id: 'intangibles', label: 'Nomoddiy aktivlar', statement: 'sfp', group: 'Uzoq muddatli aktivlar', side: 'debit'},
  {id: 'lt_investments', label: 'Uzoq muddatli investitsiyalar', statement: 'sfp', group: 'Uzoq muddatli aktivlar', side: 'debit'},
  {id: 'other_nca', label: 'Boshqa uzoq muddatli aktivlar', statement: 'sfp', group: 'Uzoq muddatli aktivlar', side: 'debit'},
  {id: 'inventories', label: 'Tovar-moddiy zaxiralar', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  {id: 'trade_receivables', label: 'Savdo debitorlik qarzlari', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  {id: 'prepayments', label: 'Berilgan avanslar va boshqa debitorlar', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  {id: 'tax_assets', label: 'Soliq bo‘yicha aktivlar', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  {id: 'st_investments', label: 'Qisqa muddatli investitsiyalar', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  {id: 'cash', label: 'Pul mablag‘lari va ularning ekvivalentlari', statement: 'sfp', group: 'Joriy aktivlar', side: 'debit'},
  // Equity
  {id: 'share_capital', label: 'Ustav kapitali', statement: 'sfp', group: 'Kapital', side: 'credit'},
  {id: 'reserves', label: 'Qo‘shilgan va zaxira kapitali', statement: 'sfp', group: 'Kapital', side: 'credit'},
  {id: 'treasury', label: 'Sotib olingan xususiy aksiyalar', statement: 'sfp', group: 'Kapital', side: 'credit'},
  {id: 'retained', label: 'Taqsimlanmagan foyda', statement: 'sfp', group: 'Kapital', side: 'credit'},
  // Liabilities
  {id: 'lt_borrowings', label: 'Uzoq muddatli kreditlar va qarzlar', statement: 'sfp', group: 'Uzoq muddatli majburiyatlar', side: 'credit'},
  {id: 'other_ncl', label: 'Boshqa uzoq muddatli majburiyatlar', statement: 'sfp', group: 'Uzoq muddatli majburiyatlar', side: 'credit'},
  {id: 'trade_payables', label: 'Savdo kreditorlik qarzlari', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  {id: 'advances_received', label: 'Olingan avanslar', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  {id: 'st_borrowings', label: 'Qisqa muddatli kreditlar va qarzlar', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  {id: 'tax_liabilities', label: 'Soliqlar bo‘yicha majburiyatlar', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  {id: 'employee_liabilities', label: 'Xodimlar oldidagi majburiyatlar', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  {id: 'other_cl', label: 'Boshqa joriy majburiyatlar', statement: 'sfp', group: 'Joriy majburiyatlar', side: 'credit'},
  // Profit or loss
  {id: 'revenue', label: 'Tushum', statement: 'pl', group: 'operating', side: 'credit'},
  {id: 'cost_of_sales', label: 'Sotilgan mahsulot tannarxi', statement: 'pl', group: 'operating', side: 'debit'},
  {id: 'selling', label: 'Sotish xarajatlari', statement: 'pl', group: 'operating', side: 'debit'},
  {id: 'admin', label: 'Ma’muriy xarajatlar', statement: 'pl', group: 'operating', side: 'debit'},
  {id: 'other_income', label: 'Boshqa operatsion daromadlar', statement: 'pl', group: 'operating', side: 'credit'},
  {id: 'other_expenses', label: 'Boshqa operatsion xarajatlar', statement: 'pl', group: 'operating', side: 'debit'},
  {id: 'finance_income', label: 'Moliyaviy daromadlar', statement: 'pl', group: 'investing', side: 'credit'},
  {id: 'finance_costs', label: 'Moliyaviy xarajatlar', statement: 'pl', group: 'financing', side: 'debit'},
  {id: 'income_tax', label: 'Foyda solig‘i', statement: 'pl', group: 'tax', side: 'debit'},
];
export const LINE = Object.fromEntries(LINES.map(l => [l.id, l]));
/** Accounts that only carry the closing of profit or loss; they belong to retained earnings in the SFP. */
const RESULT_LINE = 'retained';

/**
 * Suggested line for a local (BHMS / NAS 21) account code. A suggestion is never used until the
 * accountant approves it. Returns null when there is no safe suggestion.
 */
export function suggestLine(code) {
  const n = Number(String(code).replace(/\D/g, '').slice(0, 4).padEnd(4, '0'));
  if (!Number.isFinite(n) || !String(code).match(/\d/)) return null;
  const r = [
    [100, 299, 'ppe'], [300, 399, 'other_nca'], [400, 599, 'intangibles'], [600, 799, 'lt_investments'], [800, 999, 'other_nca'],
    [1000, 2999, 'inventories'], [3000, 3999, 'prepayments'], [4000, 4299, 'trade_receivables'], [4300, 4399, 'prepayments'],
    [4400, 4499, 'tax_assets'], [4500, 4999, 'prepayments'], [5000, 5799, 'cash'], [5800, 5899, 'st_investments'], [5900, 5999, 'cash'],
    [6000, 6299, 'trade_payables'], [6300, 6399, 'advances_received'], [6400, 6499, 'tax_liabilities'], [6500, 6599, 'tax_liabilities'],
    [6600, 6699, 'other_cl'], [6700, 6799, 'employee_liabilities'], [6800, 6899, 'st_borrowings'], [6900, 6999, 'other_cl'],
    [7000, 7799, 'lt_borrowings'], [7800, 7999, 'other_ncl'], [8300, 8399, 'share_capital'], [8400, 8599, 'reserves'],
    [8600, 8699, 'treasury'], [8700, 8899, 'retained'], [8900, 8999, 'other_ncl'],
    [9000, 9099, 'revenue'], [9100, 9199, 'cost_of_sales'], [9200, 9299, 'other_expenses'], [9300, 9399, 'other_income'],
    [9410, 9419, 'selling'], [9420, 9429, 'admin'], [9430, 9499, 'other_expenses'], [9500, 9599, 'finance_income'],
    [9600, 9699, 'finance_costs'], [9700, 9799, 'other_expenses'], [9800, 9899, 'income_tax'], [9900, 9999, RESULT_LINE],
  ].find(([a, b]) => n >= a && n <= b);
  return r ? r[2] : null;
}

const num = value => {
  if (value === null || value === undefined) return 0;
  const s = String(value).replace(/ |\s/g, '').replace(/'/g, '');
  if (!s || s === '-' || s === '—') return 0;
  // "1.234,56" / "1,234.56" / "1234,56"
  const normalised = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const v = Number(normalised);
  return Number.isFinite(v) ? v : NaN;
};
const round = v => Math.round(v * 100) / 100;

/** Parse a TB from CSV text (comma, semicolon or tab). Columns are found by header words. */
export function parseTrialBalance(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return {rows: [], errors: ['Fayl bo‘sh.']};
  const sep = [';', '\t', ','].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const split = line => {
    const out = []; let cur = '', q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map(s => s.trim());
  };
  const head = split(lines[0]).map(h => h.toLowerCase());
  const find = (...words) => head.findIndex(h => words.some(w => h.includes(w)));
  const col = {
    account: find('hisob', 'счет', 'schet', 'account', 'kod', 'код'),
    name: find('nom', 'наимен', 'name'),
    openDebit: head.findIndex(h => /(boshl|нач|opening)/.test(h) && /(debet|дебет|debit|dt)/.test(h)),
    openCredit: head.findIndex(h => /(boshl|нач|opening)/.test(h) && /(kredit|кредит|credit|kt)/.test(h)),
    turnDebit: head.findIndex(h => /(aylanma|оборот|turnover)/.test(h) && /(debet|дебет|debit|dt)/.test(h)),
    turnCredit: head.findIndex(h => /(aylanma|оборот|turnover)/.test(h) && /(kredit|кредит|credit|kt)/.test(h)),
    closeDebit: head.findIndex(h => /(yakun|oxir|кон|closing|qoldiq|сальдо)/.test(h) && !/(boshl|нач|opening)/.test(h) && /(debet|дебет|debit|dt)/.test(h)),
    closeCredit: head.findIndex(h => /(yakun|oxir|кон|closing|qoldiq|сальдо)/.test(h) && !/(boshl|нач|opening)/.test(h) && /(kredit|кредит|credit|kt)/.test(h)),
  };
  // A plain four-column file: account; name; debit; credit (closing balances).
  if (col.closeDebit < 0 && col.closeCredit < 0) {
    const d = head.findIndex(h => /^(debet|дебет|debit|dt)$/.test(h)), c = head.findIndex(h => /^(kredit|кредит|credit|kt)$/.test(h));
    if (d >= 0 && c >= 0) { col.closeDebit = d; col.closeCredit = c; }
  }
  const errors = [];
  if (col.account < 0) errors.push('«Hisob» (hisob raqami) ustuni topilmadi.');
  if (col.closeDebit < 0 || col.closeCredit < 0) errors.push('Yakuniy qoldiq ustunlari («Yakuniy debet», «Yakuniy kredit») topilmadi.');
  if (errors.length) return {rows: [], errors};
  const rows = [];
  lines.slice(1).forEach((line, i) => {
    const c = split(line);
    const account = String(c[col.account] || '').trim();
    if (!account || /jami|итого|total/i.test(account)) return;
    const get = k => (col[k] >= 0 ? num(c[col[k]]) : 0);
    const row = {account, name: col.name >= 0 ? String(c[col.name] || '').trim() : '', openDebit: get('openDebit'), openCredit: get('openCredit'),
      turnDebit: get('turnDebit'), turnCredit: get('turnCredit'), closeDebit: get('closeDebit'), closeCredit: get('closeCredit'), line: i + 2};
    if (['openDebit', 'openCredit', 'turnDebit', 'turnCredit', 'closeDebit', 'closeCredit'].some(k => Number.isNaN(row[k]))) errors.push(`${i + 2}-qator: raqam o‘qilmadi (${account}).`);
    else rows.push(row);
  });
  return {rows, errors, hasOpening: col.openDebit >= 0 && col.openCredit >= 0, hasTurnover: col.turnDebit >= 0 && col.turnCredit >= 0};
}

/** TB checks: structure, duplicates, Dt = Kt, opening + turnover = closing. Blocking ones stop the report. */
export function checkTrialBalance(tb) {
  const rows = tb?.rows || [];
  const out = [];
  const add = (level, text) => out.push({level, text});
  if (!rows.length) { add('block', 'Aylanma-saldo vedomosti (TB) yuklanmagan.'); return out; }
  const seen = new Map();
  for (const r of rows) seen.set(r.account, (seen.get(r.account) || 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1).map(([a]) => a);
  if (dups.length) add('block', `Takrorlangan hisoblar: ${dups.slice(0, 8).join(', ')}${dups.length > 8 ? '…' : ''}.`);
  const sum = k => round(rows.reduce((s, r) => s + (r[k] || 0), 0));
  const cd = sum('closeDebit'), cc = sum('closeCredit');
  if (Math.abs(cd - cc) > 0.5) add('block', `Yakuniy qoldiq teng emas: debet ${fmt(cd)}, kredit ${fmt(cc)} (farq ${fmt(round(cd - cc))}).`);
  else add('ok', `Yakuniy qoldiq teng: ${fmt(cd)}.`);
  if (tb.hasTurnover) {
    const td = sum('turnDebit'), tc = sum('turnCredit');
    if (Math.abs(td - tc) > 0.5) add('block', `Aylanmalar teng emas: debet ${fmt(td)}, kredit ${fmt(tc)}.`);
    else add('ok', 'Debet va kredit aylanmalari teng.');
  } else add('warn', 'Aylanma ustunlari yo‘q: foyda yoki zarar hisoboti faqat daromad/xarajat hisoblarining yakuniy qoldig‘idan tuziladi.');
  if (tb.hasOpening && tb.hasTurnover) {
    const bad = rows.filter(r => Math.abs(round(r.openDebit - r.openCredit + r.turnDebit - r.turnCredit) - round(r.closeDebit - r.closeCredit)) > 0.5);
    if (bad.length) add('block', `Boshlang‘ich + aylanma ≠ yakuniy qoldiq: ${bad.slice(0, 6).map(r => r.account).join(', ')}${bad.length > 6 ? '…' : ''}.`);
    else add('ok', 'Boshlang‘ich qoldiq, aylanma va yakuniy qoldiq o‘zaro bog‘langan.');
  }
  return out;
}

export function fmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = Math.abs(v).toLocaleString('ru-RU', {minimumFractionDigits: 0, maximumFractionDigits: 2}).replace(/ /g, ' ');
  return v < 0 ? `(${s})` : s;
}

/** Presentation framework for the reporting year: IAS 1 until 2026, IFRS 18 from 2027 (or when adopted early). */
export function frameworkFor(year, earlyAdoption = false) {
  return Number(year) >= 2027 || earlyAdoption ? 'ifrs18' : 'ias1';
}
export const FRAMEWORKS = {
  ias1: {label: 'IAS 1 «Moliyaviy hisobotlarni taqdim etish»', pl: 'Foyda yoki zarar va boshqa umumlashgan daromad to‘g‘risidagi hisobot'},
  ifrs18: {label: 'IFRS 18 «Moliyaviy hisobotlarda taqdimot va ochib berish»', pl: 'Foyda yoki zarar to‘g‘risidagi hisobot'},
};

const ADJ_STATUSES = ['draft', 'review', 'approved', 'reversed'];
/** Signed effect of an approved adjustment on one line (in the line's own natural sign). */
function effectOn(line, adj) {
  const l = LINE[line]; if (!l) return 0;
  let v = 0;
  if (adj.debitLine === line) v += l.side === 'debit' ? adj.amount : -adj.amount;
  if (adj.creditLine === line) v += l.side === 'credit' ? adj.amount : -adj.amount;
  return v;
}

/**
 * Deterministic statements. Only approved mappings and approved adjustments count.
 * P&L lines come from turnover when the TB has it (debit − credit for the period), otherwise
 * from closing balances; SFP lines always from closing balances. The P&L result of the period,
 * including P&L adjustments, is added to retained earnings so the SFP balances.
 */
export function computeStatements(project) {
  const tb = project?.tb || {rows: []};
  const mapping = project?.mapping || {};
  const adjustments = (project?.adjustments || []).filter(a => a.status === 'approved');
  const amounts = Object.fromEntries(LINES.map(l => [l.id, 0]));
  const sources = Object.fromEntries(LINES.map(l => [l.id, {accounts: [], adjustments: []}]));
  const unmapped = [];
  for (const r of tb.rows || []) {
    const m = mapping[r.account];
    const closing = round((r.closeDebit || 0) - (r.closeCredit || 0));
    const isPl = m?.line && LINE[m.line]?.statement === 'pl';
    // A closed income/expense account (zero closing) keeps its period amount only on its natural side of turnover.
    const natural = isPl ? (LINE[m.line].side === 'debit' ? round((r.turnDebit || 0)) : -round((r.turnCredit || 0))) : 0;
    const base = isPl && tb.hasTurnover ? (Math.abs(closing) < 0.005 ? natural : closing) : closing;
    if (!m || m.status !== 'approved' || !LINE[m.line]) {
      if (Math.abs(closing) > 0.004 || (tb.hasTurnover && Math.abs((r.turnDebit || 0) - (r.turnCredit || 0)) > 0.004)) unmapped.push(r.account);
      continue;
    }
    const line = LINE[m.line];
    const value = line.side === 'debit' ? base : -base;
    amounts[m.line] = round(amounts[m.line] + value);
    sources[m.line].accounts.push({account: r.account, name: r.name, amount: value});
  }
  for (const a of adjustments) for (const id of [a.debitLine, a.creditLine]) {
    if (!LINE[id]) continue;
    const v = effectOn(id, a);
    if (!v) continue;
    amounts[id] = round(amounts[id] + v);
    if (!sources[id].adjustments.some(x => x.id === a.id)) sources[id].adjustments.push({id: a.id, amount: v, reason: a.reason});
  }
  // P&L: income positive, expenses negative.
  const pl = id => (LINE[id].side === 'credit' ? amounts[id] : -amounts[id]);
  const grossProfit = round(pl('revenue') + pl('cost_of_sales'));
  const operatingProfit = round(grossProfit + pl('selling') + pl('admin') + pl('other_income') + pl('other_expenses'));
  const beforeFinancing = round(operatingProfit + pl('finance_income'));
  const beforeTax = round(beforeFinancing + pl('finance_costs'));
  const profit = round(beforeTax + pl('income_tax'));
  // P&L adjustments change the period result, so they flow into retained earnings in the SFP.
  const retainedExtra = round(adjustments.reduce((s, a) => s + [...new Set([a.debitLine, a.creditLine])].filter(id => LINE[id]?.statement === 'pl').reduce((t, id) => t + (LINE[id].side === 'credit' ? effectOn(id, a) : -effectOn(id, a)), 0), 0));
  // Income/expense accounts that are not yet closed carry the unclosed result in their closing balances.
  const plClosingResult = round((tb.rows || []).reduce((s, r) => {
    const m = mapping[r.account]; if (m?.status !== 'approved' || LINE[m.line]?.statement !== 'pl') return s;
    return s + round((r.closeCredit || 0) - (r.closeDebit || 0));
  }, 0));
  const retained = round(amounts.retained + plClosingResult + retainedExtra);
  const totalAssets = round(LINES.filter(l => l.statement === 'sfp' && l.side === 'debit').reduce((s, l) => s + amounts[l.id], 0));
  const equityLines = ['share_capital', 'reserves', 'treasury'];
  const totalEquity = round(equityLines.reduce((s, id) => s + amounts[id], 0) + retained);
  const totalLiabilities = round(LINES.filter(l => l.statement === 'sfp' && l.side === 'credit' && !['share_capital', 'reserves', 'treasury', 'retained'].includes(l.id)).reduce((s, l) => s + amounts[l.id], 0));
  const difference = round(totalAssets - totalEquity - totalLiabilities);
  return {amounts, sources, unmapped, retained, totalAssets, totalEquity, totalLiabilities, difference,
    pl: {grossProfit, operatingProfit, beforeFinancing, beforeTax, profit}};
}

/** Everything that stops the final package, in reading order. Empty list = ready for review/approval. */
export function blockers(project) {
  const out = [];
  for (const c of checkTrialBalance(project?.tb)) if (c.level === 'block') out.push(c.text);
  const s = computeStatements(project);
  if (s.unmapped.length) out.push(`${s.unmapped.length} ta hisob MHXS satriga tasdiqlab biriktirilmagan: ${s.unmapped.slice(0, 6).join(', ')}${s.unmapped.length > 6 ? '…' : ''}.`);
  if ((project?.tb?.rows || []).length && Math.abs(s.difference) > 0.5) out.push(`Moliyaviy holat hisoboti muvozanatda emas: farq ${fmt(s.difference)}.`);
  const open = (project?.adjustments || []).filter(a => a.status === 'draft' || a.status === 'review');
  if (open.length) out.push(`${open.length} ta tuzatish hali tasdiqlanmagan (qoralama yoki tekshiruvda).`);
  if (project?.firstTime) {
    if (!project.transitionDate) out.push('IFRS 1: MHXSga o‘tish (ochilish balansi) sanasi kiritilmagan.');
    if (!String(project.exemptions || '').trim()) out.push('IFRS 1: qo‘llangan ozod etish va istisnolar bo‘yicha qaror yozilmagan.');
    if (!project.openingConfirmed) out.push('IFRS 1: ochilish balansi tekshirilgani tasdiqlanmagan.');
  }
  if (!project?.preparer) out.push('Tayyorlovchi ko‘rsatilmagan.');
  return out;
}

/** Validates one adjustment before it is saved. Returns an error text or null. */
export function adjustmentError(a) {
  if (!LINE[a?.debitLine] || !LINE[a?.creditLine]) return 'Debet va kredit satrini tanlang.';
  if (a.debitLine === a.creditLine) return 'Debet va kredit satri bir xil bo‘lmasin.';
  if (!(Number(a.amount) > 0)) return 'Summa musbat son bo‘lishi kerak.';
  if (!String(a.reason || '').trim()) return 'Tuzatish sababini yozing.';
  if (!String(a.standard || '').trim()) return 'Qaysi standart (masalan, IFRS 16, IAS 16) asosida ekanini yozing.';
  return null;
}

/** Status machine for adjustments. An approved entry is never edited: it is reversed and re-entered. */
export function nextAdjustmentStatus(current, action) {
  const t = {draft: {submit: 'review'}, review: {approve: 'approved', reject: 'draft'}, approved: {reverse: 'reversed'}};
  const next = t[current]?.[action];
  if (!next) throw new Error('Bu holatda bunday amal mumkin emas.');
  return next;
}
export function reversalOf(a, id, author, at) {
  return {id, debitLine: a.creditLine, creditLine: a.debitLine, amount: a.amount, reason: `Storno: ${a.reason}`, standard: a.standard,
    evidence: a.evidence || '', status: 'draft', author, createdAt: at, reverses: a.id};
}

/** Stable fingerprint of the inputs, so an approved snapshot can prove what it was computed from. */
export function inputsHash(project) {
  const body = JSON.stringify({tb: project?.tb?.rows || [], mapping: project?.mapping || {}, adj: (project?.adjustments || []).filter(a => a.status === 'approved').map(a => [a.id, a.debitLine, a.creditLine, a.amount]), framework: project?.framework});
  let h = 2166136261;
  for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** The report draft as editor HTML (tables + headings), ready for the MHXS editor and .docx export. */
export function reportHtml(project, company) {
  const s = computeStatements(project);
  const fw = FRAMEWORKS[project.framework] || FRAMEWORKS.ias1;
  const row = (label, v, strong = false) => `<tr><td>${strong ? `<strong>${esc(label)}</strong>` : esc(label)}</td><td>${strong ? `<strong>${fmt(v)}</strong>` : fmt(v)}</td></tr>`;
  const sfpGroup = g => LINES.filter(l => l.statement === 'sfp' && l.group === g && (g !== 'Kapital' || l.id !== 'retained')).filter(l => Math.abs(s.amounts[l.id]) > 0.004).map(l => row(l.label, s.amounts[l.id])).join('');
  const sum = g => LINES.filter(l => l.statement === 'sfp' && l.group === g && l.id !== 'retained').reduce((t, l) => t + s.amounts[l.id], 0);
  const pl = id => (LINE[id].side === 'credit' ? s.amounts[id] : -s.amounts[id]);
  const plRow = id => Math.abs(s.amounts[id]) > 0.004 ? row(LINE[id].label, pl(id)) : '';
  const cur = esc(project.currency || 'UZS');
  const plRows = project.framework === 'ifrs18'
    ? `<tr><td colspan="2"><strong>Operatsion kategoriya</strong></td></tr>${['revenue', 'cost_of_sales'].map(plRow).join('')}${row('Yalpi foyda', s.pl.grossProfit, true)}${['selling', 'admin', 'other_income', 'other_expenses'].map(plRow).join('')}${row('Operatsion foyda', s.pl.operatingProfit, true)}<tr><td colspan="2"><strong>Investitsiya kategoriyasi</strong></td></tr>${plRow('finance_income')}${row('Moliyalashtirish va foyda solig‘igacha foyda', s.pl.beforeFinancing, true)}<tr><td colspan="2"><strong>Moliyalashtirish kategoriyasi</strong></td></tr>${plRow('finance_costs')}${row('Soliqqa tortilgunga qadar foyda', s.pl.beforeTax, true)}${plRow('income_tax')}${row('Davr uchun foyda (zarar)', s.pl.profit, true)}`
    : `${['revenue', 'cost_of_sales'].map(plRow).join('')}${row('Yalpi foyda', s.pl.grossProfit, true)}${['selling', 'admin', 'other_income', 'other_expenses'].map(plRow).join('')}${row('Operatsion foyda', s.pl.operatingProfit, true)}${['finance_income', 'finance_costs'].map(plRow).join('')}${row('Soliqqa tortilgunga qadar foyda', s.pl.beforeTax, true)}${plRow('income_tax')}${row('Davr uchun foyda (zarar)', s.pl.profit, true)}`;
  const approved = (project.adjustments || []).filter(a => a.status === 'approved');
  return `<h1>MHXS ishchi qoralamasi</h1><p><strong>${esc(company?.name || '')}</strong> · ${esc(project.reportDate || project.year)} holatiga · ${cur}</p>`
    + `<p>Taqdimot asosi: ${esc(fw.label)}. Bu hujjat buxgalter tekshiradigan ishchi qoralama; to‘liq MHXS muvofiqlik bayonoti emas.</p>`
    + `<h2>Moliyaviy holat to‘g‘risidagi hisobot</h2><table><tr><th>Ko‘rsatkich</th><th>${cur}</th></tr>`
    + `${sfpGroup('Uzoq muddatli aktivlar')}${sfpGroup('Joriy aktivlar')}${row('Jami aktivlar', s.totalAssets, true)}`
    + `${sfpGroup('Kapital')}${row('Taqsimlanmagan foyda', s.retained)}${row('Jami kapital', s.totalEquity, true)}`
    + `${sfpGroup('Uzoq muddatli majburiyatlar')}${sfpGroup('Joriy majburiyatlar')}${row('Jami majburiyatlar', s.totalLiabilities, true)}${row('Jami kapital va majburiyatlar', round(s.totalEquity + s.totalLiabilities), true)}</table>`
    + `<h2>${esc(fw.pl)}</h2><table><tr><th>Ko‘rsatkich</th><th>${cur}</th></tr>${plRows}</table>`
    + `<h2>Transformatsion tuzatishlar</h2>${approved.length ? `<table><tr><th>Tuzatish</th><th>Summa</th></tr>${approved.map(a => `<tr><td>Dt ${esc(LINE[a.debitLine]?.label)} / Kt ${esc(LINE[a.creditLine]?.label)} — ${esc(a.reason)} (${esc(a.standard)})</td><td>${fmt(a.amount)}</td></tr>`).join('')}</table>` : '<p>Tasdiqlangan tuzatish yo‘q.</p>'}`
    + `<h2>Pul oqimlari to‘g‘risidagi hisobot</h2><p>[ma’lumot kerak: IAS 7 bo‘yicha pul oqimlarini tuzish uchun pul operatsiyalari tahlili va qiyosiy davr balansi kerak — faqat ikkita qoldiqdan tuzilmaydi]</p>`
    + `<h2>Izohlar</h2><p>[ma’lumot kerak: hisob siyosati, muhim baholar va ochib berishlar]</p>`;
}
