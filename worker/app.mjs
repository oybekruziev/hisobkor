import {randomToken, sha256Hex, verifyPassword, pbkdf2, bytesToHex} from './crypto.mjs';
import {runMsfo, startMsfo, pollMsfo, validJobId, validateMsfoRequest, MAX_MSFO_BODY, MAX_PDF_BYTES} from '../msfo-service.mjs';
import {handleAdmin, isAdminUser} from './admin.mjs';
import {validateChat, companyContext, runChat} from '../chat-service.mjs';
import {eligibleDocument, MAX_FILE_BYTES, MAX_WORKSPACE_BYTES, safeDocumentName, validFileId, validateFile, validateWorkspaceState} from './validation.mjs';

const SESSION_COOKIE = '__Host-mezon_session';
const SESSION_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const STATIC_APP = new Set(['/', '/index.html', '/app.js', '/style.css', '/favicon.svg', '/brand-h.png', '/fonts/Onest-latin.woff2', '/fonts/Onest-latin-ext.woff2', '/fonts/Onest-cyrillic.woff2']);
const STATIC_ADMIN = new Map([['/', '/admin.html'], ['/admin.js', '/admin.js'], ['/style.css', '/style.css'], ['/favicon.svg', '/favicon.svg'], ['/brand-h.png', '/brand-h.png'], ['/fonts/Onest-latin.woff2', '/fonts/Onest-latin.woff2'], ['/fonts/Onest-latin-ext.woff2', '/fonts/Onest-latin-ext.woff2'], ['/fonts/Onest-cyrillic.woff2', '/fonts/Onest-cyrillic.woff2']]);
const STATIC_LANDING = new Map([['/', '/landing.html'], ['/landing.html', '/landing.html'], ['/landing.css', '/landing.css'], ['/landing.js', '/landing.js'], ['/favicon.svg', '/favicon.svg'], ['/brand-h.png', '/brand-h.png'], ['/og-image.png', '/og-image.png'], ['/shots/overview.webp', '/shots/overview.webp'], ['/shots/documents.webp', '/shots/documents.webp'], ['/shots/msfo.webp', '/shots/msfo.webp'], ['/shots/home.webp', '/shots/home.webp'], ['/sitemap.xml', '/sitemap.xml'], ['/fonts/Onest-latin.woff2', '/fonts/Onest-latin.woff2'], ['/fonts/Onest-latin-ext.woff2', '/fonts/Onest-latin-ext.woff2'], ['/fonts/Onest-cyrillic.woff2', '/fonts/Onest-cyrillic.woff2']]);
/** Versioned brand assets (character poses, icons): one flat folder, safe file names only. */
const BRAND_ASSET = /^\/brand\/[a-z0-9-]+\.(?:webp|png|svg)$/;
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; frame-src 'self' blob:; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const nowMs = () => Date.now();
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders, ...extra}});
const fail = (status, message) => json({error: message}, status);
const changes = result => Number(result?.meta?.changes ?? result?.changes ?? 0);
const cookies = request => Object.fromEntries(String(request.headers.get('cookie') || '').split(';').map(value => value.trim().split(/=(.*)/s).slice(0, 2)).filter(value => value.length === 2));
const cookie = token => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
const parseState = row => {
  try { const state = JSON.parse(row.state_json); validateWorkspaceState(state); return state; }
  catch { throw new HttpError(503, 'Saqlangan ish joyi ma’lumoti buzilgan.'); }
};
const requestHost = request => new URL(request.url).hostname.toLowerCase();
const configuredOrigin = (env, key, fallback) => {
  try { return new URL(env[key] || fallback).origin.toLowerCase(); } catch { return fallback; }
};
const appOrigin = env => configuredOrigin(env, 'APP_ORIGIN', `https://${env.APP_HOST || 'app.hisobkor.uz'}`);
const adminOrigin = env => configuredOrigin(env, 'ADMIN_ORIGIN', `https://${env.ADMIN_HOST || 'admin.hisobkor.uz'}`);
const siteOrigin = env => configuredOrigin(env, 'SITE_ORIGIN', `https://${env.LANDING_HOST || 'hisobkor.uz'}`);

export function allowedOrigin(request, env) {
  const host = requestHost(request);
  const local = env.ENVIRONMENT === 'local';
  if (local) return host === 'localhost' || host === '127.0.0.1';
  return host === new URL(appOrigin(env)).hostname || host === new URL(adminOrigin(env)).hostname;
}
export const isAdminHost = (request, env) => env.ENVIRONMENT !== 'local' && requestHost(request) === new URL(adminOrigin(env)).hostname;

export function mutationAllowed(request, env) {
  if (request.headers.get('X-Mezon-Request') !== '1' || !allowedOrigin(request, env)) return false;
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  const actual = new URL(request.url);
  if (env.ENVIRONMENT === 'local') {
    try { const source = new URL(origin); return ['localhost', '127.0.0.1'].includes(source.hostname) && source.port === actual.port; }
    catch { return false; }
  }
  return origin.toLowerCase() === (isAdminHost(request, env) ? adminOrigin(env) : appOrigin(env));
}

async function readBytes(request, limit) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, 'So‘rov hajmi juda katta.');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new HttpError(413, 'So‘rov hajmi juda katta.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function readJSON(request, limit = MAX_WORKSPACE_BYTES + 64 * 1024) {
  if (!String(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON so‘rov kutilgan.');
  try { return JSON.parse(new TextDecoder().decode(await readBytes(request, limit))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'So‘rov o‘qilmadi.'); }
}

function assertBindings(env) {
  if (!env.DB || !env.DOCUMENTS || !env.ASSETS) throw new HttpError(503, 'Backend sozlanmagan.');
}

async function session(request, env, ctx) {
  const token = cookies(request)[SESSION_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT s.account_id, s.expires_at, a.workspace_id, a.username
    FROM sessions s JOIN accounts a ON a.id=s.account_id
    WHERE s.token_hash=? AND a.disabled=0`).bind(tokenHash).first();
  const now = nowMs();
  if (!row || Number(row.expires_at) <= now) {
    if (row) ctx.waitUntil(env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run());
    return null;
  }
  ctx.waitUntil(env.DB.prepare('UPDATE sessions SET expires_at=?, last_seen_at=? WHERE token_hash=?').bind(now + SESSION_SECONDS * 1000, now, tokenHash).run());
  return {accountId: row.account_id, workspaceId: row.workspace_id, tokenHash, username: row.username, admin: isAdminUser(env, row.username)};
}

async function rateLimitLogin(request, env, scope = '') {
  const now = nowMs();
  const address = request.headers.get('CF-Connecting-IP') || (env.ENVIRONMENT === 'local' ? 'local' : 'unknown');
  const bucket = await sha256Hex(`${scope}${address}:${Math.floor(now / LOGIN_WINDOW_MS)}`);
  const expires = now + LOGIN_WINDOW_MS;
  const row = await env.DB.prepare(`INSERT INTO login_limits(bucket, attempts, expires_at) VALUES(?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET
      attempts=CASE WHEN login_limits.expires_at<=? THEN 1 ELSE login_limits.attempts+1 END,
      expires_at=CASE WHEN login_limits.expires_at<=? THEN excluded.expires_at ELSE login_limits.expires_at END
    RETURNING attempts`).bind(bucket, expires, now, now).first();
  if (!row || Number(row.attempts) > 5) throw new HttpError(429, 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.');
}

async function login(request, env, {adminOnly = false} = {}) {
  await rateLimitLogin(request, env);
  const body = await readJSON(request, 8 * 1024);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Login so‘rovi yaroqsiz.');
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 120) : '';
  const row = username && (!adminOnly || isAdminUser(env, username)) ? await env.DB.prepare('SELECT id,password_salt,password_hash,password_iterations FROM accounts WHERE username=? COLLATE NOCASE AND disabled=0').bind(username).first() : null;
  const password = typeof body.password === 'string' ? body.password : '';
  const valid = row
    ? await verifyPassword(password, row.password_salt, row.password_hash, Number(row.password_iterations))
    : await verifyPassword(password, '00000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000', 100_000);
  if (!row || !valid) throw new HttpError(401, 'Login yoki parol noto‘g‘ri.');
  const token = randomToken();
  const now = nowMs();
  await env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?)')
    .bind(await sha256Hex(token), row.id, now + SESSION_SECONDS * 1000, now, now).run();
  return json({authenticated: true, mode: 'production', storage: 'server'}, 200, {'Set-Cookie': cookie(token)});
}

async function register(request, env) {
  await rateLimitLogin(request, env, 'register:');
  const body = await readJSON(request, 8 * 1024);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Ro‘yxatdan o‘tish so‘rovi yaroqsiz.');
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new HttpError(400, 'Login 3–40 belgidan iborat bo‘lsin. Lotin harflari, raqam, nuqta, chiziqcha va pastki chiziqdan foydalaning.');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !password.trim()) throw new HttpError(400, 'Parol 12–128 belgidan iborat bo‘lsin.');
  if (password !== body.confirmPassword) throw new HttpError(400, 'Parollar bir xil emas.');
  const existing = () => env.DB.prepare('SELECT id FROM accounts WHERE username=? COLLATE NOCASE').bind(username).first();
  if (await existing()) throw new HttpError(409, 'Bu login band. Boshqa login tanlang.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = bytesToHex(await pbkdf2(password, salt));
  const accountId = crypto.randomUUID(), workspaceId = crypto.randomUUID(), token = randomToken();
  const now = nowMs();
  // D1 batch is transactional: an account, its private workspace and its
  // first session either all exist or none do (including duplicate races).
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO accounts(id,username,password_salt,password_hash,password_iterations,workspace_id,created_at) VALUES(?,?,?,?,?,?,?)')
        .bind(accountId, username, bytesToHex(salt), hash, 100000, workspaceId, now),
      env.DB.prepare("INSERT INTO workspaces(id,account_id,state_json,revision,updated_at) VALUES(?,?,'null',0,?)")
        .bind(workspaceId, accountId, now),
      env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?)')
        .bind(await sha256Hex(token), accountId, now + SESSION_SECONDS * 1000, now, now),
    ]);
  } catch (error) {
    if (await existing()) throw new HttpError(409, 'Bu login band. Boshqa login tanlang.');
    throw error;
  }
  return json({authenticated: true, mode: 'production', storage: 'server'}, 201, {'Set-Cookie': cookie(token)});
}

async function getWorkspace(auth, env) {
  const {state, revision} = await workspaceWithAnalyses(auth, env);
  return json({state, revision});
}

/** Workspace state with each document's latest AI analysis merged in (per immutable file version). */
async function workspaceWithAnalyses(auth, env) {
  const row = await env.DB.prepare('SELECT state_json,revision FROM workspaces WHERE id=? AND account_id=?').bind(auth.workspaceId, auth.accountId).first();
  if (!row) throw new HttpError(503, 'Ish joyi sozlanmagan.');
  const state = parseState(row);
  if (state?.docs?.length) {
    const jobs = await env.DB.prepare(`SELECT id,document_id,file_key,status,result_json,error,created_at FROM ai_jobs
      WHERE account_id=? AND workspace_id=? ORDER BY created_at DESC`).bind(auth.accountId, auth.workspaceId).all();
    const latest = new Map();
    for (const job of jobs?.results || []) {
      const key = `${job.document_id}:${job.file_key}`;
      if (!latest.has(key)) latest.set(key, job);
    }
    state.docs = state.docs.map(doc => {
      const fileKey = doc.fileKey || doc.id;
      const job = latest.get(`${doc.id}:${fileKey}`);
      if (!job) return doc;
      const ai = {status: job.status, jobId: job.id, fileKey};
      if (job.status === 'complete') { try { ai.result = JSON.parse(job.result_json); } catch { ai.status = 'error'; ai.error = 'Tekshiruv natijasi o‘qilmadi.'; } }
      if (job.status === 'error') ai.error = job.error || 'Avtomatik tekshiruv bajarilmadi.';
      return {...doc, ai};
    });
  }
  return {state, revision: Number(row.revision)};
}

async function putWorkspace(request, auth, env, ctx) {
  const body = await readJSON(request);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Number.isSafeInteger(body.revision) || body.revision < 0 || !('state' in body)) throw new HttpError(400, 'Ish joyi so‘rovi yaroqsiz.');
  validateWorkspaceState(body.state);
  const encoded = JSON.stringify(body.state);
  if (new TextEncoder().encode(encoded).length > MAX_WORKSPACE_BYTES) throw new HttpError(413, 'Ish joyi ma’lumoti 1 MBdan oshmasligi kerak.');
  const previous = await env.DB.prepare('SELECT state_json,revision FROM workspaces WHERE id=? AND account_id=?').bind(auth.workspaceId, auth.accountId).first();
  if (!previous) throw new HttpError(503, 'Ish joyi sozlanmagan.');
  const now = nowMs();
  const result = await env.DB.prepare('UPDATE workspaces SET state_json=?,revision=revision+1,updated_at=? WHERE id=? AND account_id=? AND revision=?')
    .bind(encoded, now, auth.workspaceId, auth.accountId, body.revision).run();
  if (changes(result) !== 1) {
    const current = await env.DB.prepare('SELECT revision FROM workspaces WHERE id=? AND account_id=?').bind(auth.workspaceId, auth.accountId).first();
    return json({error: 'Boshqa oynada o‘zgarish bor.', revision: Number(current?.revision ?? 0)}, 409);
  }
  if (env.OPENAI_API_KEY && body.state?.aiAuto !== false) {
    let old = null;
    try { old = JSON.parse(previous.state_json); } catch {}
    const oldVersions = new Map((old?.docs || []).map(doc => [doc.id, doc.fileKey || doc.id]));
    const candidates = body.state.docs.filter(doc => eligibleDocument(doc) && oldVersions.get(doc.id) !== (doc.fileKey || doc.id));
    for (const doc of candidates) ctx.waitUntil(queueDocument(auth, doc, env).catch(() => undefined));
  }
  return json({revision: body.revision + 1});
}

async function putFile(request, auth, logicalId, env) {
  if (!validFileId(logicalId)) throw new HttpError(400, 'Fayl identifikatori yaroqsiz.');
  const bytes = await readBytes(request, MAX_FILE_BYTES);
  let contentType;
  try { contentType = validateFile(bytes, request.headers.get('content-type')); }
  catch (error) { throw new HttpError(400, error.message); }
  const id = crypto.randomUUID();
  const r2Key = `${auth.accountId}/${auth.workspaceId}/${logicalId}/${id}`;
  const digest = await sha256Hex(bytes);
  const existing = await env.DB.prepare(`SELECT id,r2_key,content_type,size,sha256 FROM file_versions
    WHERE account_id=? AND workspace_id=? AND logical_id=? LIMIT 1`).bind(auth.accountId, auth.workspaceId, logicalId).first();
  if (existing) {
    if (existing.sha256 === digest && existing.content_type === contentType && Number(existing.size) === bytes.length) return json({id: logicalId, versionId: existing.id, contentType, size: bytes.length, unchanged: true}, 200, {'ETag': `"${digest}"`, 'X-Mezon-File-Version': existing.id});
    throw new HttpError(409, 'Bu fayl identifikatori avval ishlatilgan. Yangi fayl uchun yangi identifikator yarating.');
  }
  await env.DOCUMENTS.put(r2Key, bytes, {httpMetadata: {contentType}, customMetadata: {account: auth.accountId, workspace: auth.workspaceId, logicalId, version: id, sha256: digest}});
  const now = nowMs();
  try {
    await env.DB.prepare('INSERT INTO file_versions(id,account_id,workspace_id,logical_id,r2_key,content_type,size,sha256,is_current,created_at) VALUES(?,?,?,?,?,?,?,?,1,?)').bind(id, auth.accountId, auth.workspaceId, logicalId, r2Key, contentType, bytes.length, digest, now).run();
  } catch (error) {
    await env.DOCUMENTS.delete(r2Key).catch(() => undefined);
    const raced = await env.DB.prepare(`SELECT id,content_type,size,sha256 FROM file_versions
      WHERE account_id=? AND workspace_id=? AND logical_id=? LIMIT 1`).bind(auth.accountId, auth.workspaceId, logicalId).first();
    if (raced?.sha256 === digest && raced.content_type === contentType && Number(raced.size) === bytes.length) return json({id: logicalId, versionId: raced.id, contentType, size: bytes.length, unchanged: true}, 200, {'ETag': `"${digest}"`, 'X-Mezon-File-Version': raced.id});
    if (raced) throw new HttpError(409, 'Bu fayl identifikatori avval ishlatilgan. Yangi fayl uchun yangi identifikator yarating.');
    throw error;
  }
  return json({id: logicalId, versionId: id, contentType, size: bytes.length}, 201, {'ETag': `"${digest}"`, 'X-Mezon-File-Version': id});
}

async function getFile(auth, logicalId, env) {
  if (!validFileId(logicalId)) throw new HttpError(400, 'Fayl identifikatori yaroqsiz.');
  const row = await env.DB.prepare(`SELECT id,r2_key,content_type,size,sha256 FROM file_versions
    WHERE account_id=? AND workspace_id=? AND logical_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 1`).bind(auth.accountId, auth.workspaceId, logicalId).first();
  if (!row) throw new HttpError(404, 'Fayl topilmadi.');
  const object = await env.DOCUMENTS.get(row.r2_key);
  if (!object || !('body' in object)) throw new HttpError(503, 'Fayl omborida nomuvofiqlik bor.');
  return new Response(object.body, {headers: {'Content-Type': row.content_type, 'Content-Length': String(row.size), 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'ETag': `"${row.sha256}"`, 'X-Mezon-File-Version': row.id, ...securityHeaders}});
}

async function resolveDocument(auth, documentId, fileKey, env) {
  if (!validFileId(documentId) || !validFileId(fileKey)) throw new HttpError(400, 'Hujjat so‘rovi yaroqsiz.');
  const workspace = await env.DB.prepare('SELECT state_json FROM workspaces WHERE id=? AND account_id=?').bind(auth.workspaceId, auth.accountId).first();
  if (!workspace) throw new HttpError(503, 'Ish joyi sozlanmagan.');
  const state = parseState(workspace);
  const doc = state?.docs?.find(value => value.id === documentId);
  if (!eligibleDocument(doc) || (doc.fileKey || doc.id) !== fileKey) throw new HttpError(409, 'Hujjatning joriy fayli mos kelmadi.');
  const file = await env.DB.prepare(`SELECT id,r2_key,content_type,size FROM file_versions
    WHERE account_id=? AND workspace_id=? AND logical_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 1`).bind(auth.accountId, auth.workspaceId, fileKey).first();
  if (!file) throw new HttpError(404, 'Hujjat fayli topilmadi.');
  return {doc, file};
}

async function queueDocument(auth, doc, env, {force = false} = {}) {
  if (!env.OPENAI_API_KEY || !env.DOCUMENT_REVIEW) throw new HttpError(503, 'Avtomatik tekshiruv sozlanmagan.');
  const fileKey = doc.fileKey || doc.id;
  const {file} = await resolveDocument(auth, doc.id, fileKey, env);
  const baseKey = await sha256Hex(`${auth.workspaceId}:${doc.id}:${file.id}`);
  const existing = await env.DB.prepare("SELECT id,status FROM ai_jobs WHERE account_id=? AND workspace_id=? AND document_id=? AND file_version_id=? ORDER BY created_at DESC LIMIT 1").bind(auth.accountId, auth.workspaceId, doc.id, file.id).first();
  if (existing && (!force || ['queued', 'processing'].includes(existing.status))) return {jobId: existing.id, status: existing.status};
  const dailyLimit = Math.max(1, Math.min(200, Number(env.AI_MAX_DAILY_PER_ACCOUNT) || 40));
  const jobId = crypto.randomUUID();
  const dedupeKey = force ? `${baseKey}:${jobId}` : baseKey;
  const now = nowMs();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const inserted = await env.DB.prepare(`INSERT INTO ai_jobs(id,account_id,workspace_id,document_id,file_key,file_version_id,dedupe_key,status,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,'queued',?,?
    WHERE (SELECT COUNT(*) FROM ai_jobs WHERE account_id=? AND created_at>=?) < ?
    ON CONFLICT(dedupe_key) DO NOTHING`).bind(jobId, auth.accountId, auth.workspaceId, doc.id, fileKey, file.id, dedupeKey, now, now, auth.accountId, dayAgo, dailyLimit).run();
  if (changes(inserted) !== 1) {
    const raced = await env.DB.prepare('SELECT id,status FROM ai_jobs WHERE dedupe_key=? AND account_id=?').bind(dedupeKey, auth.accountId).first();
    if (raced) return {jobId: raced.id, status: raced.status};
    throw new HttpError(429, 'Avtomatik tekshiruv limiti band. Keyinroq qayta urinib ko‘ring.');
  }
  const params = {jobId, accountId: auth.accountId, workspaceId: auth.workspaceId, documentId: doc.id, fileKey, fileVersionId: file.id, r2Key: file.r2_key, fileName: safeDocumentName(doc.fileName, file.content_type), contentType: file.content_type};
  try { await env.DOCUMENT_REVIEW.create({id: jobId, params}); }
  catch {
    await env.DB.prepare("UPDATE ai_jobs SET status='error',error=?,updated_at=? WHERE id=? AND status='queued'").bind('Tekshiruv navbatga qo‘shilmadi.', nowMs(), jobId).run();
    throw new HttpError(503, 'Avtomatik tekshiruv navbatga qo‘shilmadi.');
  }
  return {jobId, status: 'queued'};
}

async function analyze(request, auth, env) {
  const body = await readJSON(request, 8 * 1024);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Tekshiruv so‘rovi yaroqsiz.');
  const {doc} = await resolveDocument(auth, body.documentId, body.fileKey, env);
  return json(await queueDocument(auth, doc, env, {force: body.force === true}), 202);
}

async function getJob(auth, jobId, env) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new HttpError(400, 'Vazifa identifikatori yaroqsiz.');
  const row = await env.DB.prepare('SELECT status,result_json,error FROM ai_jobs WHERE id=? AND account_id=? AND workspace_id=?').bind(jobId, auth.accountId, auth.workspaceId).first();
  if (!row) throw new HttpError(404, 'Tekshiruv vazifasi topilmadi.');
  const result = {status: row.status};
  if (row.status === 'complete') {
    try { result.result = JSON.parse(row.result_json); } catch { throw new HttpError(503, 'Tekshiruv natijasi buzilgan.'); }
  }
  if (row.status === 'error') result.error = row.error || 'Avtomatik tekshiruv bajarilmadi.';
  return json(result);
}

/**
 * MSFO: a conversion starts an OpenAI background response and the browser polls for it; a short
 * rewrite of a selection still runs inline. Starting or rewriting counts against a per-account daily
 * budget, and every job id is bound to the account that started it.
 */
/** Loads this account's workspace and proves the company belongs to it (never trusts the browser). */
async function workspaceCompany(auth, env, companyId) {
  if (!validFileId(companyId)) throw new HttpError(400, 'Kompaniya tanlanmagan. MHXS ishi kompaniya ichida bajariladi.');
  const row = await env.DB.prepare('SELECT state_json,revision FROM workspaces WHERE id=? AND account_id=?').bind(auth.workspaceId, auth.accountId).first();
  if (!row) throw new HttpError(503, 'Ish joyi sozlanmagan.');
  const state = parseState(row);
  const company = state?.companies?.find(c => c.id === companyId);
  if (!company) throw new HttpError(404, 'Kompaniya bu ish joyida topilmadi.');
  return {state, company};
}

async function msfo(request, auth, env) {
  if (!env.OPENAI_API_KEY) throw new HttpError(503, 'AI xizmati sozlanmagan.');
  const body = await readJSON(request, MAX_MSFO_BODY);
  await workspaceCompany(auth, env, body?.companyId);
  // A PDF the user already stored is read from R2 here instead of being uploaded a second time.
  if (body?.file?.fileKey && !body.file.base64) {
    const key = body.file.fileKey;
    if (!validFileId(key)) throw new HttpError(400, 'Fayl identifikatori yaroqsiz.');
    const row = await env.DB.prepare(`SELECT r2_key,content_type,size FROM file_versions
      WHERE account_id=? AND workspace_id=? AND logical_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 1`).bind(auth.accountId, auth.workspaceId, key).first();
    if (!row || row.content_type !== 'application/pdf') throw new HttpError(404, 'Asl PDF fayl topilmadi. Uni qayta yuklang.');
    if (Number(row.size) > MAX_PDF_BYTES) throw new HttpError(400, 'PDF fayl 15 MBdan oshmasin.');
    const object = await env.DOCUMENTS.get(row.r2_key);
    if (!object || !('body' in object)) throw new HttpError(503, 'Fayl omborida nomuvofiqlik bor.');
    body.file = {name: body.file.name, base64: Buffer.from(await new Response(object.body).arrayBuffer()).toString('base64')};
  }
  let input;
  try { input = validateMsfoRequest(body); } catch (error) { throw new HttpError(400, error.message); }
  const now = nowMs();
  const day = 24 * 60 * 60 * 1000;
  const limit = Math.max(1, Math.min(500, Number(env.AI_MAX_DAILY_MSFO) || 60));
  const bucket = await sha256Hex(`msfo:${auth.accountId}:${Math.floor(now / day)}`);
  const row = await env.DB.prepare(`INSERT INTO login_limits(bucket, attempts, expires_at) VALUES(?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=login_limits.attempts+1
    RETURNING attempts`).bind(bucket, now + day).first();
  if (!row || Number(row.attempts) > limit) throw new HttpError(429, 'Bugungi MSFO AI limiti tugadi. Ertaga qayta urinib ko‘ring.');
  const options = {key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.6-luna'};
  try {
    if (input.action === 'convert') {
      const job = await startMsfo(body, options);
      await env.DB.prepare('INSERT INTO login_limits(bucket, attempts, expires_at) VALUES(?, 0, ?) ON CONFLICT(bucket) DO NOTHING')
        .bind(await sha256Hex(`msfojob:${auth.accountId}:${job.id}`), now + day).run();
      return json({job});
    }
    return json({result: await runMsfo(body, options)});
  } catch (error) {
    throw new HttpError(502, error?.name === 'TimeoutError' ? 'AI javobi juda uzoq kechikdi. Qayta urinib ko‘ring.' : (error?.message || 'AI so‘rovi bajarilmadi.'));
  }
}

/** Company chat: context is built here from this account's workspace, never from the browser. */
async function chat(request, auth, env) {
  if (!env.OPENAI_API_KEY) throw new HttpError(503, 'AI xizmati sozlanmagan.');
  const body = await readJSON(request, 32 * 1024);
  let input;
  try { input = validateChat(body); } catch (error) { throw new HttpError(400, error.message); }
  await workspaceCompany(auth, env, body.companyId);
  const {state} = await workspaceWithAnalyses(auth, env);
  if (state?.aiAuto === false) throw new HttpError(403, 'AI tahliliga ruxsat o‘chirilgan. Uni sozlamada yoqing.');
  const built = companyContext(state, body.companyId);
  const now = nowMs();
  const day = 24 * 60 * 60 * 1000;
  const limit = Math.max(1, Math.min(1000, Number(env.AI_MAX_DAILY_CHAT) || 100));
  const bucket = await sha256Hex(`chat:${auth.accountId}:${Math.floor(now / day)}`);
  const row = await env.DB.prepare(`INSERT INTO login_limits(bucket, attempts, expires_at) VALUES(?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=login_limits.attempts+1
    RETURNING attempts`).bind(bucket, now + day).first();
  if (!row || Number(row.attempts) > limit) throw new HttpError(429, 'Bugungi chat limiti tugadi. Ertaga qayta urinib ko‘ring.');
  try { return json({result: await runChat(input, built, {key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.6-luna'})}); }
  catch (error) { throw new HttpError(502, error?.name === 'TimeoutError' ? 'AI javobi juda uzoq kechikdi.' : (error?.message || 'AI so‘rovi bajarilmadi.')); }
}

async function msfoJob(auth, id, env) {
  if (!env.OPENAI_API_KEY) throw new HttpError(503, 'AI xizmati sozlanmagan.');
  if (!validJobId(id)) throw new HttpError(400, 'Topshiriq identifikatori yaroqsiz.');
  const owned = await env.DB.prepare('SELECT 1 FROM login_limits WHERE bucket=? AND expires_at>?')
    .bind(await sha256Hex(`msfojob:${auth.accountId}:${id}`), nowMs()).first();
  if (!owned) throw new HttpError(404, 'Topshiriq topilmadi yoki muddati o‘tgan. Qayta o‘tkazib ko‘ring.');
  try { return json(await pollMsfo(id, {key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5.6-luna'})); }
  catch (error) {
    // A dropped connection or timeout is worth another poll; anything else ends the job.
    if (error?.name === 'TimeoutError' || error instanceof TypeError) throw new HttpError(502, 'AI xizmati bilan aloqa uzildi.');
    return json({status: 'error', error: error?.message || 'AI so‘rovi bajarilmadi.'});
  }
}

async function serveAsset(request, env, pathname) {
  const response = await env.ASSETS.fetch(new Request(new URL(pathname, request.url), request));
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  if (pathname.endsWith('.html') || pathname === '/') headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

/** admin.hisobkor.uz: its own admin-only login (host-only cookie), user management API, nothing else. */
async function adminHost(request, env, ctx, url) {
  if (!url.pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Usul qo‘llab-quvvatlanmaydi.');
    if (!STATIC_ADMIN.has(url.pathname) && !BRAND_ASSET.test(url.pathname)) return fail(404, 'Sahifa topilmadi.');
    const response = await serveAsset(request, env, STATIC_ADMIN.get(url.pathname) || url.pathname);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  const adminSession = async () => { const auth = await session(request, env, ctx); return auth?.admin ? auth : null; };
  if (request.method === 'GET' && url.pathname === '/api/session') {
    const auth = await adminSession();
    return json({authenticated: !!auth, mode: 'production', storage: 'server', ...(auth ? {admin: true, username: auth.username} : {})});
  }
  if (request.method === 'POST' && url.pathname === '/api/login') {
    if (!mutationAllowed(request, env)) return fail(403, 'Ruxsat berilmagan so‘rov.');
    return await login(request, env, {adminOnly: true});
  }
  const auth = await adminSession();
  if (!auth) return fail(401, 'Tizimga qayta kiring.');
  if (!['GET', 'HEAD'].includes(request.method) && !mutationAllowed(request, env)) return fail(403, 'Ruxsat berilmagan so‘rov.');
  if (request.method === 'POST' && url.pathname === '/api/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=? AND account_id=?').bind(auth.tokenHash, auth.accountId).run();
    return json({authenticated: false}, 200, {'Set-Cookie': clearCookie()});
  }
  return (await handleAdmin(request, auth, env, url, {json, HttpError, readJSON})) || fail(404, 'API manzili topilmadi.');
}

export function createWorker() {
  return {
    async fetch(request, env, ctx = {waitUntil() {}}) {
      try {
        assertBindings(env);
        const url = new URL(request.url);
        const host = url.hostname.toLowerCase();
        const landingHost = new URL(siteOrigin(env)).hostname;
        if (host === `www.${landingHost}` && env.ENVIRONMENT !== 'local') {
          if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Usul qo‘llab-quvvatlanmaydi.');
          return Response.redirect(`https://${landingHost}${url.pathname}${url.search}`, 308);
        }
        if (host === landingHost && env.ENVIRONMENT !== 'local') {
          if (['GET', 'HEAD'].includes(request.method) && (STATIC_LANDING.has(url.pathname) || BRAND_ASSET.test(url.pathname))) return await serveAsset(request, env, STATIC_LANDING.get(url.pathname) || url.pathname);
          return fail(404, 'Sahifa topilmadi.');
        }
        if (!allowedOrigin(request, env)) return fail(403, 'Ruxsat berilmagan manba.');
        if (isAdminHost(request, env)) return await adminHost(request, env, ctx, url);
        if (url.pathname === '/healthz') return request.method === 'GET' ? json({ok: true}) : fail(405, 'Usul qo‘llab-quvvatlanmaydi.');
        if (!url.pathname.startsWith('/api/')) {
          if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Usul qo‘llab-quvvatlanmaydi.');
          if (!STATIC_APP.has(url.pathname) && !BRAND_ASSET.test(url.pathname)) return fail(404, 'Sahifa topilmadi.');
          return await serveAsset(request, env, url.pathname === '/' ? '/index.html' : url.pathname);
        }
        if (request.method === 'GET' && url.pathname === '/api/session') {
          const auth = await session(request, env, ctx);
          return json({authenticated: !!auth, mode: 'production', storage: 'server'});
        }
        if (request.method === 'POST' && url.pathname === '/api/login') {
          if (!mutationAllowed(request, env)) return fail(403, 'Ruxsat berilmagan so‘rov.');
          return await login(request, env);
        }
        if (request.method === 'POST' && url.pathname === '/api/register') {
          if (!mutationAllowed(request, env)) return fail(403, 'Ruxsat berilmagan so‘rov.');
          if (await session(request, env, ctx)) return fail(409, 'Yangi hisob yaratishdan oldin joriy hisobdan chiqing.');
          return await register(request, env);
        }
        const auth = await session(request, env, ctx);
        if (!auth) return fail(401, 'Tizimga qayta kiring.');
        if (!['GET', 'HEAD'].includes(request.method) && !mutationAllowed(request, env)) return fail(403, 'Ruxsat berilmagan so‘rov.');
        if (request.method === 'POST' && url.pathname === '/api/logout') {
          await env.DB.prepare('DELETE FROM sessions WHERE token_hash=? AND account_id=?').bind(auth.tokenHash, auth.accountId).run();
          return json({authenticated: false}, 200, {'Set-Cookie': clearCookie()});
        }
        if (request.method === 'GET' && url.pathname === '/api/workspace') return await getWorkspace(auth, env);
        if (request.method === 'PUT' && url.pathname === '/api/workspace') return await putWorkspace(request, auth, env, ctx);
        const fileMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
        if (fileMatch && request.method === 'GET') return await getFile(auth, decodeURIComponent(fileMatch[1]), env);
        if (fileMatch && request.method === 'PUT') return await putFile(request, auth, decodeURIComponent(fileMatch[1]), env);
        if (request.method === 'GET' && url.pathname === '/api/ai/status') return json({connected: !!env.OPENAI_API_KEY, managed: true, background: true});
        if (request.method === 'POST' && url.pathname === '/api/ai/analyze') return await analyze(request, auth, env);
        if (request.method === 'POST' && url.pathname === '/api/msfo') return await msfo(request, auth, env);
        if (request.method === 'POST' && url.pathname === '/api/chat') return await chat(request, auth, env);
        const msfoJobMatch = url.pathname.match(/^\/api\/msfo\/jobs\/([^/]+)$/);
        if (request.method === 'GET' && msfoJobMatch) return await msfoJob(auth, decodeURIComponent(msfoJobMatch[1]), env);
        const jobMatch = url.pathname.match(/^\/api\/ai\/jobs\/([^/]+)$/);
        if (jobMatch && request.method === 'GET') return await getJob(auth, decodeURIComponent(jobMatch[1]), env);
        return fail(404, 'API manzili topilmadi.');
      } catch (error) {
        if (error instanceof HttpError) return fail(error.status, error.message);
        if (/no such table|D1_ERROR/i.test(String(error?.message || error))) return fail(503, 'Backend bazasi ishga tayyor emas.');
        return fail(500, 'Server xatosi yuz berdi.');
      }
    },
  };
}

export {HttpError, securityHeaders};
