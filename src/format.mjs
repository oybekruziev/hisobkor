const months=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
export function formatPeriod(value){const match=/^(\d{4})-(\d{2})$/.exec(value||'');if(!match)return value||'';return months[Number(match[2])-1]?`${months[Number(match[2])-1]} ${match[1]}`:value;}
export function currentPeriod(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function documentName(doc){return doc.title===doc.fileName?doc.title.replace(/\.(pdf|png|jpe?g|xlsx|csv)$/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim():doc.title;}
