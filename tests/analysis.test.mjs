import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisState, analysisLabels} from '../src/ai-domain.mjs';

const result = issues => ({summary: 's', issues, limitations: []});
test('every uploaded file reaches one explicit analysis state', () => {
  const base = {id: 'd1', fileName: 'a.pdf', status: 'review_required'};
  assert.equal(analysisState({...base, status: 'missing', fileName: ''}), 'none');
  assert.equal(analysisState({...base, fileName: 'a.docx'}), 'unsupported');
  assert.equal(analysisState(base), 'not_started');
  assert.equal(analysisState({...base, ai: {status: 'queued', fileKey: 'd1'}}), 'queued');
  assert.equal(analysisState({...base, ai: {status: 'processing', fileKey: 'd1'}}), 'processing');
  assert.equal(analysisState({...base, ai: {status: 'error', fileKey: 'd1', error: 'x'}}), 'failed');
  assert.equal(analysisState({...base, ai: {status: 'complete', fileKey: 'd1', result: result([])}}), 'completed');
  assert.equal(analysisState({...base, ai: {status: 'complete', fileKey: 'd1', result: result([{title: 't', detail: 'd', evidence: 'e', action: 'a'}])}}), 'needs_review');
  // A result for an older version of the file does not count for the new version.
  assert.equal(analysisState({...base, fileKey: 'v2', ai: {status: 'complete', fileKey: 'd1', result: result([])}}), 'not_started');
  assert.equal(analysisState({...base, ai: {status: 'complete', fileKey: 'd1', result: {summary: 1}}}), 'failed');
  for (const s of ['not_started', 'queued', 'processing', 'needs_review', 'completed', 'failed', 'unsupported']) assert.ok(analysisLabels[s]);
});

import {companyContext, parseChat, runChat, validateChat} from '../chat-service.mjs';
const state = {companies: [{id: 'c1', name: 'Atlas', stir: '1'}, {id: 'c2', name: 'Boshqa'}], docs: [
  {id: 'd1', company: 'c1', title: 'Faktura', fileName: 'f.pdf', status: 'review_required', period: '2026-09', ai: {status: 'complete', fileKey: 'd1', result: {kind: 'invoice', summary: 'Faktura 100', total: 100, currency: 'UZS', number: '12', evidence: 'Jami 100', issues: [], limitations: []}}},
  {id: 'd2', company: 'c2', title: 'Maxfiy', fileName: 's.pdf', status: 'accepted', ai: {status: 'complete', fileKey: 'd2', result: {kind: 'other', summary: 'SECRET 999', issues: [], limitations: []}}},
  {id: 'd3', company: 'c1', title: 'Shartnoma', fileName: 's.pdf', status: 'review_required'},
]};
const completed = obj => ({status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify(obj)}]}]});

test('chat context contains only this company and marks unanalysed files', () => {
  const built = companyContext(state, 'c1');
  assert.doesNotMatch(built.text, /SECRET|Maxfiy|d2/);
  assert.deepEqual([...built.ids], ['d1']);
  assert.equal(built.context.notAnalysed[0].documentId, 'd3');
  assert.throws(() => companyContext(state, 'nope'), /topilmadi/);
  assert.throws(() => validateChat({question: ' '}), /Savol/);
});

test('chat drops citations outside the company and flags numbers without a source', () => {
  const ids = new Set(['d1']);
  const r = parseChat(completed({answer: 'Jami 100 UZS.', insufficient: false, suggestion: null, sources: [{documentId: 'd1', quote: 'Jami 100', location: '1-bet'}, {documentId: 'd2', quote: 'SECRET', location: null}]}), ids);
  assert.deepEqual(r.sources.map(s => s.documentId), ['d1']);
  assert.equal(r.insufficient, false);
  const guessed = parseChat(completed({answer: 'Taxminan 5000 so‘m.', insufficient: false, suggestion: null, sources: []}), ids);
  assert.equal(guessed.insufficient, true);
});

test('chat sends only the company context to the model', async () => {
  let sent;
  const fetcher = async (url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify(completed({answer: 'Yetarli dalil yo‘q', insufficient: true, suggestion: null, sources: []}))); };
  const r = await runChat(validateChat({question: 'Shartnoma summasi?'}), companyContext(state, 'c1'), {key: 'k', model: 'm', fetcher});
  assert.equal(r.insufficient, true);
  assert.doesNotMatch(JSON.stringify(sent.input), /SECRET/);
  assert.equal(sent.store, false);
});
