import React from 'react';
import {Button} from './components/ui/button';
import {Badge} from './components/ui/badge';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from './components/ui/card';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from './components/ui/table';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from './components/ui/accordion';
import {Separator} from './components/ui/separator';
import {Icon} from './Icon';
const app='https://app.hisobkor.uz';
function Brand(){return <a className="site-brand" href="/" aria-label="Hisobkor.uz bosh sahifa"><img src="/brand-h.png" width="34" height="34" alt=""/><span>hisobkor<span>.uz</span></span></a>}
function StartButton({outline=false,children='Hisob yaratish'}:{outline?:boolean;children?:React.ReactNode}){return <Button asChild variant={outline?'outline':'default'} className="site-cta"><a href={`${app}/#register`}>{children}<Icon name="arrow"/></a></Button>}
function WorkspacePreview(){return <Card className="workspace-preview" aria-label="Platformadagi hujjatlar ko‘rinishi namunasi">
 <div className="preview-top"><span className="preview-label"><Icon name="dashboard"/>Ish joyingiz</span><Badge variant="outline">Ko‘rinish namunasi</Badge></div>
 <div className="preview-layout"><aside className="preview-sidebar" aria-hidden="true"><span className="preview-company"><Icon name="company"/>Atlas Savdo<Icon name="down" size={16}/></span>{[['document','Hujjatlar'],['clock','Tarix'],['folder','Doimiy hujjatlar']].map(([icon,label],i)=><span className={i===0?'preview-nav current':'preview-nav'} key={label}><Icon name={icon}/>{label}</span>)}<span className="preview-sidebar-bottom"><Icon name="shield"/>Shaxsiy ish joyi</span></aside>
 <div className="preview-main"><div className="preview-heading"><div><h2>Hujjatlar</h2><p>Atlas Savdo · Oylik hujjatlar</p></div><Button asChild variant="outline"><a href={app}><Icon name="arrow"/>Platformani ochish</a></Button></div>
 <div className="preview-stats">{[['Jami hujjatlar','3'],['Tekshirish kerak','1'],['Qabul qilingan','2']].map(([label,value])=><Card key={label}><span>{label}</span><strong>{value}</strong></Card>)}</div>
 <div className="preview-table"><Table><TableHeader><TableRow><TableHead>Hujjat</TableHead><TableHead>Holat</TableHead><TableHead>Tekshiruv</TableHead></TableRow></TableHeader><TableBody>{[
  ['Schyot-faktura № 024','Tekshirish kerak','Izohlar tayyor'],['Xizmat ko‘rsatish shartnomasi','Qabul qilingan','Tekshirildi'],['Bank ko‘chirmasi','Qabul qilingan','Tekshirildi']
 ].map(([name,status,review],i)=><TableRow key={name}><TableCell><span className="preview-file"><Icon name="document"/><span>{name}<small>PDF hujjat</small></span></span></TableCell><TableCell><Badge variant="outline" className={i===0?'blue-badge':''}>{i===0?<Icon name="clock" size={14}/>:<Icon name="check" size={14}/>} {status}</Badge></TableCell><TableCell><span className="preview-review"><Icon name="spark" size={16}/>{review}</span></TableCell></TableRow>)}</TableBody></Table></div>
 <div className="preview-note"><Icon name="spark"/><p><strong>Hujjat yonida yordamchi xulosa.</strong> Rekvizitlarni solishtiring, izohlarni ko‘ring va qaror bering.</p></div></div></div>
 </Card>}
const questions=[
 ['Bir nechta kompaniya bilan ishlasam bo‘ladimi?','Ha. Bitta hisobga bir nechta kompaniya qo‘shasiz. Har birining hujjatlari, rekvizitlari va amallar tarixi alohida saqlanadi.'],
 ['Ishni qanday boshlayman?','Login va parol bilan hisob yarating, buxgalter profilingizni to‘ldiring va birinchi kompaniyangizni qo‘shing. Shundan keyin hujjat yuklashingiz mumkin.'],
 ['Qaysi fayllarni yuklash mumkin?','PDF, JPG, PNG, XLSX va CSV fayllari. Har bir fayl 25 MBgacha bo‘lishi mumkin.'],
 ['AI hujjatni o‘zi qabul qiladimi?','Yo‘q. AI hujjatni o‘qiydi va yordamchi izoh beradi. Hujjatni qabul qilish yoki tuzatish kerakligini belgilash qarori buxgalterda qoladi.'],
 ['Hujjatlarim hammaga ochiq bo‘ladimi?','Yo‘q. Fayllar yopiq saqlanadi va hisobingiz orqali ochiladi. Avtomatik tekshiruv vaqtida hujjat mazmuni AI tahlil xizmatiga yuboriladi.']
];
export function Landing(){return <>
 <a className="site-skip" href="#main">Asosiy qismga o‘tish</a>
 <header className="site-header"><div className="site-wrap header-inner"><Brand/><nav aria-label="Asosiy navigatsiya"><a href="#imkoniyatlar">Imkoniyatlar</a><a href="#tartib">Qanday ishlaydi</a><a href="#savollar">Savol-javob</a></nav><div className="header-actions"><Button asChild variant="ghost"><a href={app}>Kirish</a></Button><StartButton/></div></div></header>
 <main id="main">
 <section className="site-hero site-wrap"><Badge variant="outline" className="hero-badge"><span/>Buxgalterning kundalik ish joyi</Badge><h1>Hujjatlar tartibda.<br/><span>Hisob nazoratda.</span></h1><p className="hero-description">Kompaniyalar, hujjatlar va tekshiruvlar — bitta ish joyida.<br className="desktop-break"/> Qidirishga kamroq, hisobga ko‘proq vaqt ajrating.</p><div className="hero-actions"><StartButton>Ishni boshlash</StartButton><Button asChild variant="outline" className="site-cta"><a href="#tartib">Qanday ishlaydi<Icon name="down"/></a></Button></div><p className="hero-caption">Avval profilingiz. Keyin kompaniyangiz. So‘ng hujjatlar.</p></section>
 <section className="site-wrap product-section" aria-label="Hisobkor platformasi"><WorkspacePreview/><div className="product-footnotes"><span><Icon name="company"/>Kompaniyalar alohida</span><span><Icon name="spark"/>AI yordamchi izohlari</span><span><Icon name="clock"/>Har bir qaror tarixda</span></div></section>
 <section className="site-wrap site-section" id="imkoniyatlar"><div className="section-intro"><Badge variant="secondary">Imkoniyatlar</Badge><h2>Kundalik ishda kerak bo‘ladigani.</h2><p>Hujjatni yuklashdan yakuniy qarorgacha — tushunarli tartib.</p></div><div className="site-features">{[
  ['company','Har bir kompaniya — o‘z joyida','Kompaniyani tanlang. Uning hujjatlari, rekvizitlari va tarixi darhol oldingizda.'],
  ['spark','Tekshiruvga yordamchi','Hujjatdagi rekvizitlarni ajrating. Schyot-faktura va shartnomani solishtirish uchun AI izohlarini ko‘ring.'],
  ['clock','Qarorlar yo‘qolmaydi','Kim, qachon va qanday qaror berganini kuzating. Oldingi fayl nusxalari va amallarni tarixdan toping.']
 ].map(([icon,title,description])=><Card className="feature-card" key={title}><CardHeader><span className="feature-symbol"><Icon name={icon} size={23}/></span><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>)}</div></section>
 <section className="workflow-section" id="tartib"><div className="site-wrap site-section"><div className="section-intro"><Badge variant="secondary">3 oddiy qadam</Badge><h2>Ishni tanish tartibda boshlang.</h2><p>Murakkab sozlamalarsiz, birinchi hujjatingizgacha.</p></div><ol className="site-steps">{[
  ['Profilingizni to‘ldiring','Hisob yarating va buxgalter ma’lumotlaringizni kiriting. Qarorlar sizning ismingiz bilan saqlanadi.'],
  ['Kompaniya qo‘shing','Tashkilot nomini kiriting. Rekvizitlar va aloqa ma’lumotlarini keyin ham to‘ldirishingiz mumkin.'],
  ['Hujjatlar bilan ishlang','Fayllarni yuklang, tekshiruv izohlarini ko‘ring va hujjat bo‘yicha qaroringizni belgilang.']
 ].map(([title,description],i)=><li key={title}><span className="step-number">0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></div></section>
 <section className="site-wrap site-section site-faq" id="savollar"><div className="section-intro"><Badge variant="secondary">Savol-javob</Badge><h2>Ish boshlashdan oldin.</h2><p>Hisobkor haqida qisqa javoblar.</p></div><Accordion type="single" collapsible className="faq-list">{questions.map(([question,answer],i)=><AccordionItem value={`question-${i}`} key={question}><AccordionTrigger>{question}</AccordionTrigger><AccordionContent>{answer}</AccordionContent></AccordionItem>)}</Accordion></section>
 <section className="site-wrap closing-section"><Card className="closing-card"><CardContent><span className="closing-icon"><Icon name="check" size={26}/></span><h2>Keyingi ish kuningizni<br/>tartib bilan boshlang.</h2><p>Kompaniyalaringiz va hujjatlaringiz uchun bitta ish joyi.</p><StartButton>Hisob yaratish</StartButton></CardContent></Card></section>
 </main><footer className="site-wrap site-footer"><Separator/><div><Brand/><p>Buxgalteriya, tartib bilan.</p><Button asChild variant="ghost"><a href={app}>Platformaga kirish<Icon name="arrow"/></a></Button></div></footer>
 </>}
