import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createWorker} from '../worker/app.mjs';

// Run real schema and transactional SQL, rather than imitating queries with a map.
function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_cloudflare.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const pending = [];
  const adapter = {
    prepare(sql) {
      return {sql, args: [], bind(...args) { this.args = args; return this; },
        async first() { return db.prepare(sql).get(...this.args) || null; },
        async run() { return {meta: {changes: Number(db.prepare(sql).run(...this.args).changes)}}; },
        async all() { return {results: db.prepare(sql).all(...this.args)}; }};
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = statements.map(s => ({meta: {changes: Number(db.prepare(s.sql).run(...s.args).changes)}}));
        db.exec('COMMIT');return results;
      } catch (error) { db.exec('ROLLBACK');throw error; }
    },
  };
  const env = {DB:adapter, DOCUMENTS:{}, ASSETS:{}, APP_ORIGIN:'https://app.hisobkor.uz'};
  const worker = createWorker();
  async function call(path, body, {cookie, origin='https://app.hisobkor.uz', ip='192.0.2.1', marker='1'}={}) {
    const response = await worker.fetch(new Request('https://app.hisobkor.uz'+path, {
      method:body===undefined?'GET':'POST',
      headers:{Origin:origin,'X-Mezon-Request':marker,'Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    }),env,{waitUntil(p){pending.push(p)}});
    await Promise.all(pending.splice(0));return response;
  }
  return {db,env,call};
}
const credentials = {username:'new_user',password:'a long private passphrase',confirmPassword:'a long private passphrase'};
const sessionCookie = response => response.headers.get('set-cookie')?.split(';')[0];

test('registration creates a private empty workspace and a secure session; login works after logout',async t=>{
  const f=fixture(t);
  const response=await f.call('/api/register',{...credentials,username:' New_User '});
  assert.equal(response.status,201);
  assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const account=f.db.prepare('SELECT * FROM accounts').get();
  assert.equal(account.username,'new_user');
  assert.notEqual(account.password_hash,credentials.password);
  assert.match(account.password_hash,/^[a-f0-9]{64}$/);
  const cookie=sessionCookie(response);
  assert.equal((await (await f.call('/api/session',undefined,{cookie})).json()).authenticated,true);
  assert.deepEqual(await (await f.call('/api/workspace',undefined,{cookie})).json(),{state:null,revision:0});
  assert.equal((await f.call('/api/register',{...credentials,username:'another'},{cookie})).status,409);
  assert.equal((await f.call('/api/logout',{}, {cookie})).status,200);
  assert.equal((await f.call('/api/workspace',undefined,{cookie})).status,401);
  assert.equal((await f.call('/api/login',{username:'NEW_USER',password:credentials.password})).status,200);
  assert.equal((await f.call('/api/login',{username:'new_user',password:'wrong'})).status,401);
});

test('invalid usernames, weak passwords, mismatches and malformed bodies never create accounts',async t=>{
  const f=fixture(t);
  const invalid=[null,[],{...credentials,username:'a'},{...credentials,username:'bad name'},{...credentials,password:'short',confirmPassword:'short'},{...credentials,confirmPassword:'different'},{...credentials,password:' '.repeat(12),confirmPassword:' '.repeat(12)}];
  for(let i=0;i<invalid.length;i++)assert.equal((await f.call('/api/register',invalid[i],{ip:`192.0.2.${i+1}`})).status,400);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0);
});

test('registration requires exact origin and application header',async t=>{
  const f=fixture(t);
  assert.equal((await f.call('/api/register',credentials,{origin:'https://evil.example'})).status,403);
  assert.equal((await f.call('/api/register',credentials,{marker:''})).status,403);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0);
});

test('simultaneous and case-insensitive duplicates cannot replace an existing account',async t=>{
  const f=fixture(t);
  const results=await Promise.all([f.call('/api/register',credentials),f.call('/api/register',{...credentials,username:'NEW_USER'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n,1);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,1);
});

test('failed workspace creation rolls back the account and session',async t=>{
  const f=fixture(t);
  f.db.exec("CREATE TRIGGER test_failure BEFORE INSERT ON workspaces BEGIN SELECT RAISE(ABORT, 'storage unavailable'); END;");
  assert.equal((await f.call('/api/register',credentials)).status,500);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
});

test('registration is rate limited without blocking the existing login route',async t=>{
  const f=fixture(t);
  assert.equal((await f.call('/api/register',credentials)).status,201);
  for(let i=0;i<4;i++)assert.equal((await f.call('/api/register',credentials)).status,409);
  assert.equal((await f.call('/api/register',{...credentials,username:'another_user'})).status,429);
  assert.equal((await f.call('/api/login',credentials)).status,200);
});

test('new users have distinct password salts, sessions and isolated workspaces',async t=>{
  const f=fixture(t);
  const first=await f.call('/api/register',credentials);
  const second=await f.call('/api/register',{...credentials,username:'second_user'});
  const accounts=f.db.prepare('SELECT * FROM accounts ORDER BY username').all();
  assert.notEqual(accounts[0].workspace_id,accounts[1].workspace_id);
  assert.notEqual(accounts[0].password_hash,accounts[1].password_hash);
  const privateState={companies:[],docs:[],activity:[],closed:[],profile:null,aiAuto:true,workspace:'Private first workspace'};
  f.db.prepare('UPDATE workspaces SET state_json=? WHERE account_id=?').run(JSON.stringify(privateState),accounts[0].id);
  assert.deepEqual((await (await f.call('/api/workspace',undefined,{cookie:sessionCookie(first)})).json()).state,privateState);
  assert.equal((await (await f.call('/api/workspace',undefined,{cookie:sessionCookie(second)})).json()).state,null);
});
