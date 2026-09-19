import React from 'react';
import {Button} from './components/ui/button';
import {Badge} from './components/ui/badge';
import {Sheet,SheetClose,SheetContent,SheetHeader,SheetTitle,SheetTrigger} from './components/ui/sheet';
import {Brand} from './components/Brand';
import {Icon} from './Icon';

const app='https://app.hisobkor.uz';
const links=[['#imkoniyatlar','Imkoniyatlar'],['#tartib','Qanday ishlaydi'],['#savollar','Savol-javob']] as const;

function StartButton({children='Hisob yaratish',className,primary=false}:{children?:React.ReactNode;className?:string;primary?:boolean}){
  return <Button asChild variant={primary?'default':'outline'} className={`site-cta ${className||''}`}>
    <a href={`${app}/#register`}>{children}<Icon name="arrow"/></a>
  </Button>;
}

function MobileNav(){
  return <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon" className="mobile-menu" aria-label="Menyuni ochish"><Icon name="menu" size={20}/></Button>
    </SheetTrigger>
    <SheetContent side="right" className="mobile-sheet">
      <SheetHeader><SheetTitle><Brand href="/"/></SheetTitle></SheetHeader>
      <nav aria-label="Mobil navigatsiya">
        {links.map(([href,label])=><SheetClose asChild key={href}><a href={href}>{label}<Icon name="arrow" size={16}/></a></SheetClose>)}
      </nav>
      <div className="mobile-sheet-actions">
        <Button asChild variant="outline"><a href={app}>Kirish</a></Button>
        <StartButton primary/>
      </div>
    </SheetContent>
  </Sheet>;
}

const previewDocs=[
  ['Schyot-faktura № 024','Izohlar tayyor','Tekshirish kerak','review'],
  ['Xizmat ko‘rsatish shartnomasi','Tekshirildi','Qabul qilingan','accepted'],
  ['Bank ko‘chirmasi','Tekshirildi','Qabul qilingan','accepted'],
] as const;

const previewStats=[['Jami hujjatlar','3'],['Tekshirish kerak','1'],['Qabul qilingan','2']] as const;

function WorkspacePreview(){
  return <figure className="product-preview">
    <figcaption><span>Platforma ko‘rinishi</span><Badge variant="outline">Namuna ma’lumotlar</Badge></figcaption>
    <div className="workspace-preview" role="img" aria-label="Hisobkor ish joyi namunasi: Atlas Savdo kompaniyasining uchta hujjati, biri tekshirishni kutmoqda.">
      <div className="preview-head">
        <div>
          <strong>Hujjatlar</strong>
          <span>Atlas Savdo · Oylik hujjatlar</span>
        </div>
      </div>
      <dl className="preview-stats">
        {previewStats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <ul className="preview-rows">
        {previewDocs.map(([name,review,status,tone])=><li key={name}>
          <span className="preview-row-name">{name}</span>
          <span className="preview-row-meta">PDF hujjat · {review}</span>
          <span className="preview-chip" data-tone={tone}>{status}</span>
        </li>)}
      </ul>
      <p className="preview-note">Har bir hujjat yonida yordamchi xulosa: rekvizitlarni solishtiring, izohlarni ko‘ring va qaror bering.</p>
    </div>
  </figure>;
}

const capabilities=[
  ['Har bir kompaniya o‘z joyida','Kompaniyani tanlang va uning hujjatlari, rekvizitlari hamda amallar tarixini darhol ko‘ring.'],
  ['Tekshiruvga yordamchi','Rekvizitlarni ajrating, hujjatlarni solishtiring va AI izohlarini bir oynada ko‘ring.'],
  ['Qarorlar saqlanadi','Kim, qachon va qanday qaror berganini tarixdan toping.'],
] as const;

const steps=[
  ['Profilingizni to‘ldiring','Hisob yarating va buxgalter ma’lumotlaringizni kiriting.'],
  ['Kompaniya qo‘shing','Tashkilot nomini kiriting — qolgan ma’lumotlarni keyin to‘ldirasiz.'],
  ['Hujjatlar bilan ishlang','Fayllarni yuklang, izohlarni ko‘ring va qaroringizni belgilang.'],
] as const;

export const questions=[['Bir nechta kompaniya bilan ishlasam bo‘ladimi?','Ha. Bitta hisobga bir nechta kompaniya qo‘shasiz. Har birining hujjatlari, rekvizitlari va amallar tarixi alohida saqlanadi.'],['Ishni qanday boshlayman?','Login va parol bilan hisob yarating, buxgalter profilingizni to‘ldiring va birinchi kompaniyangizni qo‘shing.'],['Qaysi fayllarni yuklash mumkin?','PDF, JPG, PNG, XLSX va CSV fayllari. Har bir fayl 25 MBgacha bo‘lishi mumkin.'],['AI hujjatni o‘zi qabul qiladimi?','Yo‘q. AI hujjatni o‘qiydi va yordamchi izoh beradi. Qarorni buxgalter qabul qiladi.'],['Hujjatlarim hammaga ochiq bo‘ladimi?','Yo‘q. Fayllar yopiq saqlanadi va hisobingiz orqali ochiladi. Avtomatik tekshiruv vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.']];

export function Landing(){
  return <>
    <a className="site-skip" href="#main">Asosiy qismga o‘tish</a>

    <header className="site-header">
      <div className="header-inner site-wrap">
        <Brand href="/"/>
        <nav className="desktop-nav" aria-label="Asosiy navigatsiya">
          {links.map(([href,label])=><a href={href} key={href}>{label}</a>)}
        </nav>
        <div className="header-actions">
          <Button asChild variant="ghost" className="header-login"><a href={app}>Kirish</a></Button>
          <StartButton primary className="header-cta"/>
          <MobileNav/>
        </div>
      </div>
    </header>

    <main id="main" className="isolate antialiased">
      <section className="hero">
        <div className="site-wrap hero-inner">
          <div className="hero-copy">
            <Badge variant="outline" className="hero-eyebrow">Buxgalterning ish joyi</Badge>
            <h1>Hujjatlarni <em>nazorat</em> qilish uchun bitta joy.</h1>
            <p>Kompaniyalar, hujjatlar va tekshiruvlar — bitta tartibli ish joyida. Qidirishga kamroq, hisobga ko‘proq vaqt ajrating.</p>
            <div className="hero-actions">
              <StartButton primary>Ishni boshlash</StartButton>
              <Button asChild variant="outline" className="site-cta"><a href="#tartib">Qanday ishlaydi</a></Button>
            </div>
            <small>Avval profilingiz, keyin kompaniyangiz, so‘ng hujjatlar.</small>
          </div>
          <WorkspacePreview/>
        </div>
      </section>

      <section className="site-section" id="imkoniyatlar">
        <div className="site-wrap section-grid">
          <div className="section-intro">
            <span>Imkoniyatlar</span>
            <h2>Kundalik ishda kerak bo‘ladigani.</h2>
          </div>
          <dl className="capability-list">
            {capabilities.map(([title,text])=><div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="site-section" id="tartib">
        <div className="site-wrap">
          <div className="section-intro section-intro-wide">
            <span>Qanday ishlaydi</span>
            <h2>Uch qadamda ishga tayyor.</h2>
          </div>
          <ol className="steps">
            {steps.map(([title,text],i)=><li key={title}>
              <span className="step-num" aria-hidden="true">{i+1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>)}
          </ol>
        </div>
      </section>

      <section className="site-section" id="savollar">
        <div className="site-wrap section-grid">
          <div className="section-intro">
            <span>Savol-javob</span>
            <h2>Ish boshlashdan oldin.</h2>
            <p>Hisobkor haqida qisqa javoblar.</p>
          </div>
          <div className="faq-list">
            {questions.map(([question,answer])=><details key={question} name="faq">
              <summary><span>{question}</span><Icon name="down" size={18}/></summary>
              <div className="faq-answer"><p>{answer}</p></div>
            </details>)}
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="site-wrap">
          <div className="final-cta">
            <div>
              <span>Ishni boshlash</span>
              <h2>Keyingi ish kuningizni tartib bilan boshlang.</h2>
            </div>
            <StartButton primary>Hisob yaratish</StartButton>
          </div>
        </div>
      </section>
    </main>

    <footer className="site-footer">
      <div className="site-wrap footer-inner">
        <div className="footer-brand">
          <Brand href="/"/>
          <p>Buxgalteriya, tartib bilan.</p>
        </div>
        <Button asChild variant="ghost" className="footer-link"><a href={app}>Platformaga kirish<Icon name="arrow"/></a></Button>
      </div>
    </footer>
  </>;
}
