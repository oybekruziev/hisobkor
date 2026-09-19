import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardRows,comparisonPair} from '../src/dashboard-model.mjs';
const company={id:'a',name:'A',stir:'222'};
const analysis=(extra={})=>({kind:'invoice',summary:'Fixture',number:'F-1',date:'2026-09-19',contractNumber:'SH-1',contractDate:'2026-09-01',sellerTaxId:'111',buyerTaxId:'222',currency:'UZS',total:100,issues:[],limitations:[],...extra});
const doc=(id,extra={})=>({id,fileKey:id,company:'a',fileName:id+'.pdf',title:id,status:'review_required',scope:'periodic',period:'2026-09',...extra});
const reviewed=(id,result,extra={})=>doc(id,{ai:{status:'complete',fileKey:id,result},...extra});
test('dashboard counts period uploads and permanent documents without other companies, demos, cancelled or waived requirements',()=>{
 const docs=[doc('a'),doc('old',{period:'2026-08'}),doc('archive',{scope:'permanent',period:'2026-01'}),doc('missing',{fileName:'',status:'missing'}),doc('waived',{fileName:'',status:'waived'}),doc('demo',{demo:true}),doc('other',{company:'b'}),doc('cancelled',{status:'cancelled'})];
 const [row]=dashboardRows([company],docs,'2026-09');assert.equal(row.total,3);assert.equal(row.uploaded.length,2);assert.equal(row.received,67);assert.equal(row.state,'waiting');assert.equal(row.analyzed.length,0);
});
test('empty dashboard does not imply complete documents or a ready company',()=>{
 const [row]=dashboardRows([company],[],'2026-09');assert.equal(row.received,null);assert.equal(row.state,'empty');
});
test('comparison uses exact linked contract, detects referenced date differences, and excludes informational notes from issues',()=>{
 const invoice=reviewed('invoice',analysis());const contract=reviewed('contract',analysis({kind:'contract',number:'SH-1',date:'2026-09-02'}),{scope:'permanent'});
 const [row]=dashboardRows([company],[invoice,contract],'2026-09');const pair=comparisonPair(row);assert.equal(pair.primary.id,'invoice');assert.equal(pair.contract.id,'contract');assert.equal(pair.dateMismatch,true);assert.deepEqual(row.notes.map(n=>n.title),['Shartnoma sanasida farq']);
});
test('old AI results and same-number contracts from another company never form evidence pairs',()=>{
 const invoice=reviewed('invoice',analysis());const other=reviewed('other',analysis({kind:'contract',number:'SH-1'}),{company:'b'});const stale=reviewed('stale',analysis({kind:'contract',number:'SH-1'}),{fileKey:'replacement'});
 const [row]=dashboardRows([company],[invoice,other,stale],'2026-09');assert.equal(row.analyzed.length,1);assert.equal(comparisonPair(row).contract,null);assert.ok(row.notes.some(n=>n.title==='Shartnoma kerak'));
});
