import path from 'node:path';

function integer(value, fallback, name, {min = 1, max = 65_535} = {}) {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} noto‘g‘ri.`);
  return parsed;
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = integer(env.PORT, 4173, 'PORT');
  const host = env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
  const model = env.OPENAI_MODEL || 'gpt-5.6-luna';
  if (!production) return {production, port, host, model, appOrigin: `http://127.0.0.1:${port}`, dataDir: null};
  if (!env.APP_ORIGIN) throw new Error('Production uchun APP_ORIGIN majburiy.');
  let origin;
  try { origin = new URL(env.APP_ORIGIN); } catch { throw new Error('APP_ORIGIN yaroqli HTTPS manzil bo‘lishi kerak.'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN faqat HTTPS origin bo‘lishi kerak.');
  if (!env.ADMIN_USERNAME?.trim() || env.ADMIN_USERNAME.length > 128) throw new Error('ADMIN_USERNAME majburiy.');
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16 || env.ADMIN_PASSWORD.length > 1024) throw new Error('ADMIN_PASSWORD kamida 16 belgidan iborat bo‘lishi kerak.');
  if (/^(replace-|change-me|example-password)/i.test(env.ADMIN_PASSWORD)) throw new Error('ADMIN_PASSWORD namuna qiymatini almashtiring.');
  if (!env.DATA_DIR?.trim()) throw new Error('DATA_DIR majburiy.');
  return {production, port, host, model, appOrigin: origin.origin, appHost: origin.host, adminUsername: env.ADMIN_USERNAME, adminPassword: env.ADMIN_PASSWORD, dataDir: path.resolve(env.DATA_DIR), openAIKey: env.OPENAI_API_KEY || '', trustProxy: env.TRUST_PROXY === '1'};
}
