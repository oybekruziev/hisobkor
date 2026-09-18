export const eligible = d => !d.demo && !!d.fileName && d.status!=='missing';
export const version = d => d.fileKey || d.id;
export const validAnalysis = d => d.ai?.status==='complete' && d.ai.fileKey===version(d) && d.ai.result && typeof d.ai.result.summary==='string' && Array.isArray(d.ai.result.issues) && d.ai.result.issues.every(x=>x&&['title','detail','evidence','action'].every(k=>typeof x[k]==='string')) && Array.isArray(d.ai.result.limitations) && d.ai.result.limitations.every(x=>typeof x==='string');
const norm = s => String(s||'').normalize('NFKC').replace(/^(?:№|no\.?|номер)\s*/i,'').replace(/\s/g,'').toUpperCase();
const tax = s => String(s||'').replace(/\s/g,'');
const parties = r => [tax(r.sellerTaxId),tax(r.buyerTaxId)].filter(Boolean).sort();
export function compareDocument(doc,docs,company){
 if(!validAnalysis(doc))return [];
 const r=doc.ai.result,notes=[];
 const add=(title,detail,relatedId)=>notes.push({title,detail,relatedId});
 if(company?.stir&&parties(r).length===2&&!parties(r).includes(tax(company.stir)))add('Kompaniya STIRi mos kelmadi',`Hujjatda ${parties(r).join(' va ')} ko‘rsatilgan. ${company.name} STIRi: ${company.stir}. Hujjat to‘g‘ri kompaniyaga yuklanganini tekshiring.`);
 if(!company?.stir)add('Kompaniya STIRi kiritilmagan','Rekvizitlarga STIRni kiritsangiz, hujjatning shu kompaniyaga tegishliligi solishtiriladi.');
 if(r.kind!=='invoice')return notes;
 if(!r.contractNumber){add('Shartnoma havolasi aniqlanmadi','Schyot-fakturadagi shartnoma raqamini qo‘lda tekshiring. Avtomatik bog‘lash uchun aniq raqam zarur.');return notes;}
 const candidates=docs.filter(d=>d.company===doc.company&&d.id!==doc.id&&validAnalysis(d)&&d.ai.result.kind==='contract'&&norm(d.ai.result.number)===norm(r.contractNumber));
 if(!candidates.length){add('Shartnoma kerak',`№ ${r.contractNumber} shartnoma shu kompaniyada tekshirilgan fayllar orasida topilmadi. Uni yuklang yoki AI bilan tekshiring.`);return notes;}
 // An exact reference alone is not sufficient when numbers are reused.
 if(candidates.length!==1){add('Bir nechta shartnoma topildi',`№ ${r.contractNumber} bilan ${candidates.length} ta shartnoma bor. Qaysi biri asos ekanini qo‘lda aniqlang.`);return notes;}
 const c=candidates[0],cr=c.ai.result;
 add('Shartnoma bilan solishtirildi',`${c.title} · № ${cr.number}${cr.date?' · '+cr.date:''}. Quyidagi izohlar AI ajratgan rekvizitlar asosida.`,c.id);
 if(r.contractDate&&cr.date&&r.contractDate!==cr.date)add('Shartnoma sanasida farq',`Schyot-faktura havolasi: ${r.contractDate}. Shartnomada: ${cr.date}.`);
 if(!r.contractDate||!cr.date)add('Shartnoma sanasi to‘liq aniqlanmadi','Shartnoma sanasi va schyot-fakturadagi shartnoma havolasini qo‘lda solishtiring.');
 for(const [field,label] of [['sellerTaxId','Sotuvchi'],['buyerTaxId','Xaridor']]){
  if(r[field]&&cr[field]&&tax(r[field])!==tax(cr[field]))add(`${label} STIRida farq`,`Schyot-faktura: ${r[field]}. Shartnoma: ${cr[field]}.`);
  else if(!r[field]||!cr[field])add(`${label} STIRi to‘liq aniqlanmadi`,'Tomonlar rekvizitlarini asl hujjatlarda tekshiring.');
 }
 if(r.currency&&cr.currency&&norm(r.currency)!==norm(cr.currency))add('Valyutada farq',`Schyot-faktura: ${r.currency}. Shartnoma: ${cr.currency}.`);
 else if(r.currency&&cr.currency&&r.total!==null&&cr.total!==null&&Math.abs(r.total-cr.total)>.01)add('Summalar farq qiladi',`Schyot-faktura: ${r.total.toLocaleString('uz-UZ')} ${r.currency}. Shartnoma: ${cr.total.toLocaleString('uz-UZ')} ${cr.currency}. Bu qisman yetkazib berish yoki kelishilgan narx bo‘lishi mumkin. Buyurtma va qo‘shimcha kelishuvni tekshiring.`);
 if(!r.currency||!cr.currency||r.total===null||cr.total===null)add('Summani to‘liq solishtirib bo‘lmadi','Valyuta yoki jami summa aniqlanmagan. Asl hujjatlardagi yakuniy qiymatlarni tekshiring.');
 add('Solishtirish chegarasi','Mahsulotlar, miqdor, QQS va barcha shartnoma bandlari o‘zaro to‘liq solishtirilmagan. Yakuniy qarorni buxgalter beradi.');
 return notes;
}
