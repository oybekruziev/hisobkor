import {validateMsfoList, validateMhxsProjects} from '../src/mhxs/validate.mjs';
export const MAX_WORKSPACE_BYTES = 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FILE_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['text/csv', 'csv'],
  ['application/json', 'json'],
]);

export function validFileId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id) && !id.includes('..');
}

const text = (value, max, required = true) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

// Kept in sync with server-storage.mjs, without Node filesystem dependencies.
export function validateWorkspaceState(state) {
  if (state === null) return;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Ish joyi ma’lumoti obyekt bo‘lishi kerak.');
  for (const key of ['companies', 'docs', 'activity', 'closed']) {
    if (!Array.isArray(state[key])) throw new Error(`${key} ro‘yxat bo‘lishi kerak.`);
    if (state[key].length > 50_000) throw new Error(`${key} ro‘yxati juda katta.`);
  }
  const companyIds = new Set();
  for (const company of state.companies) {
    if (!company || typeof company !== 'object' || Array.isArray(company) || !validFileId(company.id) || companyIds.has(company.id) || !text(company.name, 240)) throw new Error('Kompaniya ma’lumoti yaroqsiz.');
    companyIds.add(company.id);
    for (const key of ['legal', 'stir', 'contact', 'phone', 'owner']) if (key in company && !text(company[key], 500, false)) throw new Error('Kompaniya maydoni yaroqsiz.');
  }
  const documentIds = new Set();
  const statuses = new Set(['accepted', 'review_required', 'missing', 'correction_requested', 'waived', 'cancelled']);
  for (const doc of state.docs) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc) || !validFileId(doc.id) || documentIds.has(doc.id) || !companyIds.has(doc.company) || !text(doc.title, 500) || !text(doc.fileName, 500, false) || !statuses.has(doc.status)) throw new Error('Hujjat ma’lumoti yaroqsiz.');
    if ('fileKey' in doc && doc.fileKey !== null && !validFileId(doc.fileKey)) throw new Error('Hujjat fayl kaliti yaroqsiz.');
    documentIds.add(doc.id);
  }
  for (const event of state.activity) {
    if (!event || typeof event !== 'object' || Array.isArray(event) || !text(event.title, 500) || !text(event.detail, 2000, false)) throw new Error('Faollik ma’lumoti yaroqsiz.');
    if ('id' in event && !validFileId(event.id)) throw new Error('Faollik identifikatori yaroqsiz.');
    if (event.companyId !== undefined && event.companyId !== null && !companyIds.has(event.companyId)) throw new Error('Faollik kompaniyasi topilmadi.');
  }
  if (state.closed.some(value => !text(value, 260))) throw new Error('Yopilgan davr ma’lumoti yaroqsiz.');
  if (!('profile' in state) || (state.profile !== null && (!state.profile || typeof state.profile !== 'object' || Array.isArray(state.profile)))) throw new Error('Profil yaroqsiz.');
  if (state.profile) {
    if (!text(state.profile.fullName, 100) || !text(state.profile.phone, 20)) throw new Error('Profil maydoni yaroqsiz.');
    for (const key of ['email', 'workspace']) if (key in state.profile && !text(state.profile[key], 240, false)) throw new Error('Profil maydoni yaroqsiz.');
  }
  if ('aiAuto' in state && typeof state.aiAuto !== 'boolean') throw new Error('AI sozlamasi yaroqsiz.');
  if ('msfo' in state) validateMsfoList(state.msfo, companyIds);
  if ('mhxs' in state) validateMhxsProjects(state.mhxs, companyIds);
}

export function validateFile(bytes, contentType) {
  const type = String(contentType || '').split(';', 1)[0].trim().toLowerCase();
  if (!FILE_TYPES.has(type)) throw new Error('Fayl turi qo‘llab-quvvatlanmaydi.');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('Fayl hajmi 25 MBdan oshmasligi kerak.');
  const begins = (...values) => values.every((value, index) => bytes[index] === value);
  if (type === 'application/pdf' && !begins(0x25, 0x50, 0x44, 0x46, 0x2d)) throw new Error('PDF fayli yaroqsiz.');
  if (type === 'image/png' && !begins(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) throw new Error('PNG fayli yaroqsiz.');
  if (type === 'image/jpeg' && !begins(0xff, 0xd8, 0xff)) throw new Error('JPEG fayli yaroqsiz.');
  if (type.endsWith('spreadsheetml.sheet') && !begins(0x50, 0x4b, 0x03, 0x04)) throw new Error('Excel fayli yaroqsiz.');
  if (type === 'text/csv') {
    if (bytes.includes(0)) throw new Error('CSV fayli yaroqsiz.');
    try { new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { throw new Error('CSV UTF-8 formatida bo‘lishi kerak.'); }
  }
  // MSFO editor documents are stored as JSON (never as HTML, so the file endpoint cannot serve markup).
  if (type === 'application/json') {
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); } catch { throw new Error('JSON fayli yaroqsiz.'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON fayli yaroqsiz.');
  }
  return type;
}

export function eligibleDocument(doc) {
  return !!doc && !doc.demo && !!doc.fileName && doc.status !== 'missing' && validFileId(doc.id) && validFileId(doc.fileKey || doc.id);
}

export function safeDocumentName(name, contentType) {
  const ext = FILE_TYPES.get(contentType) || 'bin';
  const base = String(name || 'hujjat').normalize('NFKC').replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim().slice(0, 220);
  return base && base.toLowerCase().endsWith(`.${ext}`) ? base : `${base || 'hujjat'}.${ext}`;
}
