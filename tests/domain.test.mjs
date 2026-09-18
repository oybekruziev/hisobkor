import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,transition,validateFile,csvCell} from '../src/domain.mjs';
test('uploaded and review documents do not count as accepted',()=>{const s=summarize([{status:'accepted'},{status:'review_required'},{status:'missing'}]);assert.equal(s.percent,33);assert.equal(s.review,1);assert.equal(s.ready,false)});
test('empty requirements cannot close a period',()=>{assert.equal(summarize([]).percent,null);assert.equal(summarize([]).ready,false)});
test('waived requirements count toward readiness separately',()=>{const s=summarize([{status:'accepted'},{status:'waived'},{status:'cancelled'}]);assert.equal(s.accepted,1);assert.equal(s.waived,1);assert.equal(s.percent,100);assert.equal(s.ready,true)});
test('correction requires a reason and a review state',()=>{assert.throws(()=>transition({status:'review_required'},'correction_requested',''));assert.throws(()=>transition({status:'missing'},'accepted'));assert.equal(transition({status:'review_required'},'correction_requested','Wrong month').reason,'Wrong month')});
test('file validation rejects executable, oversized and empty files',()=>{assert.ok(validateFile({name:'test.exe',size:42}));assert.ok(validateFile({name:'test.pdf',size:26*1024*1024}));assert.ok(validateFile({name:'test.pdf',size:0}));assert.equal(validateFile({name:'scan.JPG',size:1024}),null)});
test('CSV neutralizes formula cells and escapes quotation marks',()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('A"B'),'"A""B"');assert.equal(csvCell('  @SUM(A1)'),'"\'  @SUM(A1)"')});
