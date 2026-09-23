import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,validAnalysis,compareDocument} from '../src/ai-domain.mjs';
import {parseAnalysis,analyzeFile,validatePayload} from '../ai-service.mjs';
const result=(extra={})=>({kind:'invoice',summary:'Test fixture',number:'10',date:'2026-09-07',contractNumber:'87L26',contractDate:'2026-09-01',sellerTaxId:'111111111',buyerTaxId:'222222222',currency:'UZS',total:18000000,evidence:'Test fixture',issues:[],limitations:[],...extra});
const doc=(id,r,extra={})=>({id,fileKey:id,company:'a',fileName:id+'.pdf',title:id,status:'accepted',ai:{status:'complete',fileKey:id,result:r},...extra});
const invoice=doc('invoice',result());
const contract=doc('contract',result({kind:'contract',number:'87L26',date:'2026-09-01',total:20000000}));
const company={id:'a',name:'Company A',stir:'222222222'};
const texts=notes=>notes.map(n=>n.title).join('|');
test('accepted real uploads are eligible; placeholders and examples are excluded',()=>{assert.equal(eligible(invoice),true);assert.equal(eligible({...invoice,demo:true}),false);assert.equal(eligible({...invoice,status:'missing'}),false);assert.equal(eligible({...invoice,fileName:''}),false)});
test('invoice issue date is not compared to contract date; difference is a review note',()=>{const before=structuredClone(invoice);const notes=compareDocument(invoice,[invoice,contract],company);assert.match(texts(notes),/solishtirildi/);assert.match(texts(notes),/Summalar farq qiladi/);assert.doesNotMatch(texts(notes),/sanasida farq/);assert.match(notes.find(n=>n.title==='Summalar farq qiladi').detail,/qisman/);assert.deepEqual(invoice,before)});
test('never links matching contract numbers across companies',()=>{const notes=compareDocument(invoice,[{...contract,company:'b'}],company);assert.match(texts(notes),/Shartnoma kerak/);assert.ok(notes.every(n=>!n.relatedId))});
test('late contract updates comparison without analyzing invoice again',()=>{assert.match(texts(compareDocument(invoice,[invoice],company)),/Shartnoma kerak/);assert.match(texts(compareDocument(invoice,[invoice,contract],company)),/solishtirildi/)});
test('replaced file invalidates old analysis and comparison',()=>{const changed={...contract,fileKey:'new-upload'};assert.equal(validAnalysis(changed),false);assert.match(texts(compareDocument(invoice,[changed],company)),/Shartnoma kerak/)});
test('duplicate contract references require manual choice',()=>{const notes=compareDocument(invoice,[contract,{...contract,id:'duplicate'}],company);assert.match(texts(notes),/Bir nechta/);assert.ok(notes.every(n=>!n.relatedId))});
test('company mismatch, swapped parties, missing amount and date mismatch are flagged',()=>{const changed=doc('other',result({kind:'contract',number:'87L26',date:'2026-08-01',sellerTaxId:'222222222',buyerTaxId:'111111111',total:null}));const notes=compareDocument(invoice,[changed],{...company,stir:'333333333'});assert.match(texts(notes),/Kompaniya STIRi mos kelmadi/);assert.match(texts(notes),/Sotuvchi STIRida farq/);assert.match(texts(notes),/Xaridor STIRida farq/);assert.match(texts(notes),/sanasida farq/);assert.match(texts(notes),/Summani to‘liq/)});
test('null fields do not become invented matches',()=>{const d=doc('unknown',result({contractNumber:null,total:null}));assert.match(texts(compareDocument(d,[contract],company)),/havolasi aniqlanmadi/)});
test('upstream refusals, incomplete and malformed outputs are failures',()=>{assert.throws(()=>parseAnalysis({status:'incomplete',output:[]}));assert.throws(()=>parseAnalysis({status:'completed',output:[{content:[{type:'refusal'}]}]}));assert.throws(()=>parseAnalysis({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]}));assert.throws(()=>parseAnalysis({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result({total:'18'}))}]}]}))});
test('valid structured output is parsed without mutating review status',()=>{const r=result();assert.deepEqual(parseAnalysis({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(r)}]}]}),r)});
test('rejects unsupported files, invalid base64 and fake PDFs',()=>{assert.throws(()=>validatePayload({file:{name:'a.exe',base64:'YQ=='}}));assert.throws(()=>validatePayload({file:{name:'a.csv',base64:'abcd$==='}}));assert.throws(()=>validatePayload({file:{name:'a.pdf',base64:'YQ=='}}))});
test('OpenAI request keeps key server-side, disables response storage and handles tables explicitly',async()=>{let calls=0;const actual=await analyzeFile({file:{name:'test.csv',base64:Buffer.from('a,b\n1,2').toString('base64')}},{key:'test-only-secret',model:'test-model',fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.input[0].content[1].type,'input_file');assert.ok(!options.body.includes('test-only-secret'));return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result())}]}]})}}});assert.equal(calls,1);assert.match(actual.limitations.join(' '),/1000/);assert.equal(actual.model,'test-model')});
test('rate limits are visible errors, never fake successful conclusions',async()=>{await assert.rejects(()=>analyzeFile({file:{name:'test.csv',base64:'YQ=='}},{key:'test-only',model:'test-model',fetcher:async()=>({ok:false,status:429})}),/limiti yoki balansi/)});

test('AI findings carry a colour tone and are read worst first', async () => {
  const {issueTone, reviewFindings} = await import('../src/ai-domain.mjs');
  assert.equal(issueTone({severity: 'conflict', title: 'x', detail: ''}), 'conflict');
  assert.equal(issueTone({severity: 'info', title: 'Summalar farq qiladi', detail: ''}), 'info');
  // Analyses saved before severity existed fall back to their wording.
  assert.equal(issueTone({title: 'Umumiy summa bo‘yicha ichki ziddiyat', detail: ''}), 'conflict');
  assert.equal(issueTone({title: 'Shartnoma sanasi o‘qilmadi', detail: 'Qo‘lda tekshiring.'}), 'warning');
  const issue = (severity, title) => ({severity, title, detail: 'd', evidence: 'e', action: 'a'});
  const doc = {id: 'd1', company: 'c', fileName: 'a.pdf', status: 'review_required', ai: {status: 'complete', fileKey: 'd1', result: {kind: 'contract', summary: 's', number: '1', date: null, contractNumber: null, contractDate: null, sellerTaxId: '111111111', buyerTaxId: '222222222', currency: null, total: null, evidence: '', limitations: [], issues: [issue('warning', 'w'), issue('conflict', 'c'), issue('info', 'i')]}}};
  const found = reviewFindings(doc, [doc], {id: 'c', name: 'Atlas', stir: '333333333'});
  assert.deepEqual(found.issues.map(x => x.tone), ['conflict', 'warning', 'info']);
  assert.equal(found.notes[0].tone, 'conflict'); // the company STIR is on neither side of the document
  assert.deepEqual(found.counts, {conflict: 2, warning: 1, info: 1});
  assert.deepEqual(reviewFindings({...doc, ai: null}, [], null).counts, {conflict: 0, warning: 0, info: 0});
});
