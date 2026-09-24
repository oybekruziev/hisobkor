export const backupLimit=100*1024*1024;
export function fileReferences(state){
 const refs=new Map();
 for(const d of state.docs||[]){
  if(d.demo||!d.fileName||d.status==='missing')continue;
  refs.set(d.fileKey||d.id,{id:d.fileKey||d.id,name:d.fileName});
  for(const v of d.versions||[])if(v.fileKey&&v.fileName)refs.set(v.fileKey,{id:v.fileKey,name:v.fileName});
 }
 // MHXS editor documents (JSON) and their PDF sources travel with the backup too.
 for(const m of state.msfo||[]){
  if(m.fileKey)refs.set(m.fileKey,{id:m.fileKey,name:`${m.fileKey}.json`});
  if(m.sourceFileKey)refs.set(m.sourceFileKey,{id:m.sourceFileKey,name:/\.pdf$/i.test(m.sourceName||'')?m.sourceName:'manba.pdf'});
 }
 return [...refs.values()];
}
export function validateBackup(value){
 const fail=()=>{throw Error('Bu Hisobkor zaxira fayli emas yoki ma’lumotlari to‘liq emas.');};
 if(value?.format!=='hisobkor-backup'||value.version!==1||!value.state||!Array.isArray(value.files))fail();
 const {state,files}=value;
 for(const key of ['companies','docs','activity','closed'])if(!Array.isArray(state[key]))fail();
 const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
 if(state.companies.some(c=>!safeId(c.id)||typeof c.name!=='string'||!c.name.trim())||new Set(state.companies.map(c=>c.id)).size!==state.companies.length)fail();
 const companies=new Set(state.companies.map(c=>c.id));
 if(state.docs.some(d=>!safeId(d.id)||!companies.has(d.company)||typeof d.title!=='string'||typeof d.fileName!=='string'||!['missing','review_required','accepted','correction_requested','waived','cancelled'].includes(d.status)||(d.fileKey&&!safeId(d.fileKey))||(d.versions!==undefined&&!Array.isArray(d.versions)))||new Set(state.docs.map(d=>d.id)).size!==state.docs.length)fail();
 if(state.profile&&(typeof state.profile.fullName!=='string'||typeof state.profile.phone!=='string'))fail();
 if(files.some(f=>!safeId(f.id)||typeof f.name!=='string'||!/\.(pdf|png|jpe?g|xlsx|csv|json)$/i.test(f.name)||typeof f.base64!=='string'||f.base64.length>35_000_000||f.base64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.base64)))fail();
 const ids=new Set(files.map(f=>f.id));
 if(ids.size!==files.length||fileReferences(state).some(f=>!ids.has(f.id)))fail();
 return value;
}
