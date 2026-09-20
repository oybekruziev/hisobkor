import React from 'react';

const docs=[
  ['Schyot-faktura № 024','Izohlar tayyor','Tekshirish kerak','review'],
  ['Xizmat ko‘rsatish shartnomasi','Siz qabul qildingiz','Qabul qilingan','accepted'],
  ['Bank ko‘chirmasi','Siz qabul qildingiz','Qabul qilingan','accepted'],
] as const;

const stats=[['Jami','3'],['Tekshirish kerak','1'],['Qabul qilingan','2']] as const;

export function WorkspacePreview(){
  return <figure className="preview">
    <div className="preview-card" role="img"
      aria-label="Hisobkor ish joyi namunasi: Atlas Savdo kompaniyasining uchta oylik hujjati, biri tekshirishni kutmoqda, ikkitasi qabul qilingan.">
      <div className="preview-top">
        <p className="preview-company">Atlas Savdo</p>
        <p className="preview-scope">Oylik hujjatlar · sentabr</p>
      </div>
      <dl className="preview-stats">
        {stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <ul className="preview-rows">
        {docs.map(([name,note,status,tone])=><li key={name}>
          <span className="preview-name">{name}</span>
          <span className="preview-note">PDF · {note}</span>
          <span className="preview-chip" data-tone={tone}>{status}</span>
        </li>)}
      </ul>
    </div>
    <figcaption>Platforma ko‘rinishi, namuna ma’lumotlar bilan.</figcaption>
  </figure>;
}
