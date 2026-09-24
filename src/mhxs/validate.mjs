// Workspace-state validation for MHXS data. Shared by the Cloudflare worker and the local server,
// so both refuse the same things: every MHXS record belongs to an existing company of this workspace.
import {LINE} from './core.mjs';

const idOk = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id) && !id.includes('..');
const str = (v, max, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
const opt = (v, max) => v === undefined || v === null || str(v, max);
const fin = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e15;
const date = v => v === undefined || v === null || v === '' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));

/**
 * MHXS editor documents. Records created since company binding (v ≥ 2) must name a company;
 * older records may still be unassigned until a person attaches them.
 */
export function validateMsfoList(list, companyIds) {
  if (!Array.isArray(list) || list.length > 5_000) throw new Error('MSFO ro‘yxati yaroqsiz.');
  const ids = new Set();
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !idOk(item.id) || ids.has(item.id) || !str(item.title, 240, true) || !['statements', 'text'].includes(item.mode)) throw new Error('MSFO hujjati yaroqsiz.');
    if (item.fileKey != null && !idOk(item.fileKey)) throw new Error('MSFO fayl kaliti yaroqsiz.');
    if (item.sourceFileKey != null && !idOk(item.sourceFileKey)) throw new Error('MSFO manba fayli yaroqsiz.');
    if (item.job != null && (typeof item.job !== 'object' || !/^resp_[A-Za-z0-9_-]{8,200}$/.test(String(item.job.id)))) throw new Error('MSFO topshirig‘i yaroqsiz.');
    if (item.companyId != null && !companyIds.has(item.companyId)) throw new Error('MSFO kompaniyasi topilmadi.');
    if (Number(item.v) >= 2 && item.companyId == null) throw new Error('MSFO hujjati kompaniyaga biriktirilishi shart.');
    ids.add(item.id);
  }
}

const PROJECT_STATUS = new Set(['draft', 'review', 'approved']);
const ADJ_STATUS = new Set(['draft', 'review', 'approved', 'reversed']);
const MAP_STATUS = new Set(['suggested', 'approved']);

/** MHXS transformation projects (trial balance → mapping → adjustments → report). */
export function validateMhxsProjects(list, companyIds) {
  if (!Array.isArray(list) || list.length > 200) throw new Error('MHXS loyihalari ro‘yxati yaroqsiz.');
  const ids = new Set();
  for (const p of list) {
    const bad = message => { throw new Error(`MHXS loyihasi yaroqsiz: ${message}`); };
    if (!p || typeof p !== 'object' || Array.isArray(p) || !idOk(p.id) || ids.has(p.id)) bad('identifikator');
    ids.add(p.id);
    if (!companyIds.has(p.companyId)) bad('kompaniya topilmadi');
    if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100) bad('yil');
    if (!date(p.reportDate) || !date(p.comparativeDate) || !date(p.transitionDate)) bad('sana');
    if (!/^[A-Z]{3}$/.test(String(p.currency || ''))) bad('valyuta');
    if (!['ias1', 'ifrs18'].includes(p.framework)) bad('taqdimot asosi');
    if (!PROJECT_STATUS.has(p.status)) bad('holat');
    for (const k of ['preparer', 'reviewer', 'basis']) if (!opt(p[k], 120)) bad(k);
    if (!opt(p.exemptions, 4000)) bad('IFRS 1 izohi');
    for (const k of ['firstTime', 'earlyAdoption', 'openingConfirmed']) if (p[k] !== undefined && typeof p[k] !== 'boolean') bad(k);
    const tb = p.tb || {rows: []};
    if (typeof tb !== 'object' || !Array.isArray(tb.rows) || tb.rows.length > 3_000) bad('TB');
    for (const r of tb.rows) {
      if (!r || !str(r.account, 40, true) || !str(r.name ?? '', 240)) bad('TB qatori');
      for (const k of ['openDebit', 'openCredit', 'turnDebit', 'turnCredit', 'closeDebit', 'closeCredit']) if (r[k] !== undefined && !fin(r[k])) bad('TB summasi');
    }
    if (!opt(tb.fileName, 240)) bad('TB fayl nomi');
    const mapping = p.mapping || {};
    if (typeof mapping !== 'object' || Array.isArray(mapping) || Object.keys(mapping).length > 3_000) bad('mapping');
    for (const [account, m] of Object.entries(mapping)) {
      if (!str(account, 40, true) || !m || !LINE[m.line] || !MAP_STATUS.has(m.status) || !opt(m.by, 120) || !opt(m.at, 40)) bad('mapping qatori');
    }
    const adj = p.adjustments || [];
    if (!Array.isArray(adj) || adj.length > 1_000) bad('tuzatishlar');
    const adjIds = new Set();
    for (const a of adj) {
      if (!a || !idOk(a.id) || adjIds.has(a.id) || !LINE[a.debitLine] || !LINE[a.creditLine] || !fin(a.amount) || a.amount <= 0 || !ADJ_STATUS.has(a.status)) bad('tuzatish');
      for (const k of ['reason', 'standard', 'evidence', 'author', 'reviewer', 'createdAt', 'approvedAt', 'reverses']) if (!opt(a[k], k === 'reason' || k === 'evidence' ? 2000 : 240)) bad('tuzatish maydoni');
      adjIds.add(a.id);
    }
    const snaps = p.snapshots || [];
    if (!Array.isArray(snaps) || snaps.length > 20) bad('snapshotlar');
    for (const s of snaps) if (!s || !idOk(s.id) || !str(s.hash, 16, true) || !str(s.at, 40, true) || !opt(s.by, 120) || !['ias1', 'ifrs18'].includes(s.framework) || !s.totals || typeof s.totals !== 'object') bad('snapshot');
    const audit = p.audit || [];
    if (!Array.isArray(audit) || audit.length > 2_000) bad('audit');
    for (const e of audit) if (!e || !str(e.at, 40, true) || !str(e.action, 120, true) || !opt(e.by, 120) || !opt(e.detail, 1000)) bad('audit yozuvi');
  }
}
