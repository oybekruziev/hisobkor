import React from 'react';
import {MobileMenu} from './components/landing/MobileMenu';
import {useReveal} from './components/landing/motion';
import {ArrowRight,CaretDown,FileText,CloudArrowUp,SealCheck,Check,X,Buildings,Sparkle,LockKey,DeviceMobile,CalendarCheck,Files,MicrosoftWordLogo,Table,MagicWand,FileArrowDown} from './components/landing/icons';

const app='https://app.hisobkor.uz';
const register=`${app}/#register`;
const links=[['#nega','Nega kerak'],['#imkoniyatlar','Imkoniyatlar'],['#msfo','MSFO'],['#tartib','Qanday ishlaydi'],['#savollar','Savol-javob']] as const;

/* One container, one primary button and one link-style secondary for the whole page. */
const container='mx-auto max-w-6xl px-6 lg:px-8';
const primary='inline-flex items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondary='inline-flex items-center gap-1.5 py-2.5 text-base font-semibold sm:text-sm';

function Logo(){
  return <a href="/" aria-label="Hisobkor.uz bosh sahifasi" className="flex shrink-0 items-center gap-2">
    <img src="/brand-h.png" width="28" height="28" alt="" className="h-7 w-auto"/>
    <span className="text-lg font-semibold tracking-tight text-zinc-950">hisobkor<span className="font-normal text-zinc-500">.uz</span></span>
  </a>;
}

function StartCta({size='lg',children='Hisob yaratish'}:{size?:'sm'|'lg';children?:React.ReactNode}){
  return <a href={register} className={`${primary} ${size==='lg'?'py-3 pr-3 pl-4 text-base sm:py-2.5 sm:pr-2.5 sm:pl-3.5 sm:text-sm':'py-1.5 pr-2 pl-3 text-sm'}`}>
    {children}<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/>
  </a>;
}

/** Real product screenshot in a concentric frame; on phones it shows the left part at a readable size. */
function Screenshot({src,alt,eager=false}:{src:string;alt:string;eager?:boolean}){
  return <div className="overflow-hidden rounded-(--frame-radius) bg-zinc-950/5 p-(--frame-padding) ring-1 ring-zinc-950/5 [--frame-padding:--spacing(2)] [--frame-radius:min(2.4vw,var(--radius-3xl))]">
    <div className="overflow-hidden rounded-[calc(var(--frame-radius)-var(--frame-padding))] bg-white shadow-xl shadow-zinc-950/10">
      <img src={src} alt={alt} width="1632" height="1032" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async"
        className="w-full max-w-none rounded-[calc(var(--frame-radius)-var(--frame-padding))] outline-1 -outline-offset-1 outline-black/10 max-sm:w-176"/>
    </div>
  </div>;
}

function HeadingGroup({eyebrow,title,text}:{eyebrow:string;title:string;text?:string}){
  return <div data-reveal>
    <p className="text-base font-semibold text-primary sm:text-sm">{eyebrow}</p>
    <h2 className="mt-3 max-w-[35ch] text-3xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-4xl">{title}</h2>
    {text&&<p className="mt-5 max-w-[48ch] text-lg text-pretty text-zinc-600">{text}</p>}
  </div>;
}

const facts=[
  [FileText,'PDF, JPG, PNG, XLSX, CSV'],
  [CloudArrowUp,'Har bir fayl 25 MBgacha'],
  [SealCheck,'Qarorni har doim buxgalter beradi'],
] as const;

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
  [Buildings,'Bitta hisob, bir nechta kompaniya','Kompaniyani tanlaysiz va uning hujjatlari, rekvizitlari hamda amallar tarixini darhol ko‘rasiz.'],
  [Sparkle,'Tekshiruvda yordamchi izoh','AI hujjatni o‘qib, xato va ziddiyatlarni o‘zi topadi. Qabul qilish qarori sizda qoladi.'],
  [CalendarCheck,'Davrni ishonch bilan yopasiz','Oylik hujjatlar va ustav, guvohnoma, shartnomalar alohida turadi. Barcha talablar bajarilganda davrni yopasiz.'],
  [LockKey,'Fayllar yopiq saqlanadi','Hujjatlar faqat sizning hisobingiz orqali ochiladi. Avtomatik tekshiruv va MSFOga o‘tkazish vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.'],
  [DeviceMobile,'Telefonda ham, kompyuterda ham','Telefon, planshet va kompyuterda bir xil ishlaydi. Kompaniyalar va fayllar zaxirasini ilovadan yuklab olasiz.'],
  [Files,'Kundalik fayl turlari','PDF, JPG, PNG, XLSX va CSV fayllarini yuklaysiz. Har bir fayl 25 MBgacha bo‘lishi mumkin.'],
] as const;

const msfoPoints=[
  [MicrosoftWordLogo,'PDF yoki Word yuklang','PDF (skanerlangan ham), .docx fayl yoki nusxa olingan matn: jadvallar va sarlavhalar saqlanadi.'],
  [Table,'MSFO shakllari','Moliyaviy holat, foyda yoki zarar, pul oqimlari va transformatsion tuzatishlar jadvali.'],
  [MagicWand,'Tanlangan qismni qayta yozish','Paragraf yoki jadvalni belgilab, AI’dan MSFO atamalariga moslashni so‘raysiz.'],
  [FileArrowDown,'Word’ga qaytaring','Redaktorda tuzatib, natijani .docx fayl sifatida yuklab olasiz.'],
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
  ['AI hujjatni o‘zi qabul qiladimi?','Yo‘q. AI hujjatni o‘qiydi va yordamchi izoh qoldiradi. AI xato va ziddiyatlarni topib ko‘rsatadi, hujjatni qabul qilish qarorini esa buxgalter beradi.'],
  ['MSFO redaktori nima qiladi?','PDF yoki Word (.docx) hujjatini, yoki nusxa olingan matnni MSFO (IFRS) shakliga o‘tkazadi: moliyaviy hisobot uchun MSFO shakllari va transformatsion tuzatishlar jadvali, matnli hujjat uchun MSFO atamalari va tuzilishi. Natijani redaktorda tahrirlab, .docx qilib yuklab olasiz.'],
  ['AI raqamlarni o‘zi to‘ldirib qo‘ymaydimi?','Yo‘q. Manbada yo‘q qiymat «[ma’lumot kerak]» deb belgilanadi va har bir o‘zgarish standart (IAS/IFRS) bilan izohlanadi. Natija — buxgalter tekshiradigan qoralama.'],
  ['Hujjatlarim maxfiyligi qanday?','Fayllar yopiq saqlanadi va faqat sizning hisobingiz orqali ochiladi. Avtomatik tekshiruv va MSFOga o‘tkazish vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.'],
  ['Oylik va doimiy hujjatlar qanday ajratiladi?','Oylik, ya’ni davr hujjatlari va doimiy hujjatlar (ustav, guvohnoma, shartnomalar) alohida saqlanadi. Davrni barcha talablar bajarilganda yopasiz.'],
  ['Qaror tarixini keyin ko‘ra olamanmi?','Ha. Har bir qaror saqlanadi: kim, qachon va nima qilgani kompaniyaning amallar tarixida turadi.'],
  ['Ma’lumotlarimni yuklab olsam bo‘ladimi?','Ha. Kompaniyalar va fayllar zaxirasini ilovaning ichidan yuklab olasiz.'],
  ['Telefonda ishlaydimi?','Ha. Hisobkor telefon, planshet va kompyuterda ishlaydi.'],
] as [string,string][];

export function Landing(){
  useReveal();
  return <div className="isolate bg-white text-zinc-950 antialiased">
    <a href="#main" className="fixed top-2 left-2 z-50 -translate-y-24 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white focus:translate-y-0">Asosiy qismga o‘tish</a>

    <header className="sticky top-0 z-40 border-b border-zinc-950/5 bg-white pt-[env(safe-area-inset-top)]">
      <div className={`${container} flex h-16 items-center gap-6`}>
        <div className="flex flex-1 items-center"><Logo/></div>
        <nav aria-label="Asosiy navigatsiya" className="flex items-center gap-8 max-lg:hidden">
          {links.map(([href,label])=><a href={href} key={href} className="py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-950">{label}</a>)}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-5">
          <a href={app} className="py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-950 max-lg:hidden">Kirish</a>
          <span className="max-sm:hidden"><StartCta size="sm"/></span>
          <MobileMenu links={links} app={app}/>
        </div>
      </div>
    </header>

    <main id="main">
      <section className="overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className={container}>
          <div className="text-center">
            <p className="text-base font-semibold text-primary sm:text-sm">Buxgalterlar uchun ish joyi</p>
            <h1 className="mx-auto mt-4 max-w-[30ch] text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl lg:text-[3.5rem]">
              <span className="sm:block">Mijoz hujjatlari bitta joyda.</span> <span className="sm:block">Qarorni siz berasiz.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[48ch] text-lg text-pretty text-zinc-600">
              Har bir kompaniyaning hujjatlari, tekshiruv izohlari va qaror tarixi bitta tartibli ish joyida turadi.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <StartCta/>
              <a href="#tartib" className={`${secondary} text-zinc-950 hover:text-primary`}>Qanday ishlaydi<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/></a>
            </div>
            <p className="mx-auto mt-5 max-w-[56ch] text-base text-pretty text-zinc-500 sm:text-sm">Login va parol kifoya. Kompaniya qo‘shish uchun faqat nom kerak.</p>
          </div>

          <figure className="mt-14 sm:mt-20">
            <Screenshot eager src="/shots/overview.webp" alt="Hisobkor ilovasi: Atlas Savdo kompaniyasining sentabr davri — bitta hujjat qarorni kutmoqda, quyida so‘nggi hujjatlar ro‘yxati va ularning holati."/>
            <figcaption className="mt-4 text-center text-base text-zinc-500 sm:text-sm">Platformaning haqiqiy ko‘rinishi, namuna ma’lumotlar bilan.</figcaption>
          </figure>

          <ul role="list" className="mt-12 grid gap-y-4 border-t border-zinc-950/10 pt-8 sm:grid-cols-3 sm:gap-x-8">
            {facts.map(([Glyph,text])=><li key={text} className="flex items-start gap-3 text-base text-zinc-600 sm:text-sm">
              <span className="flex h-lh items-center"><Glyph size={20} className="shrink-0 text-primary" aria-hidden="true"/></span>{text}
            </li>)}
          </ul>
        </div>
      </section>

      <section id="nega" className="scroll-mt-20 border-t border-zinc-950/5 py-20 sm:py-28">
        <div className={container}>
          <HeadingGroup eyebrow="Nega kerak" title="Hujjatlar tarqoq kelsa, nazorat sizdan chiqib ketadi."
            text="Hisobkor hujjatni qidirishga emas, tekshirishga vaqt ajratishingiz uchun qilingan."/>
          <div className="mt-14 grid gap-x-8 gap-y-12 lg:grid-cols-2" data-reveal>
            <div className="border-t border-zinc-950/10 pt-6">
              <h3 className="text-lg font-semibold text-zinc-950">Odatdagi kun</h3>
              <ul role="list" className="mt-5 flex flex-col gap-4">
                {pains.map(text=><li key={text} className="flex items-start gap-3 text-base text-pretty text-zinc-600">
                  <span className="flex h-lh items-center"><X size={16} weight="bold" className="shrink-0 text-zinc-400" aria-hidden="true"/></span>{text}
                </li>)}
              </ul>
            </div>
            <div className="border-t border-primary pt-6">
              <h3 className="text-lg font-semibold text-zinc-950">Hisobkor bilan</h3>
              <ul role="list" className="mt-5 flex flex-col gap-4">
                {gains.map(text=><li key={text} className="flex items-start gap-3 text-base text-pretty text-zinc-950">
                  <span className="flex h-lh items-center"><Check size={16} weight="bold" className="shrink-0 text-primary" aria-hidden="true"/></span>{text}
                </li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="imkoniyatlar" className="scroll-mt-20 border-t border-zinc-950/5 bg-zinc-50 py-20 sm:py-28">
        <div className={container}>
          <HeadingGroup eyebrow="Imkoniyatlar" title="Kundalik ishda nimaga tayanasiz."
            text="Har bir hujjatning holati, izohi va qarori bitta ro‘yxatda ko‘rinadi."/>
          <figure className="mt-14" data-reveal>
            <Screenshot src="/shots/documents.webp" alt="Hisobkor ilovasi: kompaniyaning oylik hujjatlari ro‘yxati, holat bo‘yicha filtrlar va davrni yopish uchun qolgan talablar."/>
          </figure>
          <dl className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(([Glyph,title,text])=><div key={title} data-reveal>
              <dt className="text-base font-semibold text-zinc-950">
                <Glyph size={24} className="mb-4 shrink-0 text-primary" aria-hidden="true"/>
                {title}
              </dt>
              <dd className="mt-2 text-base text-pretty text-zinc-600">{text}</dd>
            </div>)}
          </dl>
        </div>
      </section>

      <section id="msfo" className="scroll-mt-20 border-t border-zinc-950/5 py-20 sm:py-28">
        <div className={container}>
          <HeadingGroup eyebrow="MSFO redaktori" title="PDF yoki Word hisobotni MSFO shakliga o‘tkazing."
            text="AI milliy standart bo‘yicha tuzilgan hisobot yoki matnni MSFO (IFRS) tuzilishi va atamalariga moslaydi. Siz Word’ga o‘xshash redaktorda tekshirib, tahrirlaysiz."/>
          <figure className="mt-14" data-reveal>
            <Screenshot src="/shots/msfo.webp" alt="Hisobkor MSFO redaktori: moliyaviy holat to‘g‘risidagi hisobot jadvali, formatlash paneli va o‘ng tomonda standartlar bilan AI izohlari."/>
          </figure>
          <dl className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {msfoPoints.map(([Glyph,title,text])=><div key={title} data-reveal>
              <dt className="text-base font-semibold text-zinc-950">
                <Glyph size={24} className="mb-4 shrink-0 text-primary" aria-hidden="true"/>
                {title}
              </dt>
              <dd className="mt-2 text-base text-pretty text-zinc-600">{text}</dd>
            </div>)}
          </dl>
          <p className="mt-12 max-w-[64ch] text-sm text-pretty text-zinc-600" data-reveal>Raqamlar o‘ylab topilmaydi: manbada yo‘q qiymat «[ma’lumot kerak]» deb belgilanadi, har bir o‘zgarish tegishli standart bilan izohlanadi. Natija — buxgalter tekshiradigan qoralama, auditorlik xulosasi emas.</p>
        </div>
      </section>

      <section id="tartib" className="scroll-mt-20 border-t border-zinc-950/5 py-20 sm:py-28">
        <div className={container}>
          <HeadingGroup eyebrow="Qanday ishlaydi" title="Uch qadamda ishga tayyor."/>
          <ol role="list" className="mt-14 grid gap-x-8 gap-y-10 lg:grid-cols-3">
            {steps.map(([title,text],i)=><li key={title} className="border-t border-zinc-950/10 pt-6" data-reveal>
              <p className="font-mono text-sm font-medium tracking-wide text-primary tabular-nums" aria-hidden="true">0{i+1}</p>
              <h3 className="mt-4 text-lg font-semibold text-zinc-950">{title}</h3>
              <p className="mt-2 max-w-[48ch] text-base text-pretty text-zinc-600">{text}</p>
            </li>)}
          </ol>
        </div>
      </section>

      <section id="savollar" className="scroll-mt-20 border-t border-zinc-950/5 py-20 sm:py-28">
        <div className={`${container} grid gap-x-8 gap-y-12 lg:grid-cols-3`}>
          <HeadingGroup eyebrow="Savol-javob" title="Ish boshlashdan oldin."/>
          <div className="lg:col-span-2" data-reveal>
            {questions.map(([question,answer])=><details key={question} name="faq" className="group border-b border-zinc-950/10 first:border-t">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-base font-semibold text-zinc-950 hover:text-primary [&::-webkit-details-marker]:hidden">
                {question}
                <span className="flex h-lh items-center"><CaretDown size={16} weight="bold" className="shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180" aria-hidden="true"/></span>
              </summary>
              <p className="max-w-[64ch] pb-6 text-base text-pretty text-zinc-600">{answer}</p>
            </details>)}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className={container}>
          <div className="rounded-3xl bg-zinc-950 px-6 py-16 text-center sm:py-24" data-reveal>
            <h2 className="mx-auto max-w-[30ch] text-3xl font-semibold tracking-tight text-balance text-white sm:text-5xl">Keyingi ish kuningizni tartib bilan boshlang.</h2>
            <p className="mx-auto mt-6 max-w-[48ch] text-lg text-pretty text-zinc-400">Hisob yarating, birinchi kompaniyangizni qo‘shing va hujjatlarni bir joyda yuriting.</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <StartCta/>
              <a href={app} className={`${secondary} text-white hover:text-zinc-300`}>Kirish<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/></a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer id="site-footer" className="border-t border-zinc-950/10 pb-[max(--spacing(10),env(safe-area-inset-bottom))]">
      <div className={`${container} flex flex-col gap-8 pt-10 lg:flex-row lg:items-start lg:justify-between`}>
        <div>
          <Logo/>
          <p className="mt-3 text-base text-zinc-600 sm:text-sm">Buxgalteriya, tartib bilan.</p>
        </div>
        <nav aria-label="Pastki navigatsiya" className="flex flex-wrap gap-x-8">
          {links.map(([href,label])=><a href={href} key={href} className="py-2.5 text-base font-normal text-zinc-600 hover:text-zinc-950 sm:text-sm">{label}</a>)}
          <a href={app} className="py-2.5 text-base font-normal text-zinc-600 hover:text-zinc-950 sm:text-sm">Platformaga kirish</a>
        </nav>
      </div>
      <div className={`${container} mt-10`}>
        <p className="border-t border-zinc-950/5 pt-6 text-base text-zinc-500 sm:text-sm">© 2026 Hisobkor.uz</p>
      </div>
    </footer>
  </div>;
}
