import {mkdir, readFile, rename, open, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const MAX_WORKSPACE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FILE_TYPES = new Map([['application/pdf','pdf'],['image/png','png'],['image/jpeg','jpg'],['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx'],['text/csv','csv']]);
export function validFileId(id) { return typeof id==='string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id) && !id.includes('..'); }
const text=(value,max,required=true)=>typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0);
export function validateWorkspaceState(state) {
  if (state === null) return;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Ish joyi ma’lumoti obyekt bo‘lishi kerak.');
  for (const key of ['companies','docs','activity','closed']) {
    if (!Array.isArray(state[key])) throw new Error(`${key} ro‘yxat bo‘lishi kerak.`);
    if (state[key].length > 50_000) throw new Error(`${key} ro‘yxati juda katta.`);
  }
  const companyIds=new Set();
  for(const company of state.companies){if(!company||typeof company!=='object'||Array.isArray(company)||!validFileId(company.id)||companyIds.has(company.id)||!text(company.name,240))throw new Error('Kompaniya ma’lumoti yaroqsiz.');companyIds.add(company.id);for(const key of ['legal','stir','contact','phone','owner'])if(key in company&&!text(company[key],500,false))throw new Error('Kompaniya maydoni yaroqsiz.');}
  const documentIds=new Set(),statuses=new Set(['accepted','review_required','missing','correction_requested','waived','cancelled']);
  for(const doc of state.docs){if(!doc||typeof doc!=='object'||Array.isArray(doc)||!validFileId(doc.id)||documentIds.has(doc.id)||!companyIds.has(doc.company)||!text(doc.title,500)||!text(doc.fileName,500,false)||!statuses.has(doc.status))throw new Error('Hujjat ma’lumoti yaroqsiz.');if('fileKey'in doc&&doc.fileKey!==null&&!validFileId(doc.fileKey))throw new Error('Hujjat fayl kaliti yaroqsiz.');documentIds.add(doc.id);}
  for(const event of state.activity){if(!event||typeof event!=='object'||Array.isArray(event)||!text(event.title,500)||!text(event.detail,2000,false))throw new Error('Faollik ma’lumoti yaroqsiz.');if('id'in event&&!validFileId(event.id))throw new Error('Faollik identifikatori yaroqsiz.');if(event.companyId!==undefined&&event.companyId!==null&&!companyIds.has(event.companyId))throw new Error('Faollik kompaniyasi topilmadi.');}
  if(state.closed.some(value=>!text(value,260)))throw new Error('Yopilgan davr ma’lumoti yaroqsiz.');
  if (!('profile' in state) || (state.profile !== null && (!state.profile || typeof state.profile !== 'object' || Array.isArray(state.profile)))) throw new Error('Profil yaroqsiz.');
  if(state.profile){if(!text(state.profile.fullName,100)||!text(state.profile.phone,20))throw new Error('Profil maydoni yaroqsiz.');for(const key of ['email','workspace'])if(key in state.profile&&!text(state.profile[key],240,false))throw new Error('Profil maydoni yaroqsiz.');}
  if('aiAuto'in state&&typeof state.aiAuto!=='boolean')throw new Error('AI sozlamasi yaroqsiz.');
}
export function validateFile(bytes, contentType) {
  const type = String(contentType || '').split(';',1)[0].trim().toLowerCase();
  if (!FILE_TYPES.has(type)) throw new Error('Fayl turi qo‘llab-quvvatlanmaydi.');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('Fayl hajmi 25 MBdan oshmasligi kerak.');
  const begins = (...values) => values.every((value,index) => bytes[index] === value);
  if (type === 'application/pdf' && bytes.subarray(0,5).toString('ascii') !== '%PDF-') throw new Error('PDF fayli yaroqsiz.');
  if (type === 'image/png' && !begins(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)) throw new Error('PNG fayli yaroqsiz.');
  if (type === 'image/jpeg' && !begins(0xff,0xd8,0xff)) throw new Error('JPEG fayli yaroqsiz.');
  if (type.endsWith('spreadsheetml.sheet') && !begins(0x50,0x4b,0x03,0x04)) throw new Error('Excel fayli yaroqsiz.');
  if (type === 'text/csv') {
    if (bytes.includes(0)) throw new Error('CSV fayli yaroqsiz.');
    try { new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { throw new Error('CSV UTF-8 formatida bo‘lishi kerak.'); }
  }
  return type;
}
async function atomicWrite(target, data) {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary,data,{mode:0o600,flag:'wx'});
  const handle = await open(temporary,'r'); try { await handle.sync(); } finally { await handle.close(); }
  await rename(temporary,target);
  const directory = await open(path.dirname(target),'r'); try { await directory.sync(); } finally { await directory.close(); }
}
export async function createStorage(dataDir) {
  const filesDir=path.join(dataDir,'files'), workspacePath=path.join(dataDir,'workspace.json'), fileIndexPath=path.join(dataDir,'files.json');
  await mkdir(filesDir,{recursive:true,mode:0o700});
  let workspace={state:null,revision:0}, fileIndex={};
  try { const saved=JSON.parse(await readFile(workspacePath,'utf8')); validateWorkspaceState(saved.state); if(!Number.isSafeInteger(saved.revision)||saved.revision<0)throw new Error(); workspace=saved; }
  catch(error){if(error.code!=='ENOENT')throw new Error('Saqlangan ish joyi ma’lumoti buzilgan.');}
  try { const saved=JSON.parse(await readFile(fileIndexPath,'utf8')); if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error();for(const[id,metadata]of Object.entries(saved)){if(!validFileId(id)||!metadata||!FILE_TYPES.has(metadata.contentType)||metadata.ext!==FILE_TYPES.get(metadata.contentType)||!Number.isSafeInteger(metadata.size)||metadata.size<1||metadata.size>MAX_FILE_BYTES)throw new Error();}fileIndex=saved; }
  catch(error){if(error.code!=='ENOENT')throw new Error('Saqlangan fayl indeksi buzilgan.');}
  let queue=Promise.resolve(); const serialize=operation=>{const result=queue.then(operation,operation);queue=result.catch(()=>{});return result;};
  return {
    getWorkspace:()=>structuredClone(workspace),
    putWorkspace:(state,revision)=>serialize(async()=>{if(revision!==workspace.revision)return{conflict:true,revision:workspace.revision};validateWorkspaceState(state);const next={state,revision:workspace.revision+1},encoded=JSON.stringify(next);if(Buffer.byteLength(encoded)>MAX_WORKSPACE_BYTES)throw new Error('Ish joyi ma’lumoti 10 MBdan oshmasligi kerak.');await atomicWrite(workspacePath,encoded);workspace=structuredClone(next);return{revision:workspace.revision};}),
    putFile:(id,bytes,contentType)=>serialize(async()=>{const ext=FILE_TYPES.get(contentType),existing=fileIndex[id];if(existing){const current=await readFile(path.join(filesDir,id));if(existing.contentType===contentType&&current.equals(bytes))return{unchanged:true};return{conflict:true};}await atomicWrite(path.join(filesDir,id),bytes);const next={...fileIndex,[id]:{contentType,ext,size:bytes.length}};await atomicWrite(fileIndexPath,JSON.stringify(next));fileIndex=next;return{unchanged:false};}),
    async getFile(id){const metadata=fileIndex[id];if(!metadata)return null;try{return{metadata,bytes:await readFile(path.join(filesDir,id))};}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  };
}
