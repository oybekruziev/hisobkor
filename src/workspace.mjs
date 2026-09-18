const sampleIds=new Set(['atlas','baraka','navroz','bekway','orient','green']);
export function migrateWorkspace(saved){
 const docs=saved?.docs||[];
 const companies=(saved?.companies||[]).map(c=>({...c,isDemo:c.isDemo??(sampleIds.has(c.id)&&!docs.some(d=>d.company===c.id&&!d.demo))}));
 const activity=(saved?.activity||[]).map(a=>({...a,companyId:a.companyId||companies.find(c=>a.detail===c.name||a.detail?.startsWith(c.name+' ·'))?.id}));
 return {...saved,companies,docs,activity,closed:saved?.closed||[],profile:saved?.profile||null};
}
export function companyHistory(activity,company){return activity.filter(a=>a.companyId?a.companyId===company.id:a.detail===company.name||a.detail?.startsWith(company.name+' ·'));}
export function profileError(profile){if(!profile.fullName?.trim())return 'Ism va familiyangizni kiriting.';if(!/^\+?[\d\s()-]{7,20}$/.test(profile.phone?.trim()||''))return 'Telefon raqamingizni to‘g‘ri kiriting.';return null;}
export function companyRequirements(docs,id,period){return docs.filter(d=>d.company===id&&d.scope!=='permanent'&&d.period===period);}
