import test from 'node:test';
import assert from 'node:assert/strict';
import {companyOverview,workspaceRoute} from '../src/company-overview.mjs';
test('overview isolates company, period and demo documents',()=>{
 const docs=[
  {id:'own',company:'a',period:'2026-09',status:'accepted',date:'2026-09-20'},
  {id:'other',company:'b',period:'2026-09',status:'accepted'},
  {id:'old',company:'a',period:'2026-08',status:'accepted'},
  {id:'permanent',company:'a',period:'2026-08',scope:'permanent',status:'review_required'},
  {id:'demo',company:'a',period:'2026-09',status:'accepted',demo:true},
  {id:'missing',company:'a',period:'2026-09',status:'missing'},
 ];
 const result=companyOverview(docs,'a','2026-09');
 assert.deepEqual(result.uploaded.map(d=>d.id),['own','permanent']);
 assert.equal(result.stats.accepted,1);assert.equal(result.stats.review,1);assert.equal(result.stats.missing,1);
 assert.deepEqual(result.recent.map(d=>d.id),['own','permanent']);
});
test('legacy entry points open a real company and explicit company routes survive',()=>{
 const companies=[{id:'demo',isDemo:true},{id:'a'},{id:'b'}];
 assert.equal(workspaceRoute('dashboard',companies),'company/a/overview');
 assert.equal(workspaceRoute('company/b/history',companies),'company/b/history');
 assert.equal(workspaceRoute('company/deleted/documents',companies),'companies');
 assert.equal(workspaceRoute('companies',companies),'companies');
 assert.equal(workspaceRoute('',[]),'companies');
});
