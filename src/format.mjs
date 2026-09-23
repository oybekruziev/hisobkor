const months=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
export function formatPeriod(value){const match=/^(\d{4})-(\d{2})$/.exec(value||'');if(!match)return value||'';return months[Number(match[2])-1]?`${months[Number(match[2])-1]} ${match[1]}`:value;}
export function currentPeriod(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function documentName(doc){return doc.title===doc.fileName?doc.title.replace(/\.(pdf|png|jpe?g|xlsx|csv)$/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim():doc.title;}
export function formatDate(value){if(!value)return '';const s=String(value);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return `${s.slice(8,10)}.${s.slice(5,7)}.${s.slice(0,4)}`;const d=new Date(s);if(Number.isNaN(d.getTime()))return s;return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;}
export function shiftPeriod(value,delta){const match=/^(\d{4})-(\d{2})$/.exec(value||'');if(!match)return value||'';const d=new Date(Number(match[1]),Number(match[2])-1+Number(delta||0),1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
export function periodMonths(){return months.map((name,i)=>[String(i+1).padStart(2,'0'),name]);}
export function companyTitle(company){const name=String(company?.name||'').trim();const legal=String(company?.legal||'').trim();if(!legal||legal==='Boshqa')return name;const words=name.toLowerCase().split(/[\s"“”«»()]+/);return words.includes(legal.toLowerCase())?name:`${name} ${legal}`;}
/** Up to two initials for an avatar or a company tile. */
export function initialsOf(name){const parts=String(name||'').replace(/["“”«»]/g,' ').split(/\s+/).filter(Boolean);if(!parts.length)return '—';return parts.slice(0,2).map(w=>w[0]).join('').toUpperCase();}
/** Time-of-day greeting in Uzbek: tong 05–11, kun 11–18, kech otherwise. */
export function greeting(date=new Date()){const h=date.getHours();return h<5?'Xayrli tun':h<11?'Xayrli tong':h<18?'Xayrli kun':'Xayrli kech';}
/** Short file-kind label for the list chips. */
export function fileKind(fileName){const ext=String(fileName||'').split('.').pop().toLowerCase();if(ext==='pdf')return 'PDF';if(ext==='xlsx'||ext==='xls')return 'XLS';if(ext==='csv')return 'CSV';if(['png','jpg','jpeg','webp','heic'].includes(ext))return 'IMG';return 'FAYL';}
