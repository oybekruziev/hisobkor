import {WorkflowEntrypoint} from 'cloudflare:workers';
import {analyzeFile} from '../ai-service.mjs';
import {createWorker} from './app.mjs';

const worker = createWorker();
export default worker;

const publicError = error => {
  const message = String(error?.message || '');
  if (/API kaliti|OpenAI limiti|OpenAI so‘rov|AI javobi|AI bu fayl|Fayl turi|Fayl hajmi|PDF fayli|Excel fayli/.test(message)) return message.slice(0, 500);
  return 'Avtomatik tekshiruv bajarilmadi. Keyinroq qayta urinib ko‘ring.';
};

async function currentVersion(env, payload) {
  const workspace = await env.DB.prepare('SELECT state_json FROM workspaces WHERE id=? AND account_id=?').bind(payload.workspaceId, payload.accountId).first();
  let state;
  try { state = JSON.parse(workspace?.state_json); } catch { return false; }
  const doc = state?.docs?.find(value => value.id === payload.documentId);
  if (!doc || (doc.fileKey || doc.id) !== payload.fileKey) return false;
  const file = await env.DB.prepare(`SELECT id,r2_key FROM file_versions
    WHERE id=? AND account_id=? AND workspace_id=? AND logical_id=? AND is_current=1`).bind(payload.fileVersionId, payload.accountId, payload.workspaceId, payload.fileKey).first();
  return !!file && file.r2_key === payload.r2Key;
}

export class DocumentReviewWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const payload = event.payload;
    if (!payload || !/^[0-9a-f-]{36}$/i.test(payload.jobId || '')) return {status: 'ignored'};
    const activeLimit = Math.max(1, Math.min(5, Number(this.env.AI_MAX_ACTIVE_PER_ACCOUNT) || 2));
    let claim = 'waiting';
    for (let attempt = 1; attempt <= 120 && claim === 'waiting'; attempt++) {
      claim = await step.do(`claim queued review ${attempt}`, async () => {
        if (!await currentVersion(this.env, payload)) {
          await this.env.DB.prepare("UPDATE ai_jobs SET status='error',error=?,updated_at=? WHERE id=? AND account_id=?")
            .bind('Hujjat fayli almashtirilgan. Yangi faylni qayta tekshiring.', Date.now(), payload.jobId, payload.accountId).run();
          return 'terminal';
        }
        const result = await this.env.DB.prepare(`UPDATE ai_jobs SET status='processing',updated_at=?
          WHERE id=? AND account_id=? AND workspace_id=? AND file_version_id=? AND status='queued'
            AND (SELECT COUNT(*) FROM ai_jobs WHERE account_id=? AND status='processing') < ?`)
          .bind(Date.now(), payload.jobId, payload.accountId, payload.workspaceId, payload.fileVersionId, payload.accountId, activeLimit).run();
        if (Number(result?.meta?.changes ?? result?.changes ?? 0) === 1) return 'claimed';
        const job = await this.env.DB.prepare('SELECT status FROM ai_jobs WHERE id=? AND account_id=?').bind(payload.jobId, payload.accountId).first();
        return job?.status === 'queued' ? 'waiting' : 'terminal';
      });
      if (claim === 'waiting' && attempt < 120) await step.sleep(`wait for account capacity ${attempt}`, '1 minute');
    }
    if (claim === 'terminal') return {status: 'ignored'};
    if (claim !== 'claimed') {
      await step.do('expire capacity wait', async () => {
        await this.env.DB.prepare("UPDATE ai_jobs SET status='error',error=?,updated_at=? WHERE id=? AND account_id=? AND status='queued'")
          .bind('Tekshiruv navbati uzoq band bo‘ldi. Qayta urinib ko‘ring.', Date.now(), payload.jobId, payload.accountId).run();
      });
      return {status: 'error'};
    }

    let result;
    try {
      result = await step.do('analyze immutable document version', {retries: {limit: 2, delay: '20 seconds', backoff: 'exponential'}, timeout: '4 minutes'}, async () => {
        if (!await currentVersion(this.env, payload)) throw new Error('STALE_DOCUMENT_VERSION');
        const object = await this.env.DOCUMENTS.get(payload.r2Key);
        if (!object || !('body' in object)) throw new Error('DOCUMENT_NOT_FOUND');
        const bytes = Buffer.from(await object.arrayBuffer());
        if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error('DOCUMENT_SIZE_INVALID');
        return analyzeFile({file: {name: payload.fileName, base64: bytes.toString('base64')}}, {
          key: this.env.OPENAI_API_KEY,
          model: this.env.OPENAI_MODEL || 'gpt-5.6-luna',
        });
      });
    } catch (error) {
      await step.do('record review failure', async () => {
        const stale = String(error?.message || '').includes('STALE_DOCUMENT_VERSION');
        await this.env.DB.prepare("UPDATE ai_jobs SET status='error',error=?,updated_at=? WHERE id=? AND account_id=? AND status='processing'")
          .bind(stale ? 'Hujjat fayli almashtirilgan. Yangi faylni qayta tekshiring.' : publicError(error), Date.now(), payload.jobId, payload.accountId).run();
      });
      return {status: 'error'};
    }

    return step.do('publish current review result', async () => {
      if (!await currentVersion(this.env, payload)) {
        await this.env.DB.prepare("UPDATE ai_jobs SET status='error',result_json=NULL,error=?,updated_at=? WHERE id=? AND account_id=? AND status='processing'")
          .bind('Hujjat fayli almashtirilgan. Natija yangi faylga qo‘llanmadi.', Date.now(), payload.jobId, payload.accountId).run();
        return {status: 'stale'};
      }
      const encoded = JSON.stringify(result);
      if (new TextEncoder().encode(encoded).length > 1024 * 1024) {
        await this.env.DB.prepare("UPDATE ai_jobs SET status='error',result_json=NULL,error=?,updated_at=? WHERE id=? AND account_id=? AND status='processing'")
          .bind('Tekshiruv natijasi juda katta bo‘ldi.', Date.now(), payload.jobId, payload.accountId).run();
        return {status: 'error'};
      }
      await this.env.DB.prepare("UPDATE ai_jobs SET status='complete',result_json=?,error=NULL,updated_at=? WHERE id=? AND account_id=? AND workspace_id=? AND file_version_id=? AND status='processing'")
        .bind(encoded, Date.now(), payload.jobId, payload.accountId, payload.workspaceId, payload.fileVersionId).run();
      return {status: 'complete'};
    });
  }
}
