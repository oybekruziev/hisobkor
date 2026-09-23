import {summarize} from './domain.mjs';
export function workspaceRoute(route,companies){
 if(route==='companies')return route;
 if(route.startsWith('company/'))return companies.some(c=>c.id===route.split('/')[1])?route:'companies';
 const first=companies.find(c=>!c.isDemo);
 return first?`company/${first.id}/overview`:'companies';
}
/**
 * Route for the workspace app: `#dashboard` is the home screen for every company,
 * `#company/<id>/<tab>` is one company. Anything else falls back to home.
 */
export function appRoute(route,companies){

 if(/^msfo(\/[A-Za-z0-9._-]{1,128})?$/.test(String(route||'')))return String(route);
 if(String(route||'').startsWith('company/'))return companies.some(c=>c.id===String(route).split('/')[1])?String(route):'dashboard';
 return 'dashboard';
}
export function companyOverview(docs,companyId,period){
 const items=docs.filter(d=>d.company===companyId&&!d.demo&&(d.scope==='permanent'||d.period===period));
 const stats=summarize(items);
 const uploaded=items.filter(d=>!['missing','cancelled'].includes(d.status));
 return {stats,uploaded,recent:[...uploaded].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5)};
}
/**
 * The one sentence a company page opens with: what this period needs, how far it is,
 * and the single next action. Pure — the UI only renders it.
 */
export function periodSummary(docs,company,period,closed=[]){
 const items=docs.filter(d=>d.company===company.id&&!d.demo&&d.scope!=='permanent'&&d.period===period&&d.status!=='cancelled');
 const stats=summarize(items);
 const done=stats.accepted+stats.waived;
 const progress={done,total:items.length,percent:items.length?Math.round(done/items.length*100):0};
 const review=items.filter(d=>d.status==='review_required').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
 const waiting=items.filter(d=>['missing','correction_requested'].includes(d.status));
 if(closed.includes(`${company.id}:${period}`))
  return {state:'closed',tone:'success',title:'Davr yopilgan',text:'Yangi hujjat qo‘shilsa, davr o‘zi qayta ochiladi.',progress,action:{kind:'documents',label:'Hujjatlarni ko‘rish'}};
 if(!items.length)
  return {state:'empty',tone:'neutral',title:'Bu davrda hali hujjat yo‘q',text:'Birinchi faylni yuklang.',progress,action:{kind:'upload',label:'Hujjat yuklash'}};
 if(review.length)
  return {state:'review',tone:'warning',title:`${review.length} ta hujjat qaroringizni kutmoqda`,text:'Hujjatni oching, AI topgan xato va ziddiyatlarni ko‘ring va qabul qiling.',progress,
   action:{kind:'review',label:'Tekshirishni boshlash',documentId:review[0].id}};
 if(waiting.length)
  return {state:'waiting',tone:'neutral',title:`${waiting.length} ta hujjat kutilmoqda`,text:'Fayl yuklanmaguncha davrni yopib bo‘lmaydi.',progress,action:{kind:'upload',label:'Hujjat yuklash'}};
 return {state:'ready',tone:'success',title:'Davr yopishga tayyor',text:'Barcha talablar qabul qilingan. Hujjatlar bo‘limida davrni yopishingiz mumkin.',progress,action:{kind:'documents',label:'Davrni yopish'}};
}
