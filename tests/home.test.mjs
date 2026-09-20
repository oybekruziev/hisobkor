import test from 'node:test';
import assert from 'node:assert/strict';
import {waitingForReview, workspaceHeadline} from '../src/dashboard-model.mjs';
import {statuses, statusTone, companyStates, periodBlockers} from '../src/domain.mjs';
import {appRoute} from '../src/company-overview.mjs';

const companies = [{id: 'a', name: 'Atlas Savdo'}, {id: 'b', name: 'Baraka Tekstil'}];
const doc = (id, company, extra = {}) => ({id, company, title: id, fileName: id + '.pdf', status: 'review_required', scope: 'periodic', period: '2026-09', date: '2026-09-10', ...extra});

test('the attention list keeps only documents waiting for a decision in this period', () => {
  const docs = [
    doc('new', 'a', {date: '2026-09-18'}),
    doc('old-period', 'a', {period: '2026-08'}),
    doc('permanent', 'b', {scope: 'permanent', period: '2026-01', date: '2026-09-01'}),
    doc('accepted', 'a', {status: 'accepted'}),
    doc('missing', 'a', {status: 'missing', fileName: ''}),
    doc('demo', 'a', {demo: true}),
    doc('gone', 'deleted-company'),
  ];
  const waiting = waitingForReview(companies, docs, '2026-09');
  assert.deepEqual(waiting.map(x => x.doc.id), ['new', 'permanent']);
  assert.equal(waiting[0].company.name, 'Atlas Savdo');
});

test('the headline says how much work is waiting and for how many companies', () => {
  assert.deepEqual(workspaceHeadline([]).title, 'Hammasi joyida');
  assert.equal(workspaceHeadline([]).tone, 'calm');
  const one = workspaceHeadline([{doc: doc('x', 'a'), company: companies[0]}]);
  assert.equal(one.title, '1 ta hujjat tekshiruvingizni kutmoqda');
  assert.match(one.text, /Atlas Savdo/);
  const two = workspaceHeadline([{doc: doc('x', 'a'), company: companies[0]}, {doc: doc('y', 'b'), company: companies[1]}]);
  assert.equal(two.title, '2 ta hujjat tekshiruvingizni kutmoqda');
  assert.match(two.text, /^2 ta kompaniya/);
});

test('every status has one label and one tone, shared with the company states', () => {
  assert.deepEqual(Object.keys(statuses), ['accepted', 'review_required', 'missing', 'correction_requested', 'waived']);
  assert.equal(statuses.review_required, 'Tekshirish kerak');
  assert.equal(companyStates.review, statuses.review_required);
  assert.equal(companyStates.waiting, 'Hujjat kutilmoqda');
  assert.equal(statusTone('accepted'), 'success');
  assert.equal(statusTone('review_required'), 'warning');
  assert.equal(statusTone('correction_requested'), 'issue');
  assert.equal(statusTone('missing'), 'neutral');
  assert.equal(statusTone('nimadir'), 'neutral');
});

test('closing a period names what is still open, in reading order', () => {
  const blockers = periodBlockers([
    {status: 'accepted'}, {status: 'review_required'}, {status: 'missing'},
    {status: 'missing'}, {status: 'correction_requested'}, {status: 'cancelled'},
  ]);
  assert.deepEqual(blockers.map(b => b.status), ['review_required', 'correction_requested', 'missing']);
  assert.deepEqual(blockers.map(b => b.count), [1, 1, 2]);
  assert.equal(blockers[0].label, '1 ta hujjat tekshirilishi kerak');
  assert.deepEqual(periodBlockers([{status: 'accepted'}, {status: 'waived'}]), []);
  assert.equal(periodBlockers([]).length, 1);
});

test('the home route is reachable and unknown routes fall back to it', () => {
  assert.equal(appRoute('dashboard', companies), 'dashboard');
  assert.equal(appRoute('', companies), 'dashboard');
  assert.equal(appRoute('companies', companies), 'dashboard');
  assert.equal(appRoute('company/b/history', companies), 'company/b/history');
  assert.equal(appRoute('company/deleted/documents', companies), 'dashboard');
  assert.equal(appRoute('dashboard', []), 'dashboard');
});
