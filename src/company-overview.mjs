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
 if(String(route||'').startsWith('company/'))return companies.some(c=>c.id===String(route).split('/')[1])?String(route):'dashboard';
 return 'dashboard';
}
export function companyOverview(docs,companyId,period){
 const items=docs.filter(d=>d.company===companyId&&!d.demo&&(d.scope==='permanent'||d.period===period));
 const stats=summarize(items);
 const uploaded=items.filter(d=>!['missing','cancelled'].includes(d.status));
 return {stats,uploaded,recent:[...uploaded].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5)};
}
