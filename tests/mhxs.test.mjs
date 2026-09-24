import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTrialBalance, checkTrialBalance, suggestLine, computeStatements, blockers, adjustmentError, nextAdjustmentStatus, reversalOf, frameworkFor, inputsHash, reportHtml} from '../src/mhxs/core.mjs';

const csv = `Hisob;Nomi;Boshlang'ich debet;Boshlang'ich kredit;Aylanma debet;Aylanma kredit;Yakuniy debet;Yakuniy kredit
0100;Asosiy vositalar;500;0;100;0;600;0
0200;Eskirish;0;100;0;50;0;150
1000;Materiallar;200;0;300;250;250;0
4010;Xaridorlar;100;0;900;800;200;0
5110;Hisob-kitob schyoti;300;0;1000;1100;200;0
6010;Mol yetkazib beruvchilar;0;200;500;550;0;250
6410;Budjet;0;50;50;60;0;60
8300;Ustav kapitali;0;500;0;0;0;500
8710;Taqsimlanmagan foyda;0;250;0;0;0;250
9010;Tushum;0;0;0;1000;0;1000
9110;Tannarx;0;0;600;0;600;0
9420;Ma'muriy;0;0;210;0;210;0
9810;Foyda solig'i;0;0;150;0;150;0`;

const approveAll = rows => Object.fromEntries(rows.map(r => [r.account, {line: suggestLine(r.account), status: 'approved'}]));

test('TB parsing finds columns by header words and reads Uzbek/Russian number formats', () => {
  const tb = parseTrialBalance(csv);
  assert.deepEqual(tb.errors, []);
  assert.equal(tb.rows.length, 13);
  assert.equal(tb.hasOpening, true);
  assert.equal(tb.hasTurnover, true);
  const r = parseTrialBalance('Счет,Наименование,Дебет,Кредит\n5110,Банк,"1 234,50",0\nИтого,,1234.5,0');
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].closeDebit, 1234.5);
  assert.match(parseTrialBalance('a;b\n1;2').errors.join(' '), /Hisob|qoldiq/);
});

test('TB checks block an unbalanced or duplicated TB and link opening + turnover to closing', () => {
  const tb = parseTrialBalance(csv);
  assert.ok(checkTrialBalance(tb).every(c => c.level !== 'block'));
  const broken = {...tb, rows: [...tb.rows, {...tb.rows[0]}]};
  assert.ok(checkTrialBalance(broken).some(c => c.level === 'block' && /Takrorlangan/.test(c.text)));
  const off = {...tb, rows: tb.rows.map((r, i) => i === 0 ? {...r, closeDebit: 601} : r)};
  const texts = checkTrialBalance(off).filter(c => c.level === 'block').map(c => c.text).join(' ');
  assert.match(texts, /teng emas/);
  assert.match(texts, /Boshlang‘ich \+ aylanma/);
  assert.equal(checkTrialBalance({rows: []})[0].level, 'block');
});

test('only approved mapping counts; unmapped accounts block the package', () => {
  const tb = parseTrialBalance(csv);
  const mapping = approveAll(tb.rows);
  mapping['1000'] = {line: 'inventories', status: 'suggested'};
  const s = computeStatements({tb, mapping});
  assert.deepEqual(s.unmapped, ['1000']);
  assert.ok(blockers({tb, mapping, preparer: 'A'}).some(b => /biriktirilmagan/.test(b)));
});

test('statements are deterministic and the SFP balances with the unclosed period result', () => {
  const tb = parseTrialBalance(csv);
  const project = {tb, mapping: approveAll(tb.rows), preparer: 'Buxgalter', framework: 'ias1'};
  const a = computeStatements(project), b = computeStatements(structuredClone(project));
  assert.deepEqual(a, b);
  assert.equal(a.amounts.ppe, 450); // 600 − 150 depreciation
  assert.equal(a.amounts.revenue, 1000);
  assert.equal(a.pl.grossProfit, 400);
  assert.equal(a.pl.profit, 40);
  assert.equal(a.totalAssets, 1100);
  assert.equal(a.retained, 290); // 250 opening + 40 result
  assert.equal(a.difference, 0);
  assert.deepEqual(blockers(project), []);
  assert.equal(inputsHash(project), inputsHash(structuredClone(project)));
});

test('closed income and expense accounts are read from their natural turnover side', () => {
  const closed = `Hisob;Aylanma debet;Aylanma kredit;Yakuniy debet;Yakuniy kredit
5110;1000;0;1000;0
9010;1000;1000;0;0
9110;600;600;0;0
9910;600;1000;0;400
8300;0;0;0;600`;
  const tb = parseTrialBalance(closed);
  const mapping = approveAll(tb.rows);
  const s = computeStatements({tb, mapping});
  assert.equal(s.amounts.revenue, 1000);
  assert.equal(s.amounts.cost_of_sales, 600);
  assert.equal(s.pl.profit, 400);
  assert.equal(s.retained, 400);
  assert.equal(s.difference, 0);
});

test('only approved adjustments move lines, and P&L adjustments flow to retained earnings', () => {
  const tb = parseTrialBalance(csv);
  const adj = {id: 'a1', debitLine: 'admin', creditLine: 'trade_payables', amount: 30, reason: 'Hisoblangan audit xizmati', standard: 'IAS 37', status: 'review'};
  const base = {tb, mapping: approveAll(tb.rows), preparer: 'A'};
  assert.equal(computeStatements({...base, adjustments: [adj]}).amounts.admin, 210);
  assert.ok(blockers({...base, adjustments: [adj]}).some(b => /tasdiqlanmagan/.test(b)));
  const s = computeStatements({...base, adjustments: [{...adj, status: 'approved'}]});
  assert.equal(s.amounts.admin, 240);
  assert.equal(s.amounts.trade_payables, 280);
  assert.equal(s.pl.profit, 10);
  assert.equal(s.retained, 260);
  assert.equal(s.difference, 0);
});

test('adjustment rules: validation, status machine and reversal instead of edit', () => {
  assert.match(adjustmentError({debitLine: 'admin', creditLine: 'admin', amount: 1, reason: 'x', standard: 'IAS 1'}), /bir xil/);
  assert.match(adjustmentError({debitLine: 'admin', creditLine: 'cash', amount: 0, reason: 'x', standard: 'IAS 1'}), /musbat/);
  assert.match(adjustmentError({debitLine: 'admin', creditLine: 'cash', amount: 5, reason: 'x', standard: ''}), /standart/);
  assert.equal(adjustmentError({debitLine: 'admin', creditLine: 'cash', amount: 5, reason: 'x', standard: 'IAS 7'}), null);
  assert.equal(nextAdjustmentStatus('draft', 'submit'), 'review');
  assert.equal(nextAdjustmentStatus('review', 'approve'), 'approved');
  assert.throws(() => nextAdjustmentStatus('draft', 'approve'));
  assert.throws(() => nextAdjustmentStatus('approved', 'approve'));
  const r = reversalOf({id: 'a1', debitLine: 'admin', creditLine: 'cash', amount: 5, reason: 'x', standard: 'IAS 1'}, 'a2', 'B', 't');
  assert.equal(r.debitLine, 'cash');
  assert.equal(r.status, 'draft');
  assert.equal(r.reverses, 'a1');
});

test('presentation framework follows the reporting year; IFRS 1 needs recorded decisions', () => {
  assert.equal(frameworkFor(2026), 'ias1');
  assert.equal(frameworkFor(2026, true), 'ifrs18');
  assert.equal(frameworkFor(2027), 'ifrs18');
  const tb = parseTrialBalance(csv);
  const b = blockers({tb, mapping: approveAll(tb.rows), preparer: 'A', firstTime: true});
  assert.equal(b.filter(x => /IFRS 1/.test(x)).length, 3);
  const html = reportHtml({tb, mapping: approveAll(tb.rows), framework: 'ifrs18', reportDate: '2027-12-31', currency: 'UZS'}, {name: 'Atlas'});
  assert.match(html, /Operatsion foyda/);
  assert.match(html, /Moliyalashtirish kategoriyasi/);
  assert.match(html, /IAS 7/);
  assert.doesNotMatch(html, /<script/i);
});

import {validateWorkspaceState} from '../worker/validation.mjs';
test('workspace validation binds every MHXS project to a company of this workspace', () => {
  const base = {companies: [{id: 'c1', name: 'Atlas'}], docs: [], activity: [], closed: [], profile: null};
  const project = {id: 'p1', companyId: 'c1', year: 2026, reportDate: '2026-12-31', currency: 'UZS', framework: 'ias1', status: 'draft',
    tb: {rows: [{account: '5110', name: 'Bank', closeDebit: 10, closeCredit: 0}]}, mapping: {'5110': {line: 'cash', status: 'approved'}},
    adjustments: [{id: 'a1', debitLine: 'admin', creditLine: 'cash', amount: 5, reason: 'x', standard: 'IAS 1', status: 'draft'}]};
  assert.doesNotThrow(() => validateWorkspaceState({...base, mhxs: [project]}));
  assert.throws(() => validateWorkspaceState({...base, mhxs: [{...project, companyId: 'other'}]}), /kompaniya topilmadi/);
  assert.throws(() => validateWorkspaceState({...base, mhxs: [{...project, mapping: {'5110': {line: 'nope', status: 'approved'}}}]}), /mapping/);
  assert.throws(() => validateWorkspaceState({...base, mhxs: [{...project, adjustments: [{...project.adjustments[0], amount: -1}]}]}), /tuzatish/);
  assert.throws(() => validateWorkspaceState({...base, mhxs: [{...project, framework: 'gaap'}]}), /taqdimot/);
});
