import {pbkdf2, bytesToHex} from './crypto.mjs';

/** Admin accounts are configured, not stored: ADMIN_USERNAMES="oybek,another" in wrangler vars. */
export function adminUsernames(env) {
  return String(env?.ADMIN_USERNAMES || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
}
export const isAdminUser = (env, username) => !!username && adminUsernames(env).includes(String(username).toLowerCase());

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function temporaryPassword(length = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(value => ALPHABET[value % ALPHABET.length]).join('');
}

const ACCOUNT_ID = /^[0-9a-f-]{36}$/i;

export async function listUsers(env, {query = '', limit = 200} = {}) {
  const like = `%${String(query).trim().toLowerCase().replace(/[%_\\]/g, char => `\\${char}`)}%`;
  const rows = await env.DB.prepare(`SELECT a.id, a.username, a.disabled, a.created_at,
      w.updated_at AS workspace_updated_at, w.revision,
      CASE WHEN w.state_json IS NULL OR w.state_json='null' THEN 0 ELSE length(w.state_json) END AS state_bytes,
      CASE WHEN json_valid(w.state_json) AND json_type(w.state_json,'$.companies')='array' THEN json_array_length(w.state_json,'$.companies') ELSE 0 END AS companies,
      CASE WHEN json_valid(w.state_json) AND json_type(w.state_json,'$.docs')='array' THEN json_array_length(w.state_json,'$.docs') ELSE 0 END AS documents,
      CASE WHEN json_valid(w.state_json) AND json_type(w.state_json,'$.msfo')='array' THEN json_array_length(w.state_json,'$.msfo') ELSE 0 END AS msfo,
      CASE WHEN json_valid(w.state_json) THEN json_extract(w.state_json,'$.profile.fullName') END AS full_name,
      CASE WHEN json_valid(w.state_json) THEN json_extract(w.state_json,'$.profile.phone') END AS phone,
      (SELECT COUNT(*) FROM file_versions f WHERE f.account_id=a.id) AS files,
      (SELECT COALESCE(SUM(f.size),0) FROM file_versions f WHERE f.account_id=a.id) AS file_bytes,
      (SELECT COUNT(*) FROM ai_jobs j WHERE j.account_id=a.id) AS ai_jobs,
      (SELECT MAX(s.last_seen_at) FROM sessions s WHERE s.account_id=a.id) AS last_seen_at,
      (SELECT COUNT(*) FROM sessions s WHERE s.account_id=a.id AND s.expires_at>?) AS active_sessions
    FROM accounts a LEFT JOIN workspaces w ON w.id=a.workspace_id
    WHERE lower(a.username) LIKE ? ESCAPE '\\'
    ORDER BY a.created_at DESC LIMIT ?`).bind(Date.now(), like, limit).all();
  return (rows?.results || []).map(row => ({
    id: row.id,
    username: row.username,
    admin: isAdminUser(env, row.username),
    disabled: Number(row.disabled) === 1,
    createdAt: Number(row.created_at),
    lastSeenAt: row.last_seen_at == null ? null : Number(row.last_seen_at),
    lastActivityAt: row.workspace_updated_at == null ? null : Number(row.workspace_updated_at),
    activeSessions: Number(row.active_sessions || 0),
    fullName: row.full_name || '',
    phone: row.phone || '',
    companies: Number(row.companies || 0),
    documents: Number(row.documents || 0),
    msfo: Number(row.msfo || 0),
    files: Number(row.files || 0),
    fileBytes: Number(row.file_bytes || 0),
    stateBytes: Number(row.state_bytes || 0),
    aiJobs: Number(row.ai_jobs || 0),
  }));
}

async function account(env, id) {
  if (!ACCOUNT_ID.test(String(id || ''))) return null;
  return env.DB.prepare('SELECT id, username, disabled, workspace_id FROM accounts WHERE id=?').bind(id).first();
}

/**
 * Routes /api/admin/* for an authenticated session. Returns null when the path is not an admin route.
 * Non-admins get 404 so the surface stays invisible. `respond(data, status)` and `HttpError` come from app.mjs.
 */
export async function handleAdmin(request, auth, env, url, {json, HttpError, readJSON}) {
  if (!url.pathname.startsWith('/api/admin/')) return null;
  if (!auth.admin) throw new HttpError(404, 'API manzili topilmadi.');
  if (request.method === 'GET' && url.pathname === '/api/admin/users') {
    const query = String(url.searchParams.get('q') || '').slice(0, 80);
    const users = await listUsers(env, {query});
    return json({users, admins: adminUsernames(env), generatedAt: Date.now()});
  }
  const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)(?:\/(disable|password))?$/);
  if (!match) throw new HttpError(404, 'API manzili topilmadi.');
  const target = await account(env, decodeURIComponent(match[1]));
  if (!target) throw new HttpError(404, 'Foydalanuvchi topilmadi.');
  const self = target.id === auth.accountId;
  const now = Date.now();

  if (request.method === 'POST' && match[2] === 'disable') {
    const body = await readJSON(request, 4 * 1024);
    const disabled = body?.disabled === true;
    if (self && disabled) throw new HttpError(400, 'O‘z hisobingizni bloklay olmaysiz.');
    if (disabled && isAdminUser(env, target.username)) throw new HttpError(400, 'Admin hisobini bloklab bo‘lmaydi. Avval uni ADMIN_USERNAMES ro‘yxatidan olib tashlang.');
    const statements = [env.DB.prepare('UPDATE accounts SET disabled=? WHERE id=?').bind(disabled ? 1 : 0, target.id)];
    if (disabled) statements.push(env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(target.id));
    await env.DB.batch(statements);
    return json({id: target.id, disabled});
  }

  if (request.method === 'POST' && match[2] === 'password') {
    const password = temporaryPassword(16);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = bytesToHex(await pbkdf2(password, salt, 100_000));
    await env.DB.batch([
      env.DB.prepare('UPDATE accounts SET password_salt=?, password_hash=?, password_iterations=100000 WHERE id=?').bind(bytesToHex(salt), hash, target.id),
      env.DB.prepare('DELETE FROM sessions WHERE account_id=? AND token_hash<>?').bind(target.id, auth.tokenHash),
    ]);
    return json({id: target.id, username: target.username, password});
  }

  if (request.method === 'DELETE' && !match[2]) {
    if (self) throw new HttpError(400, 'O‘z hisobingizni o‘chira olmaysiz.');
    if (isAdminUser(env, target.username)) throw new HttpError(400, 'Admin hisobini o‘chirib bo‘lmaydi. Avval uni ADMIN_USERNAMES ro‘yxatidan olib tashlang.');
    const files = await env.DB.prepare('SELECT r2_key FROM file_versions WHERE account_id=?').bind(target.id).all();
    const keys = (files?.results || []).map(row => row.r2_key).filter(Boolean);
    for (let index = 0; index < keys.length; index += 100) {
      const chunk = keys.slice(index, index + 100);
      try { await env.DOCUMENTS.delete(chunk); }
      catch { for (const key of chunk) await env.DOCUMENTS.delete(key).catch(() => undefined); }
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(target.id),
      env.DB.prepare('DELETE FROM ai_jobs WHERE account_id=?').bind(target.id),
      env.DB.prepare('DELETE FROM file_versions WHERE account_id=?').bind(target.id),
      env.DB.prepare('DELETE FROM workspaces WHERE account_id=?').bind(target.id),
      env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(target.id),
    ]);
    return json({id: target.id, deleted: true, files: keys.length, at: now});
  }
  throw new HttpError(404, 'API manzili topilmadi.');
}
