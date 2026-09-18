import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadConfig} from '../server-config.mjs';
import {createApp} from '../server.mjs';
import {createStorage,validFileId,validateFile,validateWorkspaceState} from '../server-storage.mjs';

const password='a-strong-test-password';
const emptyState=()=>({companies:[],docs:[],activity:[],closed:[],profile:null,aiAuto:true});
async function fixture(){
 const dataDir=await mkdtemp(path.join(tmpdir(),'mezon-server-'));
 const config=loadConfig({NODE_ENV:'production',APP_ORIGIN:'https://hisobkor.example',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:password,DATA_DIR:dataDir,PORT:'4173'});
 const app=await createApp({config});
 const server=http.createServer(app.handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const request=(pathname,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:pathname,method,headers:{Host:'hisobkor.example',...headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);if(body)req.write(body);req.end();});
 const login=async()=>{const response=await request('/api/login',{method:'POST',headers:{Origin:'https://hisobkor.example','X-Mezon-Request':'1','Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});assert.equal(response.status,200);return response.headers['set-cookie'][0].split(';',1)[0];};
 return{dataDir,request,login,close:()=>new Promise(resolve=>server.close(()=>{app.close();resolve();}))};
}

test('production config fails closed when required secrets or HTTPS origin are missing',()=>{
 assert.throws(()=>loadConfig({NODE_ENV:'production'}),/APP_ORIGIN/);
 assert.throws(()=>loadConfig({NODE_ENV:'production',APP_ORIGIN:'http:\/\/example.com'}),/HTTPS/);
 assert.throws(()=>loadConfig({NODE_ENV:'production',APP_ORIGIN:'https://example.com',ADMIN_USERNAME:'a',ADMIN_PASSWORD:'short',DATA_DIR:'/tmp/data'}),/16/);
});
test('production rejects the documented placeholder password',()=>{assert.throws(()=>loadConfig({NODE_ENV:'production',APP_ORIGIN:'https://hisobkor.uz',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'replace-with-at-least-16-random-characters',DATA_DIR:'/tmp/hisobkor'}),/namuna/)});
test('file IDs, MIME allowlist, and signatures are validated',()=>{
 assert.equal(validFileId('legacy-key_1'),true);assert.equal(validFileId(null),false);assert.equal(validFileId(5),false);assert.equal(validFileId('../secret'),false);assert.equal(validFileId('a/b'),false);
 assert.equal(validateFile(Buffer.from('%PDF-1.7\n'),'application/pdf'),'application/pdf');
 assert.throws(()=>validateFile(Buffer.from('<html>'),'application/pdf'),/PDF/);
 assert.throws(()=>validateFile(Buffer.from('<html>'),'text/html'),/qo‘llab/);
});
test('workspace schema keeps legacy extras but rejects broken core relationships',()=>{
 const valid={companies:[{id:'company-1',name:'Test',legacy:'kept'}],docs:[{id:'doc-1',company:'company-1',title:'Faktura',fileName:'a.pdf',status:'review_required',legacy:true}],activity:[{title:'Yuklandi',detail:'Test'}],closed:[],profile:{fullName:'Test User',phone:'+998901234567',legacy:true},legacy:{kept:true}};
 assert.doesNotThrow(()=>validateWorkspaceState(valid));
 assert.throws(()=>validateWorkspaceState({...valid,docs:[{...valid.docs[0],company:'missing'}]}),/Hujjat/);
 assert.throws(()=>validateWorkspaceState({...valid,companies:[...valid.companies,{id:'company-1',name:'Duplicate'}]}),/Kompaniya/);
 assert.throws(()=>validateWorkspaceState({...valid,profile:{fullName:'Test'}}),/Profil/);
});
test('session, workspace revision, protected files, and static allowlist work together',async t=>{
 const f=await fixture();t.after(f.close);
 let response=await f.request('/healthz');assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.body),{ok:true});
 response=await f.request('/api/session');assert.deepEqual(JSON.parse(response.body),{authenticated:false,mode:'production',storage:'server'});
 response=await f.request('/api/workspace');assert.equal(response.status,401);
 response=await f.request('/api/login',{method:'POST',headers:{Origin:'https://evil.example','X-Mezon-Request':'1','Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403);
 const cookie=await f.login(),auth={Cookie:cookie,Origin:'https://hisobkor.example','X-Mezon-Request':'1'};
 response=await f.request('/api/workspace',{headers:{Cookie:cookie}});assert.deepEqual(JSON.parse(response.body),{state:null,revision:0});
 response=await f.request('/api/workspace',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:0,state:emptyState()})});assert.equal(response.status,200);assert.equal(JSON.parse(response.body).revision,1);
 response=await f.request('/api/workspace',{method:'PUT',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({revision:0,state:{companies:[]}})});assert.equal(response.status,409);assert.equal(JSON.parse(response.body).revision,1);
 const pdf=Buffer.from('%PDF-1.7\nfixture');response=await f.request('/api/files/doc-1',{method:'PUT',headers:{...auth,'Content-Type':'application/pdf','Content-Length':pdf.length},body:pdf});assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.body),{ok:true});
 response=await f.request('/api/files/doc-1',{method:'PUT',headers:{...auth,'Content-Type':'application/pdf'},body:pdf});assert.equal(response.status,200);
 response=await f.request('/api/files/doc-1',{method:'PUT',headers:{...auth,'Content-Type':'application/pdf'},body:Buffer.from('%PDF-1.7\ndifferent')});assert.equal(response.status,409);
 response=await f.request('/api/files/doc-1',{headers:{Cookie:cookie}});assert.equal(response.status,200);assert.equal(response.headers['content-type'],'application/pdf');assert.match(response.headers['content-disposition'],/^attachment;/);assert.deepEqual(response.body,pdf);
 response=await f.request('/app.js.map');assert.equal(response.status,404);
 const persisted=JSON.parse(await readFile(path.join(f.dataDir,'workspace.json'),'utf8'));assert.equal(persisted.revision,1);
});
test('protected mutations reject missing auth, wrong origin, missing header, corrupt files, and null JSON',async t=>{
 const f=await fixture();t.after(f.close);
 let response=await f.request('/api/files/private');assert.equal(response.status,401);
 const cookie=await f.login(),base={Cookie:cookie,'Content-Type':'application/json'};
 response=await f.request('/api/workspace',{method:'PUT',headers:{...base,Origin:'https://evil.example','X-Mezon-Request':'1'},body:JSON.stringify({revision:0,state:emptyState()})});assert.equal(response.status,403);
 response=await f.request('/api/workspace',{method:'PUT',headers:{...base,Origin:'https://hisobkor.example'},body:JSON.stringify({revision:0,state:emptyState()})});assert.equal(response.status,403);
 response=await f.request('/api/workspace',{method:'PUT',headers:{...base,Origin:'https://hisobkor.example','X-Mezon-Request':'1'},body:'null'});assert.equal(response.status,400);
 response=await f.request('/api/files/bad',{method:'PUT',headers:{Cookie:cookie,Origin:'https://hisobkor.example','X-Mezon-Request':'1','Content-Type':'application/pdf'},body:Buffer.from('<html>')});assert.equal(response.status,400);
 response=await f.request('/api/files/bad',{headers:{Cookie:cookie,Origin:'https://evil.example'}});assert.equal(response.status,403);
});
test('login limiter reserves attempts and logout invalidates the session',async t=>{
 const f=await fixture();t.after(f.close);const headers={Origin:'https://hisobkor.example','X-Mezon-Request':'1','Content-Type':'application/json'};
 let response=await f.request('/api/login',{method:'POST',headers,body:'null'});assert.equal(response.status,400);
 for(let index=0;index<5;index++){response=await f.request('/api/login',{method:'POST',headers,body:JSON.stringify({username:'admin',password:'wrong-password'})});assert.equal(response.status,401);}
 response=await f.request('/api/login',{method:'POST',headers,body:JSON.stringify({username:'admin',password})});assert.equal(response.status,429);
 const other=await fixture();t.after(other.close);const cookie=await other.login();response=await other.request('/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:'https://hisobkor.example','X-Mezon-Request':'1'}});assert.equal(response.status,200);
 response=await other.request('/api/session',{headers:{Cookie:cookie}});assert.equal(JSON.parse(response.body).authenticated,false);
 const concurrent=await fixture();t.after(concurrent.close);const statuses=await Promise.all(Array.from({length:6},()=>concurrent.request('/api/login',{method:'POST',headers,body:JSON.stringify({username:'admin',password:'wrong-password'})}).then(result=>result.status)));assert.deepEqual(statuses.sort(),[401,401,401,401,401,429]);
});
test('workspace metadata survives storage reload with its revision',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'mezon-storage-')),first=await createStorage(dataDir),state=emptyState();
 assert.deepEqual(await first.putWorkspace(state,0),{revision:1});
 const reloaded=await createStorage(dataDir);assert.deepEqual(reloaded.getWorkspace(),{state,revision:1});
});
test('production AI key is managed by the server',async t=>{
 const f=await fixture();t.after(f.close);const cookie=await f.login();
 let response=await f.request('/api/ai/status',{headers:{Cookie:cookie}});assert.deepEqual(JSON.parse(response.body),{connected:false,managed:true,model:'gpt-5.6-luna'});
 response=await f.request('/api/ai/connect',{method:'POST',headers:{Cookie:cookie,Origin:'https://hisobkor.example','X-Mezon-Request':'1','Content-Type':'application/json'},body:JSON.stringify({key:'sk-browser-key-must-not-work'})});assert.equal(response.status,403);
});
