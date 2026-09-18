// Keep the original keys so existing local documents remain available.
const key='mezon-workspace-preview-v1';
let mode:'browser'|'server'='browser';
let revision=0;
let conflict=false;
let writes:Promise<unknown>=Promise.resolve();
let pendingWrites=0;
export const hasPendingWrites=()=>pendingWrites>0;
export const storageMode=()=>mode;
export async function request(path:string,options:RequestInit={}){
 const response=await fetch(path,{...options,headers:{'X-Mezon-Request':'1',...options.headers}});
 if(!response.ok){let body;try{body=await response.json()}catch{};throw Object.assign(Error(body?.error||'Server bilan bog‘lanib bo‘lmadi.'),{status:response.status})}
 return response;
}
export function loadState(){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{throw Error('Brauzerdagi saqlangan ma’lumotni o‘qib bo‘lmadi. Ma’lumotlar o‘zgartirilmadi.')}}
export async function openWorkspace(storage:'browser'|'server'){
 mode=storage;conflict=false;
 if(mode==='browser')return loadState();
 const data=await (await request('/api/workspace')).json();revision=data.revision;return data.state;
}
export async function saveState(state:any){
 if(mode==='browser'){localStorage.setItem(key,JSON.stringify(state));return;}
 const snapshot=JSON.stringify(state);
 pendingWrites++;
 const result=writes.catch(()=>{}).then(async()=>{
  if(conflict)throw Error('Boshqa oynada o‘zgarish bor. Saqlanmagan ishni zaxiralab, sahifani yangilang.');
  try{const data=await (await request('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:JSON.parse(snapshot),revision})})).json();revision=data.revision;}
  catch(e:any){if(e.status===409)conflict=true;throw e;}
 }).finally(()=>{pendingWrites--});
 writes=result;return result;
}
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('mezon-preview-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
const mime=(name:string)=>({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv'}[name.split('.').pop()!.toLowerCase()]||'application/octet-stream');
export async function putFile(id:string,file:File){
 if(mode==='server'){await request('/api/files/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':mime(file.name)},body:file});return;}
 const d=await db();return new Promise<void>((resolve,reject)=>{const tx=d.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=tx.onabort=()=>{d.close();reject(tx.error||Error('Fayl saqlanmadi.'))};});
}
export async function getFile(id:string,name?:string):Promise<File>{
 if(mode==='server'){const response=await request('/api/files/'+encodeURIComponent(id));const blob=await response.blob();return new File([blob],name||id,{type:blob.type});}
 const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('files').objectStore('files').get(id);r.onsuccess=()=>{d.close();resolve(r.result)};r.onerror=()=>{d.close();reject(r.error)};});
}
