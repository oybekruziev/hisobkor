import test from 'node:test';
import assert from 'node:assert/strict';
import {adminUsernames, handleAdmin, isAdminUser, temporaryPassword} from '../worker/admin.mjs';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (data, status = 200) => new Response(JSON.stringify(data), {status});
const readJSON = async request => request.json();
const helpers = {json, HttpError, readJSON};
const ID = n => `00000000-0000-0000-0000-00000000000${n}`;

function fakeEnv() {
  const accounts = new Map([
    [ID(1), {id: ID(1), username: 'oybek', disabled: 0, workspace_id: 'w1'}],
    [ID(2), {id: ID(2), username: 'ali', disabled: 0, workspace_id: 'w2'}],
  ]);
  const log = [], r2 = [];
  const DB = {
    prepare(sql) {
      const st = {sql, args: [], bind(...a) { st.args = a; return st; },
        async first() { if (sql.includes('FROM accounts WHERE id=?')) return accounts.get(st.args[0]) || null; throw new Error(sql); },
        async all() { if (sql.includes('SELECT r2_key')) return {results: [{r2_key: 'k1'}, {r2_key: 'k2'}]}; throw new Error(sql); }};
      return st;
    },
    async batch(list) { for (const st of list) { log.push(st.sql); if (st.sql.startsWith('UPDATE accounts SET disabled')) accounts.get(st.args[1]).disabled = st.args[0]; if (st.sql.startsWith('DELETE FROM accounts')) accounts.delete(st.args[0]); } },
  };
  return {env: {DB, DOCUMENTS: {async delete(keys) { r2.push(keys); }}, ADMIN_USERNAMES: 'Oybek, boss'}, accounts, log, r2};
}
const call = (env, method, path, auth, body) => handleAdmin(new Request(`https://app.hisobkor.uz${path}`, {method, headers: {'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), auth, env, new URL(`https://app.hisobkor.uz${path}`), helpers);
const admin = {accountId: ID(1), tokenHash: 't', admin: true};

test('admin list is parsed case-insensitively from ADMIN_USERNAMES', () => {
  assert.deepEqual(adminUsernames({ADMIN_USERNAMES: ' Oybek , ,boss'}), ['oybek', 'boss']);
  assert.equal(isAdminUser({ADMIN_USERNAMES: 'oybek'}, 'OYBEK'), true);
  assert.equal(isAdminUser({}, 'oybek'), false);
});

test('non-admin sessions get 404 and non-admin paths pass through', async () => {
  const {env} = fakeEnv();
  await assert.rejects(call(env, 'GET', '/api/admin/users', {...admin, admin: false}), e => e.status === 404);
  assert.equal(await call(env, 'GET', '/api/workspace', admin), null);
});

test('block, unblock, self and admin protections', async () => {
  const {env, accounts, log} = fakeEnv();
  await assert.rejects(call(env, 'POST', `/api/admin/users/${ID(1)}/disable`, admin, {disabled: true}), e => e.status === 400);
  const res = await call(env, 'POST', `/api/admin/users/${ID(2)}/disable`, admin, {disabled: true});
  assert.equal(res.status, 200);
  assert.equal(accounts.get(ID(2)).disabled, 1);
  assert.ok(log.some(sql => sql.startsWith('DELETE FROM sessions')));
  await call(env, 'POST', `/api/admin/users/${ID(2)}/disable`, admin, {disabled: false});
  assert.equal(accounts.get(ID(2)).disabled, 0);
});

test('password reset issues a one-time strong password', async () => {
  const {env} = fakeEnv();
  const body = await (await call(env, 'POST', `/api/admin/users/${ID(2)}/password`, admin, {})).json();
  assert.equal(body.username, 'ali');
  assert.match(body.password, /^[A-Za-z2-9]{16}$/);
  assert.notEqual(temporaryPassword(), temporaryPassword());
});

test('delete removes files and rows, refuses self and admins', async () => {
  const {env, accounts, r2} = fakeEnv();
  await assert.rejects(call(env, 'DELETE', `/api/admin/users/${ID(1)}`, admin), e => e.status === 400);
  const body = await (await call(env, 'DELETE', `/api/admin/users/${ID(2)}`, admin)).json();
  assert.equal(body.files, 2);
  assert.deepEqual(r2, [['k1', 'k2']]);
  assert.equal(accounts.has(ID(2)), false);
  await assert.rejects(call(env, 'DELETE', `/api/admin/users/not-an-id`, admin), e => e.status === 404);
});

import {createWorker, mutationAllowed, isAdminHost} from '../worker/app.mjs';
const hostEnv = () => {
  const queries = [];
  return {queries, env: {
    ENVIRONMENT: 'production', APP_HOST: 'app.hisobkor.uz', LANDING_HOST: 'hisobkor.uz', ADMIN_USERNAMES: 'oybek',
    DOCUMENTS: {}, ASSETS: {fetch: async request => new Response(new URL(request.url).pathname)},
    DB: {prepare(sql) { queries.push(sql); const st = {bind() { return st; }, async first() { return sql.includes('login_limits') ? {attempts: 1} : null; }}; return st; }},
  }};
};
const ctx = {waitUntil() {}};

test('admin.hisobkor.uz serves only the admin shell and is noindex', async () => {
  const {env} = hostEnv();
  const worker = createWorker();
  let response = await worker.fetch(new Request('https://admin.hisobkor.uz/'), env, ctx);
  assert.equal(await response.text(), '/admin.html');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  response = await worker.fetch(new Request('https://admin.hisobkor.uz/app.js'), env, ctx);
  assert.equal(response.status, 404);
  response = await worker.fetch(new Request('https://admin.hisobkor.uz/api/workspace'), env, ctx);
  assert.equal(response.status, 401);
  response = await worker.fetch(new Request('https://app.hisobkor.uz/admin.js'), env, ctx);
  assert.equal(response.status, 404);
});

test('admin host accepts only its own origin and refuses non-admin logins without a lookup', async () => {
  const {env, queries} = hostEnv();
  assert.equal(isAdminHost(new Request('https://admin.hisobkor.uz/'), env), true);
  const post = origin => new Request('https://admin.hisobkor.uz/api/login', {method: 'POST', headers: {Origin: origin, 'X-Mezon-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({username: 'ali', password: 'x'.repeat(12)})});
  assert.equal(mutationAllowed(post('https://admin.hisobkor.uz'), env), true);
  assert.equal(mutationAllowed(post('https://app.hisobkor.uz'), env), false);
  const response = await createWorker().fetch(post('https://admin.hisobkor.uz'), env, ctx);
  assert.equal(response.status, 401);
  assert.ok(!queries.some(sql => sql.includes('FROM accounts WHERE username')));
});
