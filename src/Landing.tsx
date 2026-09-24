import React from 'react';
import {MobileMenu} from './components/landing/MobileMenu';
import {useReveal} from './components/landing/motion';
import {Character, Wordmark} from './components/Character';
import {ArrowRight,CaretDown,Check,Buildings,Sparkle,LockKey,Files,MicrosoftWordLogo,ShieldCheck,ClockCounterClockwise,Eye,UsersThree,Stack,CloudArrowUp,SealCheck} from './components/landing/icons';

const app='https://app.hisobkor.uz';
const register=`${app}/#register`;
const links=[['#imkoniyatlar','Imkoniyatlar'],['#jarayon','Qanday ishlaydi'],['#xavfsizlik','Xavfsizlik'],['#savollar','Savollar']] as const;

/* One container, one primary button and one quiet secondary for the whole page. */
const container='mx-auto max-w-6xl px-5 sm:px-6 lg:px-8';
const primary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(21_35_59/0.2),0_6px_16px_-6px_rgb(23_70_200/0.45)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold text-foreground shadow-[0_1px_2px_rgb(21_35_59/0.05)] transition-colors hover:bg-muted';

function Logo(){
  return <a href="/" aria-label="Hisobkor.uz bosh sahifasi" className="flex shrink-0 items-center"><Wordmark size={32}/></a>;
}

function StartCta({size='lg',children='Hisob yaratish'}:{size?:'sm'|'lg';children?:React.ReactNode}){
  return <a href={register} className={`${primary} ${size==='lg'?'px-5 text-base sm:text-[0.9375rem]':'min-h-10 px-3.5 text-sm'}`}>
    {children}<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/>
  </a>;
}

/** Real product screenshot in a quiet browser frame; on phones it shows the left part at a readable size. */
function Screenshot({src,alt,eager=false,className=''}:{src:string;alt:string;eager?:boolean;className?:string}){
  return <div className={`overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(21_35_59/0.05),0_24px_60px_-28px_rgb(21_35_59/0.35)] ${className}`}>
    <div aria-hidden="true" className="flex h-8 items-center gap-1.5 border-b border-border bg-muted/70 px-3"><span className="size-2.5 rounded-full bg-border"/><span className="size-2.5 rounded-full bg-border"/><span className="size-2.5 rounded-full bg-border"/><span className="ml-3 h-4 w-40 rounded-md bg-card/80"/></div>
    <div className="overflow-hidden">
      <img src={src} alt={alt} width="1632" height="1032" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" className="block w-full max-w-none max-sm:w-176"/>
    </div>
  </div>;
}

function HeadingGroup({eyebrow,title,text,center=false}:{eyebrow:string;title:string;text?:string;center?:boolean}){
  return <div data-reveal className={center?'mx-auto text-center':''}>
    <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
    <h2 className={`mt-3 max-w-[30ch] text-3xl font-semibold tracking-[-0.025em] text-balance text-foreground sm:text-[2.5rem] sm:leading-[1.1] ${center?'mx-auto':''}`}>{title}</h2>
    {text&&<p className={`mt-5 max-w-[56ch] text-lg text-pretty text-muted-foreground ${center?'mx-auto':''}`}>{text}</p>}
  </div>;
}

/* The real chain in the app today. "Avtomatik" only where it is automatic. */
const flow=[
  [Buildings,'Kompaniya','Har bir mijoz tashkiloti alohida: hujjatlari, rekvizitlari va tarixi aralashmaydi.'],
  [CloudArrowUp,'Hujjat','Oylik va doimiy hujjatlarni PDF, rasm, Excel yoki CSV ko‘rinishida yuklaysiz.'],
  [Sparkle,'Tekshiruv','Rozilik bersangiz, AI faylni o‘qib, xato va ziddiyatlarni belgilaydi. Qarorni siz berasiz.'],
  [Stack,'MHXS qoralamasi','PDF yoki Word hisobotni MHXS (MSFO / IFRS) tuzilishiga moslangan qoralamaga aylantirasiz.'],
  [MicrosoftWordLogo,'Tasdiq va eksport','Redaktorda tekshirib, tuzatib, natijani Word (.docx) faylga yuklab olasiz.'],
] as const;

const benefits=[
  {id:'nazorat',eyebrow:'Ko‘p kompaniyali nazorat',title:'Qaysi kompaniyada nima kutilayotgani — bir qarashda.',text:'Bosh sahifada tekshiruvingizni kutayotgan hujjatlar navbati va har bir kompaniyaning davr bo‘yicha holati turadi. Yon paneldan istalgan kompaniyaga bir bosishda o‘tasiz.',
    points:['Tekshiruv navbati: eng yangi hujjatlar yuqorida','Har kompaniya uchun davr holati va to‘liqlik','Kompaniyalar bir-birining ma’lumotini ko‘rmaydi'],
    src:'/shots/home.webp',alt:'Hisobkor bosh sahifasi: tekshiruvni kutayotgan hujjatlar navbati va kompaniyalar ro‘yxati, har birida davr holati.'},
  {id:'holat',eyebrow:'Har faylning holati',title:'Har bir hujjat qayerda turgani aniq.',text:'Hujjat «Tekshirish kerak», «Kutilmoqda» yoki «Qabul qilingan» holatida bo‘ladi. Filtr, qidiruv va davrni yopish uchun nima qolgani bitta sahifada.',
    points:['Holat rang bilan emas, belgi va so‘z bilan ham ko‘rsatiladi','Har qaror kim va qachon berilgani bilan tarixda','Reyestrni CSV faylga yuklab olasiz'],
    src:'/shots/documents.webp',alt:'Hisobkor hujjatlar sahifasi: oylik hujjatlar jadvali, holat bo‘yicha filtrlar va davrni yopish uchun qolgan talablar.'},
  {id:'mhxs',eyebrow:'MHXS ishchi qoralamasi',title:'Hisobotni MHXS shakliga — tekshiriladigan qoralama sifatida.',text:'AI milliy standart bo‘yicha tuzilgan hisobot yoki matnni MHXS tuzilishi va atamalariga moslaydi. Manbada yo‘q qiymat o‘ylab topilmaydi — «[ma’lumot kerak]» deb belgilanadi.',
    points:['Word’ga o‘xshash redaktor: jadval, sarlavha, ro‘yxat','Har o‘zgarish tegishli standart bilan izohlanadi','Natija — buxgalter tekshiradigan qoralama, audit xulosasi emas'],
    src:'/shots/msfo.webp',alt:'Hisobkor MHXS redaktori: moliyaviy holat to‘g‘risidagi hisobot jadvali, formatlash paneli va o‘ng tomonda AI izohlari.'},
] as const;

const trust=[
  [LockKey,'Fayllar yopiq saqlanadi','Hujjatlar ommaviy havolasiz, yopiq omborda turadi va faqat sizning hisobingiz orqali ochiladi.'],
  [ShieldCheck,'AI faqat roziligingiz bilan','«AI tahliliga ruxsat» o‘chirilsa, fayl AI xizmatiga yuborilmaydi — yuklash va qo‘lda tekshirish ishlayveradi. AI xizmati (OpenAI) serverlari O‘zbekistonda emas.'],
  [SealCheck,'Qarorni buxgalter beradi','AI hujjatni o‘zi qabul qilmaydi va raqam to‘qimaydi. U izoh qoldiradi, yakuniy qaror sizda.'],
  [ClockCounterClockwise,'Har amal tarixda','Kim, qachon va qaysi hujjat bo‘yicha qaror qilgani kompaniya tarixida saqlanadi.'],
  [UsersThree,'Kompaniyalar ajratilgan','Har bir kompaniyaning hujjatlari, qarorlari va tarixi alohida yuritiladi.'],
  [Files,'Zaxira sizning qo‘lingizda','Kompaniyalar va fayllar zaxirasini ilova ichidan istalgan vaqtda yuklab olasiz.'],
] as const;

export const questions=[
  ['Ishni qanday boshlayman?','Login va parol bilan hisob yaratasiz (parol kamida 12 belgi). So‘ng profilingizni to‘ldirasiz va birinchi kompaniyangizni qo‘shasiz — buning uchun faqat tashkilot nomi kerak.'],
  ['Bir nechta kompaniya bilan ishlasam bo‘ladimi?','Ha. Bitta hisobga bir nechta kompaniya qo‘shasiz. Har birining hujjatlari, rekvizitlari va amallar tarixi alohida saqlanadi.'],
  ['Qaysi fayllarni yuklash mumkin?','Hujjatlar uchun PDF, JPG, PNG, XLSX va CSV — har bir fayl 25 MBgacha. MHXS redaktoriga PDF (skanerlangan ham) yoki Word (.docx) yuklanadi.'],
  ['AI hujjatni o‘zi qabul qiladimi?','Yo‘q. AI hujjatni o‘qiydi va xato hamda ziddiyatlarni izoh sifatida belgilaydi. Hujjatni qabul qilish qarorini buxgalter beradi.'],
  ['MHXS redaktori nima qiladi?','PDF yoki Word hisobotni, yoki nusxa olingan matnni MHXS (MSFO / IFRS) tuzilishi va atamalariga moslangan qoralamaga aylantiradi. Siz uni redaktorda tekshirib, tahrirlab, .docx qilib yuklab olasiz. Bu to‘liq MHXS transformatsiyasi yoki audit xulosasi emas.'],
  ['AI raqamlarni o‘zi to‘ldirib qo‘ymaydimi?','Yo‘q. Manbada yo‘q qiymat «[ma’lumot kerak]» deb belgilanadi va har bir o‘zgarish tegishli standart bilan izohlanadi.'],
  ['Hujjatlarim qayerga yuboriladi?','Fayllar yopiq omborda saqlanadi. «AI tahliliga ruxsat» yoqilgan bo‘lsa, tekshiruv va MHXSga o‘tkazish vaqtida hujjat mazmuni AI xizmatiga (OpenAI) yuboriladi; uning serverlari O‘zbekistonda joylashmagan. Ruxsatni istalgan vaqtda o‘chirishingiz mumkin.'],
  ['Oylik va doimiy hujjatlar qanday ajratiladi?','Oylik (davr) hujjatlari va doimiy hujjatlar — ustav, guvohnoma, shartnomalar — alohida saqlanadi. Barcha talablar bajarilganda davrni yopasiz.'],
  ['Telefonda ishlaydimi?','Ha. Hisobkor telefon, planshet va kompyuterda brauzer orqali ishlaydi.'],
] as [string,string][];

export function Landing(){
  useReveal();
  return <div className="isolate bg-background text-foreground antialiased">
    <a href="#main" className="fixed top-2 left-2 z-50 -translate-y-24 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background focus:translate-y-0">Asosiy qismga o‘tish</a>

    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 pt-[env(safe-area-inset-top)]">
      <div className={`${container} flex h-16 items-center gap-6`}>
        <div className="flex flex-1 items-center"><Logo/></div>
        <nav aria-label="Asosiy navigatsiya" className="flex items-center gap-7 max-lg:hidden">
          {links.map(([href,label])=><a href={href} key={href} className="py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">{label}</a>)}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-4">
          <a href={app} className="py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground max-lg:hidden">Kirish</a>
          <span className="max-sm:hidden"><StartCta size="sm"/></span>
          <MobileMenu links={links} app={app}/>
        </div>
      </div>
    </header>

    <main id="main">
      {/* Hero: promise and first action on the left, the real product on the right. */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(60rem_28rem_at_75%_0%,rgb(54_185_246/0.14),transparent_70%),radial-gradient(40rem_24rem_at_10%_10%,rgb(23_70_200/0.08),transparent_70%)]"/>
        <div className={`${container} grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10`}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[0_1px_2px_rgb(21_35_59/0.05)]"><span aria-hidden="true" className="size-1.5 rounded-full bg-azure"/>Buxgalterlar va moliya jamoalari uchun</p>
            <h1 className="mt-5 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-[3.25rem] lg:text-[3.5rem]">Bir nechta kompaniya. <span className="text-primary">Bitta aniq ish jarayoni.</span></h1>
            <p className="mt-6 max-w-[46ch] text-lg text-pretty text-muted-foreground">Hujjatlarni yig‘ish, ularni tekshirish va MHXS qoralamasini tayyorlash — har bir kompaniya uchun bitta joyda, har qadamda keyingi amal ko‘rinib turadi.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StartCta/>
              <a href="#ilova" className={secondary}><Eye size={18} className="shrink-0 text-primary" aria-hidden="true"/>Ilovani ko‘rish</a>
            </div>
            <p className="mt-5 text-sm text-pretty text-muted-foreground">Login va parol kifoya. Kompaniya qo‘shish uchun faqat nom kerak.</p>
          </div>
          <figure id="ilova" className="relative min-w-0 scroll-mt-24">
            <Screenshot eager src="/shots/overview.webp" alt="Hisobkor ilovasi: Atlas Savdo kompaniyasining sentabr davri — bitta hujjat qarorni kutmoqda, quyida so‘nggi hujjatlar ro‘yxati va ularning holati." className="lg:w-[118%]"/>
            <Character pose="welcome" width={250} eager className="absolute -bottom-12 -left-3 w-32! drop-shadow-[0_18px_24px_rgb(21_35_59/0.18)] sm:w-44! lg:-bottom-16 lg:-left-10 lg:w-[210px]!"/>
            <figcaption className="mt-4 pl-36 text-right text-sm text-muted-foreground sm:pl-48">Haqiqiy ilova, namuna ma’lumotlar bilan.</figcaption>
          </figure>
        </div>
      </section>

      {/* The chain, exactly as it works today. */}
      <section id="jarayon" className="scroll-mt-20 border-t border-border/70 bg-card py-20 sm:py-24">
        <div className={container}>
          <HeadingGroup eyebrow="Qanday ishlaydi" title="Kompaniyadan eksportgacha — besh aniq qadam." text="Har ekranda bitta keyingi amal, holat va mas’ul ko‘rinadi. AI yordam beradi, qarorni esa siz berasiz."/>
          <ol role="list" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            {flow.map(([Glyph,title,text],i)=><li key={title} className="relative flex flex-col gap-3 rounded-2xl border border-border bg-background p-5" data-reveal>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><Glyph size={20} aria-hidden="true"/></span>
                <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums" aria-hidden="true">0{i+1}</span>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">{text}</p>
              {i<flow.length-1&&<ArrowRight size={16} weight="bold" aria-hidden="true" className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 rounded-full bg-card text-border lg:block"/>}
            </li>)}
          </ol>
        </div>
      </section>

      {/* Three benefits, each proven with a real screen. */}
      <section id="imkoniyatlar" className="scroll-mt-20 py-20 sm:py-28">
        <div className={`${container} flex flex-col gap-24 sm:gap-32`}>
          {benefits.map((b,i)=><div key={b.id} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <div className={i%2?'lg:order-2':''}>
              <HeadingGroup eyebrow={b.eyebrow} title={b.title} text={b.text}/>
              <ul role="list" className="mt-7 flex flex-col gap-3" data-reveal>
                {b.points.map(p=><li key={p} className="flex items-start gap-3 text-base text-pretty"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><Check size={12} weight="bold" aria-hidden="true"/></span>{p}</li>)}
              </ul>
            </div>
            <figure className={`min-w-0 ${i%2?'lg:order-1':''}`} data-reveal><Screenshot src={b.src} alt={b.alt}/></figure>
          </div>)}
        </div>
      </section>

      {/* Trust: only what the product actually does. */}
      <section id="xavfsizlik" className="scroll-mt-20 border-y border-border/70 bg-card py-20 sm:py-24">
        <div className={container}>
          <HeadingGroup eyebrow="Xavfsizlik va ishonch" title="Ma’lumotlaringiz bilan nima bo‘lishini oldindan bilasiz." text="Hech qanday «100% avtomatik» va’da yo‘q — faqat amalda ishlaydigan mexanizmlar."/>
          <dl className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {trust.map(([Glyph,title,text])=><div key={title} data-reveal className="flex gap-4">
              <dt className="sr-only">{title}</dt>
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><Glyph size={20}/></span>
              <dd><p className="font-semibold text-foreground">{title}</p><p className="mt-1.5 text-sm text-pretty text-muted-foreground">{text}</p></dd>
            </div>)}
          </dl>
        </div>
      </section>

      <section id="savollar" className="scroll-mt-20 py-20 sm:py-28">
        <div className={`${container} grid gap-x-10 gap-y-12 lg:grid-cols-3`}>
          <div>
            <HeadingGroup eyebrow="Savollar" title="Ish boshlashdan oldin."/>
            <p className="mt-5 max-w-[36ch] text-sm text-pretty text-muted-foreground" data-reveal>Javoblar mahsulot qanday ishlashi haqida. Ular moliyaviy yoki yuridik maslahat emas.</p>
          </div>
          <div className="lg:col-span-2" data-reveal>
            {questions.map(([question,answer])=><details key={question} name="faq" className="group border-b border-border first:border-t">
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 py-5 text-base font-semibold hover:text-primary [&::-webkit-details-marker]:hidden">
                {question}
                <span className="flex h-lh items-center"><CaretDown size={16} weight="bold" className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true"/></span>
              </summary>
              <p className="max-w-[64ch] pb-6 text-base text-pretty text-muted-foreground">{answer}</p>
            </details>)}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className={container}>
          <div className="relative isolate overflow-hidden rounded-3xl bg-ink px-6 py-14 sm:px-12 sm:py-16" data-reveal>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [mask-image:linear-gradient(to_left,black,transparent_75%)] bg-[size:18px_18px]"/>
            <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
              <Character pose="invite" width={170} className="max-sm:w-32!"/>
              <div className="flex-1">
                <h2 className="max-w-[26ch] text-3xl font-semibold tracking-[-0.025em] text-balance text-white sm:text-4xl">Birinchi kompaniyangizni bugun qo‘shing.</h2>
                <p className="mt-4 max-w-[48ch] text-lg text-pretty text-ink-muted">Hisob yarating, kompaniya nomini kiriting va hujjatlarni bir joyda yuriting.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <StartCta/>
                  <a href={app} className="inline-flex min-h-11 items-center gap-1.5 px-2 font-semibold text-white hover:text-ink-primary">Kirish<ArrowRight size={16} weight="bold" className="shrink-0" aria-hidden="true"/></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer id="site-footer" className="border-t border-border pb-[max(--spacing(10),env(safe-area-inset-bottom))]">
      <div className={`${container} flex flex-col gap-8 pt-10 lg:flex-row lg:items-start lg:justify-between`}>
        <div>
          <Logo/>
          <p className="mt-3 text-sm text-muted-foreground">Buxgalteriya, tartib bilan.</p>
        </div>
        <nav aria-label="Pastki navigatsiya" className="flex flex-wrap gap-x-8">
          {links.map(([href,label])=><a href={href} key={href} className="py-2.5 text-sm text-muted-foreground hover:text-foreground">{label}</a>)}
          <a href={app} className="py-2.5 text-sm text-muted-foreground hover:text-foreground">Platformaga kirish</a>
        </nav>
      </div>
      <div className={`${container} mt-10`}>
        <p className="border-t border-border/70 pt-6 text-sm text-muted-foreground">© 2026 Hisobkor.uz</p>
      </div>
    </footer>
  </div>;
}
