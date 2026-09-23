// Browser-side: any HTML (editor, Word paste, AI output) → block model → canonical, escaped HTML.
// Nothing from the input survives except text, the formatting the block model knows, and table spans.
import {blocksToHtml, tidyRuns} from './docx.mjs';

type Run = {t?: string; b?: boolean; i?: boolean; u?: boolean; br?: boolean};
type Fmt = {b?: boolean; i?: boolean; u?: boolean};

const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'NOSCRIPT', 'HEAD', 'TITLE', 'META', 'LINK', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'XML']);
const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'PRE', 'HR', 'FIGURE', 'DL', 'DT', 'DD', 'ADDRESS', 'CENTER']);
const ALIGNS = new Set(['left', 'center', 'right', 'justify']);

function fmtOf(el: HTMLElement, fmt: Fmt): Fmt {
  const tag = el.tagName, style = el.style;
  const weight = style?.fontWeight;
  return {
    b: fmt.b || tag === 'STRONG' || tag === 'B' || weight === 'bold' || Number(weight) >= 600,
    i: fmt.i || tag === 'EM' || tag === 'I' || style?.fontStyle === 'italic',
    u: fmt.u || tag === 'U' || (style?.textDecoration || style?.textDecorationLine || '').includes('underline'),
  };
}

function inline(node: Node, fmt: Fmt, out: Run[]) {
  if (node.nodeType === 3) {
    const t = (node.nodeValue || '').replace(/[\s ]+/g, m => m.includes(' ') && !/[\n\r\t]/.test(m) ? ' '.repeat(m.length) : ' ');
    if (t) out.push({t, ...(fmt.b && {b: true}), ...(fmt.i && {i: true}), ...(fmt.u && {u: true})});
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;
  if (DROP.has(el.tagName)) return;
  if (el.tagName === 'BR') { out.push({br: true}); return; }
  // Word marks empty/hidden helper spans like this.
  if (el.style?.display === 'none' || el.getAttribute('style')?.includes('mso-hide:all')) return;
  const next = fmtOf(el, fmt);
  const isBlock = BLOCK.has(el.tagName);
  if (isBlock && out.length && !out[out.length - 1].br) out.push({br: true});
  el.childNodes.forEach(c => inline(c, next, out));
  if (isBlock && out.length && !out[out.length - 1].br) out.push({br: true});
}

function runsOf(el: Node, fmt: Fmt = {}): Run[] {
  const out: Run[] = [];
  el.childNodes.forEach(c => inline(c, fmt, out));
  const tidy = tidyRuns(out) as Run[];
  // Trim edges of the paragraph.
  while (tidy.length && tidy[0].br) tidy.shift();
  if (tidy[0]?.t) tidy[0].t = tidy[0].t.replace(/^ +/, '');
  const last = tidy[tidy.length - 1];
  if (last?.t) last.t = last.t.replace(/ +$/, '');
  return tidy.filter(r => r.br || r.t);
}

function alignOf(el: HTMLElement) {
  const a = (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  return ALIGNS.has(a) && a !== 'left' ? a : undefined;
}
const span = (value: string | null) => { const n = Number(value); return Number.isInteger(n) && n > 1 && n <= 50 ? n : undefined; };

function listItems(list: HTMLElement, items: Run[][]) {
  for (const li of Array.from(list.children) as HTMLElement[]) {
    if (li.tagName !== 'LI') { const r = runsOf(li); if (r.length) items.push(r); continue; }
    // Nested lists are flattened after their parent item (the block model is one level deep).
    const clone = li.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('ul,ol').forEach(n => n.remove());
    const r = runsOf(clone);
    if (r.length) items.push(r);
    li.querySelectorAll(':scope > ul, :scope > ol').forEach(n => listItems(n as HTMLElement, items));
  }
}

function tableBlock(table: HTMLTableElement) {
  const rows: any[] = [];
  for (const tr of Array.from(table.rows)) {
    if (tr.closest('table') !== table) continue;
    const inHead = tr.parentElement?.tagName === 'THEAD';
    const cells = Array.from(tr.cells).map(cell => {
      const c: any = {runs: runsOf(cell)};
      const cs = span(cell.getAttribute('colspan')), rs = span(cell.getAttribute('rowspan'));
      if (cs) c.colspan = cs;
      if (rs) c.rowspan = rs;
      if (inHead || cell.tagName === 'TH') c.header = true;
      return c;
    });
    if (cells.length) rows.push({cells});
  }
  return rows.length ? {type: 'table', rows} : null;
}

function walk(parent: Node, blocks: any[]) {
  let pending: Node[] = [];
  const flush = () => {
    if (!pending.length) return;
    const holder = document.createElement('div');
    pending.forEach(n => holder.appendChild(n.cloneNode(true)));
    pending = [];
    const runs = runsOf(holder);
    if (runs.length) blocks.push({type: 'p', runs});
  };
  parent.childNodes.forEach(node => {
    if (node.nodeType === 1 && DROP.has((node as HTMLElement).tagName)) return;
    if (node.nodeType !== 1 || !BLOCK.has((node as HTMLElement).tagName)) { pending.push(node); return; }
    flush();
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'HR') return;
    if (tag === 'TABLE') { const t = tableBlock(el as HTMLTableElement); if (t) blocks.push(t); return; }
    if (tag === 'UL' || tag === 'OL') { const items: Run[][] = []; listItems(el, items); if (items.length) blocks.push({type: 'list', ordered: tag === 'OL', items}); return; }
    if (tag === 'LI') { const r = runsOf(el); if (r.length) blocks.push({type: 'list', ordered: false, items: [r]}); return; }
    const hasBlockChild = Array.from(el.children).some(c => BLOCK.has(c.tagName));
    if (hasBlockChild && !/^H[1-6]$/.test(tag) && tag !== 'P') { walk(el, blocks); return; }
    const runs = runsOf(el);
    const level = /^H([1-6])$/.exec(tag)?.[1];
    const type = level ? `h${Math.min(3, Number(level))}` : 'p';
    if (!runs.length) return;
    const block: any = {type, runs};
    const align = alignOf(el);
    if (align) block.align = align;
    blocks.push(block);
  });
  flush();
  // Merge adjacent lists of the same kind (Word pastes one <ol> per item sometimes).
  for (let i = blocks.length - 1; i > 0; i--) if (blocks[i].type === 'list' && blocks[i - 1].type === 'list' && blocks[i].ordered === blocks[i - 1].ordered) { blocks[i - 1].items.push(...blocks[i].items); blocks.splice(i, 1); }
  return blocks;
}

export function htmlToBlocks(html: string) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
  return walk(doc.body, []);
}

/** The only way HTML enters the editor. */
export function sanitizeHtml(html: string) {
  return blocksToHtml(htmlToBlocks(html));
}

export function plainText(html: string) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Plain text pasted into the "paste" box → paragraphs (tab-separated lines become a table). */
export function textToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i].includes('\t')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('\t')) rows.push(lines[i++].split('\t'));
      out.push(`<table><thead><tr>${rows[0].map(c => `<th>${esc(c.trim())}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (lines[i].trim()) out.push(`<p>${esc(lines[i].trim())}</p>`);
    i++;
  }
  return sanitizeHtml(out.join(''));
}
