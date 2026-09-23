import test from 'node:test';
import assert from 'node:assert/strict';
import {initialsOf, greeting, fileKind} from '../src/format.mjs';
import {periodSummary} from '../src/company-overview.mjs';

const company = {id: 'a', name: 'Atlas Savdo'};
const doc = (id, status, extra = {}) => ({id, company: 'a', title: id, fileName: id + '.pdf', status, scope: 'periodic', period: '2026-09', date: '2026-09-1' + id.length, ...extra});

test('initials take at most two letters and survive quoted names', () => {
  assert.equal(initialsOf('Dilnoza Karimova'), 'DK');
  assert.equal(initialsOf('«Atlas» Savdo Servis'), 'AS');
  assert.equal(initialsOf('Atlas'), 'A');
  assert.equal(initialsOf('   '), '—');
  assert.equal(initialsOf(null), '—');
});

test('the greeting follows the hour', () => {
  const at = h => greeting(new Date(2026, 8, 20, h, 0));
  assert.equal(at(2), 'Xayrli tun');
  assert.equal(at(8), 'Xayrli tong');
  assert.equal(at(14), 'Xayrli kun');
  assert.equal(at(21), 'Xayrli kech');
});

test('file kind labels group the formats the app accepts', () => {
  assert.equal(fileKind('hisob.PDF'), 'PDF');
  assert.equal(fileKind('reyestr.xlsx'), 'XLS');
  assert.equal(fileKind('bank.csv'), 'CSV');
  assert.equal(fileKind('skan.jpeg'), 'IMG');
  assert.equal(fileKind(''), 'FAYL');
});

test('the period summary names the state, the progress and the next action', () => {
  const empty = periodSummary([], company, '2026-09');
  assert.equal(empty.state, 'empty');
  assert.deepEqual(empty.progress, {done: 0, total: 0, percent: 0});
  assert.equal(empty.action.kind, 'upload');

  const review = periodSummary([doc('a', 'review_required'), doc('bb', 'review_required'), doc('ccc', 'accepted')], company, '2026-09');
  assert.equal(review.state, 'review');
  assert.equal(review.title, '2 ta hujjat qaroringizni kutmoqda');
  assert.equal(review.action.documentId, 'a');
  assert.equal(review.progress.percent, 33);

  const waiting = periodSummary([doc('a', 'missing'), doc('bb', 'accepted')], company, '2026-09');
  assert.equal(waiting.state, 'waiting');
  assert.equal(waiting.title, '1 ta hujjat kutilmoqda');

  const ready = periodSummary([doc('a', 'accepted'), doc('bb', 'waived')], company, '2026-09');
  assert.equal(ready.state, 'ready');
  assert.equal(ready.progress.percent, 100);

  const closed = periodSummary([doc('a', 'accepted')], company, '2026-09', ['a:2026-09']);
  assert.equal(closed.state, 'closed');
});

test('the period summary ignores other companies, demos, other periods and permanent files', () => {
  const summary = periodSummary([
    doc('a', 'review_required'),
    doc('other', 'review_required', {company: 'b'}),
    doc('demo', 'review_required', {demo: true}),
    doc('old', 'review_required', {period: '2026-08'}),
    doc('ustav', 'review_required', {scope: 'permanent'}),
    doc('cancelled', 'cancelled'),
  ], company, '2026-09');
  assert.equal(summary.progress.total, 1);
  assert.equal(summary.title, '1 ta hujjat qaroringizni kutmoqda');
});
