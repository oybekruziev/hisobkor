export const statuses={accepted:'Qabul qilingan',review_required:'Tekshiruvda',missing:'Kutilmoqda',correction_requested:'Tuzatish kerak',waived:'Talab qilinmaydi'};
export function summarize(items){
 const active=items.filter(x=>x.status!=='cancelled');
 const accepted=active.filter(x=>x.status==='accepted').length;
 const waived=active.filter(x=>x.status==='waived').length;
 const review=active.filter(x=>x.status==='review_required').length;
 const missing=active.filter(x=>['missing','correction_requested'].includes(x.status)).length;
 return {total:active.length,accepted,waived,review,missing,percent:active.length?Math.round((accepted+waived)/active.length*100):null,ready:active.length>0&&accepted+waived===active.length};
}
export function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@\-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function companyState(s){return s.ready?'Tayyor':s.missing?'Hujjat kutilmoqda':'Tekshiruvda';}
export function validateFile(file){if(!/\.(pdf|png|jpe?g|xlsx|csv)$/i.test(file.name))return 'PDF, JPG, PNG, XLSX yoki CSV fayl tanlang.';if(file.size>25*1024*1024)return 'Fayl hajmi 25 MBdan oshmasligi kerak.';if(!file.size)return 'Bo‘sh faylni yuklab bo‘lmaydi.';return null;}
export function transition(item,status,reason=''){
 if(!['accepted','correction_requested'].includes(status)||item.status!=='review_required')throw Error('Faqat tekshiruvdagi hujjatga qaror berish mumkin.');
 if(status==='correction_requested'&&!reason.trim())throw Error('Tuzatish sababini kiriting.');
 return {...item,status,reason,reviewedAt:new Date().toISOString()};
}
