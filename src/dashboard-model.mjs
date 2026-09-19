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
export function comparisonPair(row,documentId){
 const primary=row.analyzed.find(d=>d.id===documentId)||row.analyzed.find(d=>d.ai.result.kind==='invoice')||row.analyzed[0];
 const linked=primary?compareDocument(primary,row.all,row.company).find(n=>n.relatedId):null;
 const contract=linked?row.all.find(d=>d.id===linked.relatedId):null;
 return {primary,contract,dateMismatch:!!(contract&&primary.ai.result.contractDate&&contract.ai.result.date&&primary.ai.result.contractDate!==contract.ai.result.date)};
}
