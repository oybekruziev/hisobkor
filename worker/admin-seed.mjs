#!/usr/bin/env node
import {pbkdf2, bytesToHex} from './crypto.mjs';

const username = process.argv[2]?.trim();
const password = process.env.MEZON_BOOTSTRAP_PASSWORD;
if (!username || username.length > 120 || !/^[\p{L}\p{N}_.@+-]+$/u.test(username) || !password || password.length < 12) {
  console.error('Foydalanish: MEZON_BOOTSTRAP_PASSWORD="..." node worker/admin-seed.mjs <username>');
  process.exit(1);
}
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iterations = 100_000;
const accountId = crypto.randomUUID();
const workspaceId = crypto.randomUUID();
const now = Date.now();
const hash = await pbkdf2(password, salt, iterations);
// D1 rejects explicit transaction statements in SQL files; `wrangler d1 execute
// --file` applies this short bootstrap script through D1's supported execution API.
process.stdout.write(`PRAGMA foreign_keys=ON;\nINSERT INTO accounts(id,username,password_salt,password_hash,password_iterations,workspace_id,created_at) VALUES(${quote(accountId)},${quote(username)},${quote(bytesToHex(salt))},${quote(bytesToHex(hash))},${iterations},${quote(workspaceId)},${now});\nINSERT INTO workspaces(id,account_id,state_json,revision,updated_at) VALUES(${quote(workspaceId)},${quote(accountId)},'null',0,${now});\n`);
