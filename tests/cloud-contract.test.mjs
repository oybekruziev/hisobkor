import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorker, mutationAllowed} from '../worker/app.mjs';
import {sha256Hex} from '../worker/crypto.mjs';

const state = name => ({companies: [{id: 'c1', name}], docs: [], activity: [], closed: [], profile: null, aiAuto: true});

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() {
    if (this.sql.startsWith('SELECT s.account_id')) {
      const value = this.db.sessions.get(this.args[0]);
      return value && {...value};
    }
    if (this.sql.startsWith('SELECT state_json,revision FROM workspaces')) {
      const row = this.db.workspaces.get(this.args[0]);
      return row?.account_id === this.args[1] ? {...row} : null;
    }
    if (this.sql.startsWith('SELECT id,r2_key,content_type,size,sha256 FROM file_versions')) {
      const row = this.db.files.find(file => file.account_id === this.args[0] && file.workspace_id === this.args[1] && file.logical_id === this.args[2] && file.is_current);
      return row ? {...row} : null;
    }
    if (this.sql.startsWith('SELECT revision FROM workspaces')) {
      const row = this.db.workspaces.get(this.args[0]);
      return row?.account_id === this.args[1] ? {revision: row.revision} : null;
    }
    if (this.sql.startsWith('INSERT INTO login_limits')) {
      this.db.limits ||= new Map();
      const attempts = (this.db.limits.get(this.args[0]) || 0) + 1;
      this.db.limits.set(this.args[0], attempts);
      return {attempts};
    }
    if (this.sql.startsWith('SELECT r2_key,content_type,size FROM file_versions')) {
      const row = this.db.files.find(file => file.account_id === this.args[0] && file.workspace_id === this.args[1] && file.logical_id === this.args[2] && file.is_current);
      return row ? {r2_key: row.r2_key, content_type: row.content_type, size: row.size} : null;
    }
    if (this.sql.startsWith('SELECT 1 FROM login_limits')) return this.db.limits?.has(this.args[0]) ? {1: 1} : null;
    throw new Error(`Unhandled first: ${this.sql}`);
  }
  async all() {
    if (this.sql.startsWith('SELECT id,document_id,file_key,status,result_json,error,created_at FROM ai_jobs')) return {results: this.db.jobs || []};
    throw new Error(`Unhandled all: ${this.sql}`);
  }
  async run() {
    if (this.sql.startsWith('UPDATE sessions SET')) return {meta: {changes: 1}};
    if (this.sql.startsWith('UPDATE workspaces SET')) {
      const [encoded, updated, workspaceId, accountId, revision] = this.args;
      const row = this.db.workspaces.get(workspaceId);
      if (!row || row.account_id !== accountId || row.revision !== revision) return {meta: {changes: 0}};
      Object.assign(row, {state_json: encoded, revision: row.revision + 1, updated_at: updated});
      return {meta: {changes: 1}};
    }
    if (this.sql.startsWith('INSERT INTO file_versions')) {
      const [id, account_id, workspace_id, logical_id, r2_key, content_type, size, sha256, created_at] = this.args;
      if (this.db.files.some(file => file.account_id === account_id && file.workspace_id === workspace_id && file.logical_id === logical_id)) throw new Error('UNIQUE constraint failed');
      this.db.files.push({id, account_id, workspace_id, logical_id, r2_key, content_type, size, sha256, created_at, is_current: 1});
      return {meta: {changes: 1}};
    }
    if (this.sql.startsWith('INSERT INTO login_limits') && this.sql.endsWith('DO NOTHING')) { this.db.limits ||= new Map(); if (!this.db.limits.has(this.args[0])) this.db.limits.set(this.args[0], 0); return {meta: {changes: 1}}; }
    throw new Error(`Unhandled run: ${this.sql}`);
  }
}

class FakeDB {
  constructor() { this.sessions = new Map(); this.workspaces = new Map(); this.files = []; }
  prepare(sql) { return new Statement(this, sql); }
}

async function fixture() {
  const db = new FakeDB();
  const token1 = 'a'.repeat(43), token2 = 'b'.repeat(43), future = Date.now() + 60_000;
  db.sessions.set(await sha256Hex(token1), {account_id: 'account-1', workspace_id: 'workspace-1', expires_at: future});
  db.sessions.set(await sha256Hex(token2), {account_id: 'account-2', workspace_id: 'workspace-2', expires_at: future});
  db.workspaces.set('workspace-1', {account_id: 'account-1', state_json: JSON.stringify(state('Birinchi')), revision: 0});
  db.workspaces.set('workspace-2', {account_id: 'account-2', state_json: JSON.stringify(state('Ikkinchi')), revision: 8});
  db.files.push({id: 'version-1', account_id: 'account-1', workspace_id: 'workspace-1', logical_id: 'shared-name', r2_key: 'tenant-1/file', content_type: 'application/pdf', size: 6, sha256: 'one', is_current: 1});
  db.files.push({id: 'version-2', account_id: 'account-2', workspace_id: 'workspace-2', logical_id: 'shared-name', r2_key: 'tenant-2/file', content_type: 'application/pdf', size: 6, sha256: 'two', is_current: 1});
  const objects = new Map([['tenant-1/file', new TextEncoder().encode('tenant-1/file')], ['tenant-2/file', new TextEncoder().encode('tenant-2/file')]]);
  const env = {
    DB: db, DOCUMENTS: {
      async get(key) { const body = objects.get(key); return body ? {body} : null; },
      async put(key, bytes) { objects.set(key, bytes); },
      async delete(key) { objects.delete(key); },
    },
    ASSETS: {fetch: async request => new Response(new URL(request.url).pathname)}, ENVIRONMENT: 'production', APP_HOST: 'app.hisobkor.uz', LANDING_HOST: 'hisobkor.uz',
  };
  return {db, env, token1, token2, worker: createWorker(), ctx: {waitUntil(promise) { promise.catch(() => undefined); }}};
}

test('app root serves the index asset for GET and HEAD when automatic HTML handling is disabled', async () => {
  const f = await fixture();
  f.env.ASSETS.fetch = async request => {
    if (new URL(request.url).pathname !== '/index.html') return new Response(null, {status: 404});
    return new Response(request.method === 'HEAD' ? null : '<main>Hisobkor</main>', {headers: {'Content-Type': 'text/html'}});
  };
  for (const method of ['GET', 'HEAD']) {
    const response = await f.worker.fetch(new Request('https://app.hisobkor.uz/?from=landing', {method}), f.env, f.ctx);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(await response.text(), method === 'GET' ? '<main>Hisobkor</main>' : '');
  }
});

test('session and workspace responses use server production mode', async () => {
  const f = await fixture();
  let response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/session', {headers: {Cookie: `__Host-mezon_session=${f.token1}`}}), f.env, f.ctx);
  assert.deepEqual(await response.json(), {authenticated: true, mode: 'production', storage: 'server'});
  response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/workspace', {headers: {Cookie: `__Host-mezon_session=${f.token1}`}}), f.env, f.ctx);
  const body = await response.json();
  assert.equal(body.state.companies[0].name, 'Birinchi');
  assert.equal(body.revision, 0);
});

test('same logical file id cannot cross account or workspace scope', async () => {
  const f = await fixture();
  const first = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/shared-name', {headers: {Cookie: `__Host-mezon_session=${f.token1}`}}), f.env, f.ctx);
  const second = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/shared-name', {headers: {Cookie: `__Host-mezon_session=${f.token2}`}}), f.env, f.ctx);
  assert.equal(await first.text(), 'tenant-1/file');
  assert.equal(await second.text(), 'tenant-2/file');
  assert.equal(first.headers.get('x-mezon-file-version'), 'version-1');
  assert.equal(second.headers.get('x-mezon-file-version'), 'version-2');
});

test('unknown scoped files return a caught 404 rather than rejecting fetch', async () => {
  const f = await fixture();
  const response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/not-there', {headers: {Cookie: `__Host-mezon_session=${f.token1}`}}), f.env, f.ctx);
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /topilmadi/);
});

test('logical file IDs are immutable and exact upload retries are idempotent', async () => {
  const f = await fixture();
  const headers = {Cookie: `__Host-mezon_session=${f.token1}`, Origin: 'https://app.hisobkor.uz', 'X-Mezon-Request': '1', 'Content-Type': 'application/pdf'};
  const firstBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  let response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/new-file', {method: 'PUT', headers, body: firstBytes}), f.env, f.ctx);
  assert.equal(response.status, 201);
  const versionId = (await response.json()).versionId;
  response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/new-file', {method: 'PUT', headers, body: firstBytes}), f.env, f.ctx);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {id: 'new-file', versionId, contentType: 'application/pdf', size: 6, unchanged: true});
  response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/files/new-file', {method: 'PUT', headers, body: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x32])}), f.env, f.ctx);
  assert.equal(response.status, 409);
});

test('workspace reads overlay the latest same-version background job without changing revision', async () => {
  const f = await fixture();
  const workspace = state('Birinchi');
  workspace.docs.push({id: 'doc-1', company: 'c1', title: 'Faktura', fileName: 'a.pdf', fileKey: 'file-1', status: 'review_required'});
  f.db.workspaces.get('workspace-1').state_json = JSON.stringify(workspace);
  f.db.jobs = [{id: 'job-1', document_id: 'doc-1', file_key: 'file-1', status: 'complete', result_json: JSON.stringify({summary: 'Tayyor', issues: [], limitations: []}), error: null, created_at: 2}];
  const response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/workspace', {headers: {Cookie: `__Host-mezon_session=${f.token1}`}}), f.env, f.ctx);
  const body = await response.json();
  assert.equal(body.revision, 0);
  assert.deepEqual(body.state.docs[0].ai, {status: 'complete', jobId: 'job-1', fileKey: 'file-1', result: {summary: 'Tayyor', issues: [], limitations: []}});
});

test('apex static allowlist serves landing assets and rejects unrelated files', async () => {
  const f = await fixture();
  let response = await f.worker.fetch(new Request('https://hisobkor.uz/landing.css'), f.env, f.ctx);
  assert.equal(await response.text(), '/landing.css');
  response = await f.worker.fetch(new Request('https://hisobkor.uz/landing.js'), f.env, f.ctx);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '/landing.js');
  for (const name of ['overview', 'documents', 'msfo', 'home']) {
    const pathname = `/shots/${name}.webp`;
    const image = await readFile(new URL(`../public${pathname}`, import.meta.url));
    assert.equal(image.subarray(0, 4).toString(), 'RIFF');
    assert.equal(image.subarray(8, 12).toString(), 'WEBP');
    response = await f.worker.fetch(new Request(`https://hisobkor.uz${pathname}`), f.env, f.ctx);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), pathname);
  }
  for (const host of ['hisobkor.uz', 'app.hisobkor.uz']) {
    response = await f.worker.fetch(new Request(`https://${host}/fonts/Onest-latin.woff2`), f.env, f.ctx);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '/fonts/Onest-latin.woff2');
  }
  for (const host of ['hisobkor.uz', 'app.hisobkor.uz', 'admin.hisobkor.uz']) {
    response = await f.worker.fetch(new Request(`https://${host}/brand/character-welcome-320.webp`), f.env, f.ctx);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '/brand/character-welcome-320.webp');
  }
  for (const bad of ['/brand/../wrangler.jsonc', '/brand/x.js', '/brand/sub/x.webp', '/brand/X.webp']) {
    response = await f.worker.fetch(new Request(`https://app.hisobkor.uz${bad}`), f.env, f.ctx);
    assert.equal(response.status, 404, bad);
  }
  response = await f.worker.fetch(new Request('https://hisobkor.uz/app.js'), f.env, f.ctx);
  assert.equal(response.status, 404);
});

test('workspace compare-and-swap returns 409 for a stale revision', async () => {
  const f = await fixture();
  const headers = {Cookie: `__Host-mezon_session=${f.token1}`, Origin: 'https://app.hisobkor.uz', 'X-Mezon-Request': '1', 'Content-Type': 'application/json'};
  let response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/workspace', {method: 'PUT', headers, body: JSON.stringify({state: state('Yangilangan'), revision: 0})}), f.env, f.ctx);
  assert.deepEqual(await response.json(), {revision: 1});
  response = await f.worker.fetch(new Request('https://app.hisobkor.uz/api/workspace', {method: 'PUT', headers, body: JSON.stringify({state: state('Eskirgan'), revision: 0})}), f.env, f.ctx);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).revision, 1);
});

test('mutations require exact origin and application header', () => {
  const env = {ENVIRONMENT: 'production', APP_HOST: 'app.hisobkor.uz'};
  assert.equal(mutationAllowed(new Request('https://app.hisobkor.uz/api/logout', {method: 'POST', headers: {Origin: 'https://app.hisobkor.uz', 'X-Mezon-Request': '1'}}), env), true);
  assert.equal(mutationAllowed(new Request('https://app.hisobkor.uz/api/logout', {method: 'POST', headers: {Origin: 'https://evil.example', 'X-Mezon-Request': '1'}}), env), false);
  assert.equal(mutationAllowed(new Request('https://app.hisobkor.uz/api/logout', {method: 'POST', headers: {Origin: 'https://app.hisobkor.uz'}}), env), false);
});

test('migration contains every tenant and asynchronous job boundary', async () => {
  const sql = await readFile(new URL('../migrations/0001_cloudflare.sql', import.meta.url), 'utf8');
  for (const table of ['accounts', 'workspaces', 'sessions', 'login_limits', 'file_versions', 'ai_jobs']) assert.match(sql, new RegExp(`CREATE TABLE ${table}`));
  assert.match(sql, /UNIQUE INDEX file_logical_immutable/);
  assert.match(sql, /UNIQUE[\s\S]*dedupe_key|dedupe_key TEXT NOT NULL UNIQUE/);
});

test('MSFO endpoint: needs the managed key, validates input, and enforces a daily per-account budget', async () => {
  const f = await fixture();
  const call = (body, env = f.env) => f.worker.fetch(new Request('https://app.hisobkor.uz/api/msfo', {method: 'POST', headers: {Cookie: `__Host-mezon_session=${f.token1}`, Origin: 'https://app.hisobkor.uz', 'X-Mezon-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)}), env, f.ctx);
  assert.equal((await call({mode: 'text', source: '<p>a</p>'})).status, 503);
  const env = {...f.env, OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'm', AI_MAX_DAILY_MSFO: '2'};
  assert.equal((await call({mode: 'nope', source: 'a'}, env)).status, 400);
  const original = globalThis.fetch;
  const sentBodies = [];
  const done = {status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify({title: 't', summary: 's', documentHtml: '<p>x</p>', changes: [], limitations: []})}]}]};
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'POST') { sentBodies.push(JSON.parse(init.body)); return new Response(JSON.stringify({id: 'resp_job12345', status: 'queued'})); }
    if (init.method === 'DELETE') return new Response('{}');
    return new Response(JSON.stringify(done));
  };
  const poll = (id, token = f.token1) => f.worker.fetch(new Request(`https://app.hisobkor.uz/api/msfo/jobs/${id}`, {headers: {Cookie: `__Host-mezon_session=${token}`, 'X-Mezon-Request': '1'}}), env, {waitUntil() {}});
  try {
    const started = await call({mode: 'text', source: '<p>a</p>'}, env);
    assert.equal(started.status, 200);
    assert.equal((await started.json()).job.id, 'resp_job12345');
    if (f.token2) assert.equal((await poll('resp_job12345', f.token2)).status, 404, 'another account cannot read the job');
    assert.equal((await poll('resp_other123')).status, 404);
    const finished = await (await poll('resp_job12345')).json();
    assert.equal(finished.status, 'complete');
    assert.equal(finished.result.documentHtml, '<p>x</p>');
    // A stored PDF is read from R2 by key (scoped to the caller's workspace); missing or non-PDF files are refused.
    f.db.files.push({id: 'pdf-v1', account_id: 'account-1', workspace_id: 'workspace-1', logical_id: 'pdf-1', r2_key: 'tenant-1/pdf', content_type: 'application/pdf', size: 12, sha256: 'p', is_current: 1});
    await f.env.DOCUMENTS.put('tenant-1/pdf', new TextEncoder().encode('%PDF-1.7 abc'));
    assert.equal((await call({mode: 'statements', file: {name: 'b.pdf', fileKey: 'shared-name'}}, env)).status, 400, 'stored bytes that are not a PDF');
    assert.equal((await call({mode: 'statements', file: {name: 'b.pdf', fileKey: 'missing-key'}}, env)).status, 404);
    assert.equal((await call({mode: 'statements', file: {name: 'b.pdf', fileKey: 'pdf-1'}}, env)).status, 200);
    assert.match(sentBodies.at(-1).input[0].content[1].file_data, /^data:application\/pdf;base64,JVBERi0xLjcgYWJj$/);
    assert.equal((await call({mode: 'text', source: '<p>a</p>'}, env)).status, 429);
  } finally { globalThis.fetch = original; }
});
