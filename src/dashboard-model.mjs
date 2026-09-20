import {validAnalysis,compareDocument} from './ai-domain.mjs';
import {summarize} from './domain.mjs';

const informational=new Set(['Shartnoma bilan solishtirildi','Solishtirish chegarasi']);
export function dashboardRows(companies,docs,period){
 return companies.map(company=>{
  const all=docs.filter(d=>d.company===company.id&&!d.demo&&d.status!=='cancelled');
  const relevant=all.filter(d=>d.scope==='permanent'||d.period===period);
  const required=relevant.filter(d=>d.status!=='waived');
  const uploaded=required.filter(d=>d.fileName&&d.status!=='missing');
  const analyzed=uploaded.filter(validAnalysis);
  const notes=analyzed.flatMap(doc=>[
   ...doc.ai.result.issues.map(issue=>({...issue,documentId:doc.id})),
   ...compareDocument(doc,all,company).filter(n=>!informational.has(n.title)).map(n=>({...n,documentId:doc.id})),
  ]);
  const stats=summarize(relevant);
  const state=!required.length?'empty':stats.missing?'waiting':stats.ready?'ready':'review';
  return {company,all,relevant,uploaded,analyzed,notes,stats,state,total:required.length,
   received:required.length?Math.round(uploaded.length/required.length*100):null};
 });
}
/** Documents waiting for the accountant's decision, across every company, newest first. */
export function waitingForReview(companies,docs,period){
 const byId=new Map(companies.map(c=>[c.id,c]));
 return docs
  .filter(d=>d.status==='review_required'&&!d.demo&&byId.has(d.company)&&(d.scope==='permanent'||d.period===period))
  .map(d=>({doc:d,company:byId.get(d.company)}))
  .sort((a,b)=>String(b.doc.date||'').localeCompare(String(a.doc.date||''))||String(a.doc.title||'').localeCompare(String(b.doc.title||'')));
}
/** Plain-language headline for the home screen: what is waiting, and for how many companies. */
export function workspaceHeadline(waiting){
 if(!waiting.length)return {tone:'calm',title:'Hammasi joyida',text:'Hozircha tekshiruvingizni kutayotgan hujjat yo‘q.'};
 const companies=new Set(waiting.map(x=>x.company.id)).size;
 return {tone:'attention',title:`${waiting.length} ta hujjat tekshiruvingizni kutmoqda`,
  text:companies===1?`${waiting[0].company.name} bo‘yicha. Hujjatni oching va qaror bering.`:`${companies} ta kompaniya bo‘yicha. Hujjatni oching va qaror bering.`};
}
export function comparisonPair(row,documentId){
 const primary=row.analyzed.find(d=>d.id===documentId)||row.analyzed.find(d=>d.ai.result.kind==='invoice')||row.analyzed[0];
 const linked=primary?compareDocument(primary,row.all,row.company).find(n=>n.relatedId):null;
 const contract=linked?row.all.find(d=>d.id===linked.relatedId):null;
 return {primary,contract,dateMismatch:!!(contract&&primary.ai.result.contractDate&&contract.ai.result.date&&primary.ai.result.contractDate!==contract.ai.result.date)};
}
