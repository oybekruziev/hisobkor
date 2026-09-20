// One label per status. Every badge, filter, tile, empty state and export reads it from here.
export const statuses={accepted:'Qabul qilingan',review_required:'Tekshirish kerak',missing:'Kutilmoqda',correction_requested:'Tuzatish kerak',waived:'Talab qilinmaydi'};
// One colour per status; the icon is chosen from the same tone in StatusBadge.
export const statusTones={accepted:'success',review_required:'warning',missing:'neutral',correction_requested:'issue',waived:'neutral'};
export function statusTone(status){return statusTones[status]||'neutral';}
// Company state for a period, in the same words as the document statuses.
export const companyStates={ready:'Tayyor',review:'Tekshirish kerak',waiting:'Hujjat kutilmoqda',empty:'Hujjat yo‘q'};
/** What still blocks closing a period, in reading order. Empty array means the period can be closed. */
export function periodBlockers(items){
 const active=items.filter(x=>x.status!=='cancelled');
 if(!active.length)return [{status:'empty',count:0,label:'Bu davrda hujjat yo‘q'}];
 return [['review_required','tekshirilishi kerak'],['correction_requested','tuzatilishi kerak'],['missing','hali yuklanmagan']]
  .map(([status,text])=>({status,count:active.filter(x=>x.status===status).length,text}))
  .filter(x=>x.count>0)
  .map(x=>({...x,label:`${x.count} ta hujjat ${x.text}`}));
}
export function summarize(items){
 const active=items.filter(x=>x.status!=='cancelled');
 const accepted=active.filter(x=>x.status==='accepted').length;
 const waived=active.filter(x=>x.status==='waived').length;
 const review=active.filter(x=>x.status==='review_required').length;
 const missing=active.filter(x=>['missing','correction_requested'].includes(x.status)).length;
 return {total:active.length,accepted,waived,review,missing,percent:active.length?Math.round((accepted+waived)/active.length*100):null,ready:active.length>0&&accepted+waived===active.length};
}
export function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@\-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function companyState(s){return s.ready?companyStates.ready:s.missing?companyStates.waiting:companyStates.review;}
export function validateFile(file){if(!/\.(pdf|png|jpe?g|xlsx|csv)$/i.test(file.name))return 'PDF, JPG, PNG, XLSX yoki CSV fayl tanlang.';if(file.size>25*1024*1024)return 'Fayl hajmi 25 MBdan oshmasligi kerak.';if(!file.size)return 'Bo‘sh faylni yuklab bo‘lmaydi.';return null;}
export function transition(item,status,reason=''){
 if(!['accepted','correction_requested'].includes(status)||item.status!=='review_required')throw Error('Faqat tekshiruvdagi hujjatga qaror berish mumkin.');
 if(status==='correction_requested'&&!reason.trim())throw Error('Tuzatish sababini kiriting.');
 return {...item,status,reason,reviewedAt:new Date().toISOString()};
}
