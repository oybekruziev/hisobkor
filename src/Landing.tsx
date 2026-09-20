import React from 'react';
import {Brand} from './components/Brand';
import {MobileMenu} from './components/landing/MobileMenu';
import {WorkspacePreview} from './components/landing/WorkspacePreview';
import {useReveal,useWordReveal} from './components/landing/motion';
import {ArrowRight,CaretDown,FileText,CloudArrowUp,SealCheck,Check} from './components/landing/icons';

const app='https://app.hisobkor.uz';
const register=`${app}/#register`;
const links=[['#nega','Nega kerak'],['#imkoniyatlar','Imkoniyatlar'],['#tartib','Qanday ishlaydi'],['#savollar','Savol-javob']] as const;

function StartCta({className='',children='Hisob yaratish'}:{className?:string;children?:React.ReactNode}){
  return <a className={`cta ${className}`} href={register}>{children}<ArrowRight size={18} weight="bold"/></a>;
}

const facts=[
  [FileText,'PDF, JPG, PNG, XLSX, CSV'],
  [CloudArrowUp,'Har bir fayl 25 MBgacha'],
  [SealCheck,'Qarorni har doim buxgalter beradi'],
] as const;

function Tagline(){
  const ref=React.useRef<HTMLParagraphElement>(null);
  useWordReveal(ref);
  const lines=['Hujjatni qidirishga emas,','tekshirishga vaqt ajrating.'];
  let index=0;
  return <section className="tagline-section" aria-label="Hisobkorning vazifasi">
    <div className="wrap">
      <p className="tagline" ref={ref}>
        {lines.map(line=><span className="tagline-line" key={line}>
          {line.split(' ').map(word=><span className="tagline-word" key={`${word}-${index++}`}>{word} </span>)}
        </span>)}
      </p>
    </div>
  </section>;
}

const pains=[
  'Fayllar Telegram, pochta va qog‘ozda tarqoq turadi.',
  'Qaysi hujjat kelgani va qaysi biri hali tekshirilmagani ko‘rinmaydi.',
  'Qaysi hujjatni kim va qachon qabul qilgani esdan chiqadi.',
];

const gains=[
  'Har bir kompaniyaning hujjatlari o‘z joyida: oylik va doimiy hujjatlar alohida.',
  'Ro‘yxatda holat ko‘rinib turadi: tekshirish kerak yoki qabul qilingan.',
  'Har bir qaror saqlanadi: kim, qachon va nima qilgani.',
];

const benefits=[
  ['Bitta hisob, bir nechta kompaniya','Kompaniyani tanlaysiz va uning hujjatlari, rekvizitlari hamda amallar tarixini darhol ko‘rasiz.'],
  ['Tekshiruvda yordamchi izoh','AI hujjatni o‘qib izoh qoldiradi. Qabul qilish yoki sabab yozib qaytarish sizning qaroringiz bo‘lib qoladi.'],
  ['Davrni ishonch bilan yopasiz','Oylik hujjatlar va ustav, guvohnoma, shartnomalar alohida turadi. Barcha talablar bajarilganda davrni yopasiz.'],
  ['Fayllar yopiq saqlanadi','Hujjatlar faqat sizning hisobingiz orqali ochiladi. Avtomatik tekshiruv vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.'],
  ['Telefonda ham, kompyuterda ham','Telefon, planshet va kompyuterda bir xil ishlaydi. Kompaniyalar va fayllar zaxirasini ilovadan yuklab olasiz.'],
] as const;

const steps=[
  ['Profilingizni to‘ldiring','Login va parol bilan hisob yarating, so‘ng buxgalter ma’lumotlaringizni kiriting.'],
  ['Kompaniya qo‘shing','Faqat tashkilot nomi kerak. Rekvizitlarni keyinroq to‘ldirasiz.'],
  ['Hujjatlar bilan ishlang','Fayllarni yuklang, izohlarni ko‘ring va qaroringizni belgilang.'],
] as const;

export const questions=[
  ['Ishni qanday boshlayman?','Login va parol bilan hisob yaratasiz. Parol kamida 12 belgidan iborat bo‘lishi kerak, elektron pochtani tasdiqlash bosqichi yo‘q. So‘ng profilingizni to‘ldirasiz va birinchi kompaniyangizni qo‘shasiz.'],
  ['Bir nechta kompaniya bilan ishlasam bo‘ladimi?','Ha. Bitta hisobga bir nechta kompaniya qo‘shasiz. Har birining hujjatlari, rekvizitlari va amallar tarixi alohida saqlanadi.'],
  ['Qaysi fayllarni yuklash mumkin?','PDF, JPG, PNG, XLSX va CSV fayllari. Har bir fayl 25 MBgacha bo‘lishi mumkin.'],
  ['AI hujjatni o‘zi qabul qiladimi?','Yo‘q. AI hujjatni o‘qiydi va yordamchi izoh qoldiradi. Qarorni buxgalter beradi: hujjatni qabul qiladi yoki sabab yozib qaytaradi.'],
  ['Hujjatlarim maxfiyligi qanday?','Fayllar yopiq saqlanadi va faqat sizning hisobingiz orqali ochiladi. Avtomatik tekshiruv vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.'],
  ['Oylik va doimiy hujjatlar qanday ajratiladi?','Oylik, ya’ni davr hujjatlari va doimiy hujjatlar (ustav, guvohnoma, shartnomalar) alohida saqlanadi. Davrni barcha talablar bajarilganda yopasiz.'],
  ['Qaror tarixini keyin ko‘ra olamanmi?','Ha. Har bir qaror saqlanadi: kim, qachon va nima qilgani kompaniyaning amallar tarixida turadi.'],
  ['Ma’lumotlarimni yuklab olsam bo‘ladimi?','Ha. Kompaniyalar va fayllar zaxirasini ilovaning ichidan yuklab olasiz.'],
  ['Telefonda ishlaydimi?','Ha. Hisobkor telefon, planshet va kompyuterda ishlaydi.'],
] as [string,string][];

export function Landing(){
  useReveal();
  return <>
    <a className="skip" href="#main">Asosiy qismga o‘tish</a>

    <header className="site-header">
      <div className="header-bar">
        <Brand href="/"/>
        <nav className="desktop-nav" aria-label="Asosiy navigatsiya">
          {links.map(([href,label])=><a href={href} key={href}>{label}</a>)}
        </nav>
        <a className="header-login" href={app}>Kirish</a>
        <StartCta className="cta-sm header-cta"/>
        <MobileMenu links={links} app={app}/>
      </div>
    </header>

    <main id="main">
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>
              <span>Mijoz hujjatlari bitta joyda.</span>
              <span>Qarorni siz berasiz.</span>
            </h1>
            <p className="hero-sub">Hisobkor buxgalterlar uchun ish joyi. Har bir kompaniyaning hujjatlari, tekshiruv izohlari va qaror tarixi bir tartibda turadi.</p>
            <div className="hero-actions">
              <StartCta className="cta-lg"/>
              <p className="hero-risk">Login va parol kifoya. Kompaniya qo‘shish uchun faqat nom kerak.</p>
            </div>
          </div>
          <ul className="facts">
            {facts.map(([Glyph,text])=><li key={text}><Glyph size={18} aria-hidden="true"/>{text}</li>)}
          </ul>
          <WorkspacePreview/>
        </div>
      </section>

      <Tagline/>

      <section className="section" id="nega">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <p className="eyebrow">Nega kerak</p>
            <h2>Hujjatlar tarqoq kelsa, nazorat sizdan chiqib ketadi.</h2>
          </div>
          <div className="compare" data-reveal>
            <div className="compare-card">
              <h3>Odatdagi kun</h3>
              <ul className="pain-list">
                {pains.map(text=><li key={text}>{text}</li>)}
              </ul>
            </div>
            <div className="compare-card compare-card-good">
              <h3>Hisobkor bilan</h3>
              <ul className="gain-list">
                {gains.map(text=><li key={text}><Check size={18} weight="bold" aria-hidden="true"/><span>{text}</span></li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="imkoniyatlar">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <p className="eyebrow">Imkoniyatlar</p>
            <h2>Kundalik ishda nimaga tayanasiz.</h2>
          </div>
          <dl className="benefits">
            {benefits.map(([title,text])=><div className="benefit" key={title} data-reveal>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>)}
          </dl>
        </div>
      </section>

      <section className="section" id="tartib">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <p className="eyebrow">Qanday ishlaydi</p>
            <h2>Uch qadamda ishga tayyor.</h2>
          </div>
          <ol className="steps">
            {steps.map(([title,text],i)=><li key={title} data-reveal>
              <span className="step-num" aria-hidden="true">{i+1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>)}
          </ol>
        </div>
      </section>

      <section className="section" id="savollar">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <p className="eyebrow">Savol-javob</p>
            <h2>Ish boshlashdan oldin.</h2>
          </div>
          <div className="faq" data-reveal>
            {questions.map(([question,answer])=><details key={question} name="faq">
              <summary><span>{question}</span><CaretDown size={18} aria-hidden="true"/></summary>
              <div className="faq-answer"><p>{answer}</p></div>
            </details>)}
          </div>
        </div>
      </section>

      <section className="section final-section">
        <div className="wrap">
          <div className="final" data-reveal>
            <h2>Keyingi ish kuningizni tartib bilan boshlang.</h2>
            <p>Hisob yarating, birinchi kompaniyangizni qo‘shing va hujjatlarni bir joyda yuriting.</p>
            <StartCta className="cta-lg"/>
          </div>
        </div>
      </section>
    </main>

    <footer className="site-footer" id="site-footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Brand href="/"/>
          <p>Buxgalteriya, tartib bilan.</p>
        </div>
        <a className="footer-link" href={app}>Platformaga kirish<ArrowRight size={16} weight="bold"/></a>
      </div>
    </footer>
  </>;
}
