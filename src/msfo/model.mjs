// Pure MSFO workspace helpers (unit-tested).
export const msfoModes = {statements: 'Moliyaviy hisobot', text: 'Matnli hujjat'};
export const msfoLanguages = {uz: 'O‘zbekcha', ru: 'Ruscha', en: 'Inglizcha'};
/** The placeholder the AI writes where the source lacks a figure. Apostrophe variants are all accepted. */
export const MSFO_MARKERS = ['[ma’lumot kerak', "[ma'lumot kerak", '[ma‘lumot kerak', '[maʼlumot kerak'];

export function countMarkers(text) {
  const value = String(text || '');
  return MSFO_MARKERS.reduce((n, marker) => n + value.split(marker).length - 1, 0);
}

/** Badge counts for the list: AI findings by severity plus open "[ma’lumot kerak]" placeholders. */
export function msfoCounts(ai, html) {
  const changes = Array.isArray(ai?.changes) ? ai.changes : [];
  const by = severity => changes.filter(c => c?.severity === severity).length;
  return {conflict: by('conflict'), warning: by('warning'), info: by('info'), missing: countMarkers(html)};
}

export function newMsfoItem({id, title, mode, language = 'uz', companyId = null, sourceName = '', instruction = ''}, now = new Date()) {
  const at = now.toISOString();
  return {
    id, title: String(title || msfoModes[mode] || 'MSFO hujjati').trim().slice(0, 240),
    mode: mode === 'text' ? 'text' : 'statements',
    language: Object.hasOwn(msfoLanguages, language) ? language : 'uz',
    companyId: companyId || null, fileKey: null, sourceName: String(sourceName || '').slice(0, 240),
    instruction: String(instruction || '').slice(0, 1000), createdAt: at, updatedAt: at, converted: false,
    counts: {conflict: 0, warning: 0, info: 0, missing: 0},
  };
}
