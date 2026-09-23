// Word (.docx) ⇄ block model, without DOM APIs so it runs (and is tested) in Node as well as the browser.
// Block model — the only shape the editor, the AI and the exporter exchange:
//   {type:'p'|'h1'|'h2'|'h3', align?, runs}
//   {type:'list', ordered, items:[runs]}
//   {type:'table', rows:[{cells:[{runs, colspan?, rowspan?, header?}]}]}
//   run = {t, b?, i?, u?} | {br:true}
import {unzipSync, zipSync, strFromU8, strToU8} from 'fflate';

const ALIGNS = new Set(['left', 'center', 'right', 'justify']);

// ---------- Minimal XML reader (OOXML is well-formed; no DTDs, no entities beyond the five + numeric) ----------
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"}[e.toLowerCase()]);

export function parseXml(xml) {
  const root = {name: '#root', attrs: {}, children: []};
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!(?:DOCTYPE)[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.children.push({name: '#text', text: m[1]});
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const attrs = {};
      for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decode(a[2] ?? a[3]);
      const node = {name: m[3], attrs, children: []};
      top.children.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6] !== undefined && stack.length > 1) top.children.push({name: '#text', text: decode(m[6])});
  }
  return root;
}
const kids = (node, name) => (node?.children || []).filter(c => c.name === name);
const kid = (node, name) => (node?.children || []).find(c => c.name === name);
const val = node => node?.attrs?.['w:val'];
const on = node => !!node && !['0', 'false', 'none', 'off'].includes(String(val(node) ?? 'true').toLowerCase());

// ---------- .docx → blocks ----------
function styleMap(xml) {
  const map = {};
  if (!xml) return map;
  for (const style of kids(kid(parseXml(xml), 'w:styles'), 'w:style')) {
    const name = String(val(kid(style, 'w:name')) || '').toLowerCase();
    const outline = val(kid(kid(style, 'w:pPr'), 'w:outlineLvl'));
    let level = null;
    if (name === 'title') level = 1;
    else if (/^heading\s*\d/.test(name)) level = Number(name.match(/\d/)[0]);
    else if (outline != null && Number(outline) < 9) level = Number(outline) + 1;
    if (level) map[style.attrs['w:styleId']] = level;
  }
  return map;
}
function numberingMap(xml) {
  const ordered = {};
  if (!xml) return ordered;
  const root = kid(parseXml(xml), 'w:numbering');
  const abstract = {};
  for (const a of kids(root, 'w:abstractNum')) {
    const lvl = kids(a, 'w:lvl').find(l => l.attrs['w:ilvl'] === '0') || kid(a, 'w:lvl');
    abstract[a.attrs['w:abstractNumId']] = val(kid(lvl, 'w:numFmt')) !== 'bullet';
  }
  for (const n of kids(root, 'w:num')) ordered[n.attrs['w:numId']] = !!abstract[val(kid(n, 'w:abstractNumId'))];
  return ordered;
}

function runsOf(node, out = [], fmt = {}) {
  for (const c of node.children || []) {
    if (c.name === 'w:r') {
      const pr = kid(c, 'w:rPr');
      const f = {b: on(kid(pr, 'w:b')) || fmt.b, i: on(kid(pr, 'w:i')) || fmt.i, u: (!!kid(pr, 'w:u') && val(kid(pr, 'w:u')) !== 'none') || fmt.u};
      for (const r of c.children) {
        if (r.name === 'w:t') { const t = r.children.map(x => x.text || '').join(''); if (t) out.push(run(t, f)); }
        else if (r.name === 'w:tab') out.push(run('\t', f));
        else if (r.name === 'w:br' || r.name === 'w:cr') { if (r.attrs['w:type'] !== 'page') out.push({br: true}); }
        else if (r.name === 'w:noBreakHyphen') out.push(run('-', f));
      }
    } else if (['w:hyperlink', 'w:ins', 'w:smartTag', 'w:fldSimple', 'w:sdt', 'w:sdtContent', 'w:customXml', 'w:bdo', 'w:dir'].includes(c.name)) runsOf(c, out, fmt);
  }
  return out;
}
function run(t, f) { const r = {t}; if (f.b) r.b = true; if (f.i) r.i = true; if (f.u) r.u = true; return r; }

/** Merges adjacent runs with the same formatting and trims the paragraph. */
export function tidyRuns(runs) {
  const out = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (!r.br && last && !last.br && !!last.b === !!r.b && !!last.i === !!r.i && !!last.u === !!r.u) last.t += r.t;
    else out.push({...r});
  }
  while (out.length && out[out.length - 1].br) out.pop();
  return out;
}
const plain = runs => runs.map(r => r.br ? '\n' : r.t).join('');

function paragraph(p, ctx) {
  const pr = kid(p, 'w:pPr');
  const runs = tidyRuns(runsOf(p));
  const jc = val(kid(pr, 'w:jc'));
  const align = jc === 'both' || jc === 'distribute' ? 'justify' : jc === 'end' ? 'right' : jc === 'start' ? 'left' : ALIGNS.has(jc) ? jc : undefined;
  const numPr = kid(pr, 'w:numPr');
  const numId = val(kid(numPr, 'w:numId'));
  if (numPr && numId && numId !== '0') return {list: true, ordered: !!ctx.numbering[numId], runs};
  const outline = val(kid(pr, 'w:outlineLvl'));
  const level = ctx.styles[val(kid(pr, 'w:pStyle'))] || (outline != null && Number(outline) < 9 ? Number(outline) + 1 : null);
  const block = {type: level ? `h${Math.min(3, level)}` : 'p', runs};
  if (align && align !== 'left') block.align = align;
  return block;
}

function table(tbl, ctx) {
  // First pass: cells with their grid column, span and vertical-merge state.
  const grid = kids(tbl, 'w:tr').map((tr, rowIndex) => {
    let col = 0;
    const header = rowIndex === 0 || !!kid(kid(tr, 'w:trPr'), 'w:tblHeader');
    return kids(tr, 'w:tc').map(tc => {
      const pr = kid(tc, 'w:tcPr');
      const span = Math.max(1, Number(val(kid(pr, 'w:gridSpan'))) || 1);
      const vm = kid(pr, 'w:vMerge');
      const runs = [];
      for (const p of kids(tc, 'w:p')) { if (runs.length) runs.push({br: true}); runs.push(...runsOf(p)); }
      const cell = {col, span, merge: vm ? (val(vm) === 'restart' ? 'restart' : 'continue') : null, runs: tidyRuns(runs), header};
      col += span;
      return cell;
    });
  });
  return {type: 'table', rows: grid.map((cells, r) => ({cells: cells.filter(c => c.merge !== 'continue').map(c => {
    const out = {runs: c.runs};
    if (c.span > 1) out.colspan = c.span;
    if (c.header) out.header = true;
    if (c.merge === 'restart') {
      let span = 1;
      while (grid[r + span]?.some(x => x.col === c.col && x.merge === 'continue')) span++;
      if (span > 1) out.rowspan = span;
    }
    return out;
  })})).filter(row => row.cells.length)};
}

function bodyBlocks(node, ctx, out) {
  for (const c of node.children || []) {
    if (c.name === 'w:p') {
      const b = paragraph(c, ctx);
      if (b.list) {
        const last = out[out.length - 1];
        if (last?.type === 'list' && last.ordered === b.ordered) last.items.push(b.runs);
        else out.push({type: 'list', ordered: b.ordered, items: [b.runs]});
      } else if (b.runs.length || b.type !== 'p') out.push(b);
      else if (out.length && out[out.length - 1].type !== 'p-gap') out.push({type: 'p-gap'});
    } else if (c.name === 'w:tbl') out.push(table(c, ctx));
    else if (['w:sdt', 'w:sdtContent', 'w:customXml', 'w:ins'].includes(c.name)) bodyBlocks(c, ctx, out);
  }
  return out;
}

/** Reads a .docx (Uint8Array) into blocks. Throws an Uzbek message for anything that is not a Word document. */
export function docxToBlocks(bytes) {
  let files;
  try { files = unzipSync(bytes, {filter: f => /^word\/(document|styles|numbering)\.xml$/.test(f.name)}); }
  catch { throw new Error('Fayl Word (.docx) hujjati sifatida o‘qilmadi.'); }
  if (!files['word/document.xml']) throw new Error('Fayl Word (.docx) hujjati sifatida o‘qilmadi.');
  const ctx = {styles: styleMap(files['word/styles.xml'] && strFromU8(files['word/styles.xml'])), numbering: numberingMap(files['word/numbering.xml'] && strFromU8(files['word/numbering.xml']))};
  const body = kid(kid(parseXml(strFromU8(files['word/document.xml'])), 'w:document'), 'w:body');
  const blocks = bodyBlocks(body || {children: []}, ctx, []).filter(b => b.type !== 'p-gap');
  if (!blocks.length) throw new Error('Hujjatda matn topilmadi.');
  return blocks;
}

/** Plain text of a block list (used for size checks and search). */
export function blocksText(blocks) {
  return blocks.map(b => b.type === 'list' ? b.items.map(plain).join('\n') : b.type === 'table' ? b.rows.map(r => r.cells.map(c => plain(c.runs)).join('\t')).join('\n') : plain(b.runs)).join('\n');
}

// ---------- blocks → HTML (the editor's input; every character is escaped) ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function runsHtml(runs) {
  const html = runs.map(r => {
    if (r.br) return '<br>';
    let s = esc(r.t).replace(/\t/g, ' ');
    if (r.u) s = `<u>${s}</u>`;
    if (r.i) s = `<em>${s}</em>`;
    if (r.b) s = `<strong>${s}</strong>`;
    return s;
  }).join('');
  return html || '<br>';
}
export function blocksToHtml(blocks) {
  return blocks.map(b => {
    if (b.type === 'list') { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag}>${b.items.map(i => `<li>${runsHtml(i)}</li>`).join('')}</${tag}>`; }
    if (b.type === 'table') {
      const row = r => `<tr>${r.cells.map(c => { const tag = c.header ? 'th' : 'td'; return `<${tag}${c.colspan > 1 ? ` colspan="${c.colspan}"` : ''}${c.rowspan > 1 ? ` rowspan="${c.rowspan}"` : ''}>${runsHtml(c.runs)}</${tag}>`; }).join('')}</tr>`;
      const head = b.rows.filter(r => r.cells.every(c => c.header));
      const body = b.rows.filter(r => !r.cells.every(c => c.header));
      return `<table>${head.length ? `<thead>${head.map(row).join('')}</thead>` : ''}<tbody>${body.map(row).join('')}</tbody></table>`;
    }
    const tag = ['h1', 'h2', 'h3'].includes(b.type) ? b.type : 'p';
    return `<${tag}${b.align && ALIGNS.has(b.align) ? ` style="text-align:${b.align}"` : ''}>${runsHtml(b.runs)}</${tag}>`;
  }).join('');
}

// ---------- blocks → .docx ----------
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
function runsXml(runs, extra = {}) {
  return runs.map(r => {
    if (r.br) return '<w:r><w:br/></w:r>';
    const pr = `${r.b || extra.b ? '<w:b/><w:bCs/>' : ''}${r.i ? '<w:i/><w:iCs/>' : ''}${r.u ? '<w:u w:val="single"/>' : ''}`;
    return r.t.split('\t').map((part, i) => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}${i ? '<w:tab/>' : ''}${part ? `<w:t xml:space="preserve">${xmlEsc(part)}</w:t>` : ''}</w:r>`).join('');
  }).join('');
}
const jc = a => a === 'justify' ? 'both' : a;
function para(runs, {style, align, num, bold} = {}) {
  const pr = `${style ? `<w:pStyle w:val="${style}"/>` : ''}${num ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${num}"/></w:numPr>` : ''}${align && ALIGNS.has(align) && align !== 'left' ? `<w:jc w:val="${jc(align)}"/>` : ''}`;
  return `<w:p>${pr ? `<w:pPr>${pr}</w:pPr>` : ''}${runsXml(runs, {b: bold})}</w:p>`;
}
const splitBr = runs => runs.reduce((acc, r) => { if (r.br) acc.push([]); else acc[acc.length - 1].push(r); return acc; }, [[]]);

function tableXml(b) {
  // Expand rowspans into Word's vMerge "continue" cells, column by column.
  const width = Math.max(1, ...b.rows.map(r => r.cells.reduce((n, c) => n + (c.colspan || 1), 0)));
  const pending = new Map(); // column → {left, span} still covered by a rowspan from above
  const rows = b.rows.map(r => {
    const out = [];
    const queue = [...r.cells];
    let col = 0;
    while (col < width) {
      const above = pending.get(col);
      if (above) { out.push({continue: true, span: above.span, runs: []}); if (--above.left === 0) pending.delete(col); col += above.span; continue; }
      const c = queue.shift();
      if (!c) { const next = [...pending.keys()].filter(k => k > col).sort((x, y) => x - y)[0]; if (next === undefined) break; col = next; continue; }
      const span = c.colspan || 1;
      if ((c.rowspan || 1) > 1) pending.set(col, {left: c.rowspan - 1, span});
      out.push({...c, span, restart: (c.rowspan || 1) > 1});
      col += span;
    }
    return {header: r.cells.length > 0 && r.cells.every(c => c.header), cells: out};
  });
  const colW = Math.floor(9638 / width);
  const cell = c => `<w:tc><w:tcPr><w:tcW w:w="${colW * c.span}" w:type="dxa"/>${c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : ''}${c.continue ? '<w:vMerge/>' : c.restart ? '<w:vMerge w:val="restart"/>' : ''}${c.header ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : ''}</w:tcPr>${c.continue ? '<w:p/>' : splitBr(c.runs).map(line => para(line, {bold: c.header})).join('')}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblStyle w:val="Jadval"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${colW}"/>`.repeat(width)}</w:tblGrid>${rows.map(r => `<w:tr>${r.header ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${r.cells.map(cell).join('')}</w:tr>`).join('')}</w:tbl><w:p/>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="uz-Latn-UZ"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="table" w:styleId="Jadval"><w:name w:val="Table Grid"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

/** Writes blocks as a .docx (Uint8Array). Ordered lists each restart at 1. */
export function blocksToDocx(blocks, {title = 'MSFO hujjati'} = {}) {
  const nums = [];
  const body = blocks.map(b => {
    if (b.type === 'list') {
      const id = b.ordered ? 10 + nums.push(1) : 1;
      return b.items.map(item => para(item, {style: 'ListParagraph', num: id})).join('');
    }
    if (b.type === 'table') return tableXml(b);
    const style = {h1: 'Heading1', h2: 'Heading2', h3: 'Heading3'}[b.type];
    return para(b.runs, {style, align: b.align});
  }).join('');
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body || '<w:p/>'}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const lvl = (fmt, text, ind) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${ind}" w:hanging="360"/></w:pPr>${fmt === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : ''}</w:lvl>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W}><w:abstractNum w:abstractNumId="0">${lvl('bullet', '', 720)}</w:abstractNum><w:abstractNum w:abstractNumId="1">${lvl('decimal', '%1.', 720)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums.map((_, i) => `<w:num w:numId="${11 + i}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(title)}</dc:title><dc:creator>Hisobkor.uz</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`),
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'),
    'word/document.xml': strToU8(document),
    'word/styles.xml': strToU8(STYLES),
    'word/numbering.xml': strToU8(numbering),
  }, {level: 6});
}
