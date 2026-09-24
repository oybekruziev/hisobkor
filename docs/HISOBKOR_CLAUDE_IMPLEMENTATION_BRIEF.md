# Hisobkor — Claude uchun mahsulot va dizayn topshirig‘i

**Sana:** 2026-09-24 · **Holat:** implementatsiya topshirig‘i; 3D daftar personaji egasi tomonidan tasdiqlandi.  
**Kod bazasi:** `/Users/oybekruziev/Documents/hisobkor/` · **Til:** interfeysda avval o‘zbekcha, mavjud ruscha yo‘nalishni saqlash.  
**Asosiy natija:** foydalanuvchi har bir kompaniyasining hujjatlarini yig‘adi, ularni tekshiradi, kompaniya ichida MHXS loyihasini yuritadi va dalillarga bog‘langan hisobot qoralamasini tayyorlaydi.

> Claude: ushbu hujjatni kod yozish uchun amaliy topshiriq deb ol. Mavjud ishlaydigan imkoniyatlarni saqla. Hamma modulni bir katta qayta yozishga aylantirma: har bosqichda ishlaydigan, tekshirilgan natija qoldir. Tasdiqlangan personajdan foydalan; undan olingan kichik belgi va boshqa holatlarni avval tegishli o‘lchamlarda tekshir.

## 1. Mahsulot ma’nosi va asosiy foydalanuvchi yo‘li

Hisobkor — ko‘p kompaniyaga xizmat qiladigan buxgalter va moliya jamoasi uchun ish maydoni. Kompaniya hujjatlari, davriy yig‘im, faktura–shartnoma tekshiruvi, izohlar, vazifalar va MHXS (IFRS, MSFO) ishlari bir zanjirda ko‘rinadi. Kompaniyalar bir-birining ma’lumotini ko‘rmaydi. Guruhlash avtomatik konsolidatsiya degani emas.

**Birinchi marta kirgan odamning yo‘li:** kompaniya qo‘shish → davrni tanlash → hujjat yuklash → tahlil va aniqlangan masalalarni ko‘rish → buxgalter tasdig‘i → kompaniyaning MHXS loyihasini boshlash → manba hisobni moslashtirish → tuzatishlarni tekshirish → hisobot qoralamasini tahrirlash/eksport qilish. Har ekranda bitta aniq keyingi amal, holat va mas’ul ko‘rinsin. Bo‘sh ekran foydalanuvchiga nima qilishni tushuntirsin.

Yuqori darajadagi batafsil PRD mavjud: `/Users/oybekruziev/.codex/.chatgpt-projects/g-p-6aace3c973e88191838c8fda5ca43eb0/BUXGALTERIYA_PLATFORMASI_BATAFSIL_TALABLAR.md` (ayniqsa 4, 12–18, 21, 32–33-bo‘limlar). Ushbu topshiriq joriy kod uchun bajarish tartibini va yangi dizayn talablarini beradi. Ziddiyat bo‘lsa, shu briefdagi aniq yangi qarorlarni qo‘lla; qolgan tafsilotlar uchun PRDdan foydalan.

## 2. Joriy kodni hisobga ol

- UI: React/TypeScript, `src/Landing.tsx`, `src/landing.css`, `src/theme.css`, `src/Msfo.tsx`, `src/msfo/Editor.tsx`.
- MSFOning mavjud import, konvertatsiya, chatga yaqin AI amallari va DOCX eksportini o‘rgan: `src/msfo/`, `msfo-service.mjs`, `docs/MSFO.md`. Hozirgi AI konvertatsiya bitta fayldan HTML qoralama yaratadi; bu to‘liq hisob transformatsiyasi emas.
- Cloudflare Worker + D1 + xususiy R2 saqlash mavjud: `worker/app.mjs`, `worker/validation.mjs`, `migrations/`, `docs/CLOUD-BACKEND.md`. Mavjud autentifikatsiya, AI roziligi, fayl hajmi/format tekshiruvlari va maxfiy saqlashni saqla.
- Amaldagi `MSFO` ro‘yxatida `companyId` ixtiyoriy. Uni kompaniyaga qat’iy bog‘lash uchun eski yozuvlarni buzmaydigan migratsiya va «kompaniyaga biriktirish kerak» holati zarur. Kompaniya noma’lum eski hujjatni taxmin bilan boshqa kompaniyaga biriktirma.
- `public/brand-h.png` va `public/favicon.svg` amaldagi belgilar. Tasdiqlangan personajdan olingan ikonka maket va kichik o‘lchamlarda tekshirilgach, ularni versiyalangan yangi aktivlar bilan almashtir; asl fayllarni yo‘qotma.
- `main`dagi mavjud lokal commitlar va `Claude outputs/` ichidagi foydalanuvchi fayllari saqlansin. Ish boshlashda holatni tekshir, aloqasiz fayllarga tegma.

## 3. Tasdiqlangan personaj va undan olingan brend tizimi

**Tasdiqlangan asosiy obraz:** `output/branding/hisobkor-character-candidate-v3-3d-2026-09-24.png`. Bu yumshoq 3D ko‘rinishdagi ko‘k daftar personaji: oq sahifa chetlari, moviy buklangan burchak, sodda samimiy yuz va bo‘sh qo‘llar. Egasi aynan shu yo‘nalishni «zo‘r, ideal» deb tasdiqladi. Qo‘lida check yoki boshqa aksessuar bo‘lmasin. Oldingi H-logo va check-personaj yangi brend asosi sifatida ishlatilmaydi. «Hiso» nomi ishchi taklif, tasdiqlangan nom emas.

**Qo‘shimcha tayyorlangan rasmlar:**

| Fayl | Vazifasi | Holati |
| --- | --- | --- |
| `output/branding/hisobkor-character-candidate-v3-3d-2026-09-24.png` | Asosiy personaj, salomlashish/onboarding | Tasdiqlangan obraz |
| `output/branding/hisobkor-character-thinking-2026-09-24.png` | Tahlil/izlanish/bo‘sh holat | Shu obrazdan olingan qo‘shimcha poza |
| `output/branding/hisobkor-character-complete-2026-09-24.png` | Vazifa muvaffaqiyatli tugaganda | Shu obrazdan olingan qo‘shimcha poza |
| `output/branding/hisobkor-character-invite-2026-09-24.png` | Birinchi amal/bo‘sh ro‘yxatga taklif | Shu obrazdan olingan qo‘shimcha poza |
| `output/branding/hisobkor-character-help-2026-09-24.png` | Chat va yordamning bo‘sh holati | Shu obrazdan olingan qo‘shimcha poza |
| `output/branding/hisobkor-character-review-2026-09-24.png` | Inson tekshiruvi kerak bo‘lgan holat | Shu obrazdan olingan qo‘shimcha poza |
| `output/branding/hisobkor-character-icon-concept-2026-09-24.png` | Header/app ikonka uchun bosh qismi | Konsept; kichik o‘lchamda tekshirilsin |

1. Barcha to‘liq figuralar bir personajga o‘xshashi, yuz va buklangan burchak doimiy qolishi kerak. 3D yoritish va sirt materiali izchil bo‘lsin. Personaj onboarding, bo‘sh holat va yumshoq yordam xabarlarida ishlashi mumkin; muhim moliyaviy raqamlar yoki asosiy CTAni berkitmasin.
2. Kichik belgi uchun butun figurani siqma. Icon konseptini 64/32/16 px da sinab ko‘r; 16 px da yuz yo‘qolsa, buklangan burchak va daftar siluetidan sodda 2D vektor belgi yarat. Favicon, PWA va header uchun variantlar alohida tekshirilsin. Rasterni avtomatik `SVG` deb nomlama.
3. Hozirgi PNGlar tasdiqlangan vizual yo‘nalish va konsept aktivlari; ular haqiqiy 3D model loyiha fayli emas. Keyingi professional asset ishlab chiqarishda qayta tahrirlanuvchi 3D master va soddalashtirilgan vektor ikonka tayyorla. Rasmlar shaffof fonli, sifatli siqilgan, turli ekran o‘lchamlariga mos bo‘lsin.
4. Landing va ilovada personajdan me’yorida foydalan: mahsulot ekranlari va haqiqiy ish jarayoni asosiy vizual dalil bo‘lib qolsin. Mavjud brend fayllarini almashtirishdan oldin ikonka o‘lchami, kontrast va sahifa maketini vizual ko‘rib chiq.

### 3.1. Personajni qayerda va qanday ishlatish

Quyidagi jadvaldagi fayl nomlari `output/branding/` papkasiga nisbatan. Personaj holatni **tushuntiruvchi matn va amal bilan birga** ko‘rinsin; rasmning o‘zi holat yoki CTA o‘rnini bosmaydi. Bir ekranda odatda bitta personaj yetarli.

| Ekran / holat | Rasm | Joylashuv va o‘lcham | Yonidagi matn va amal |
| --- | --- | --- | --- |
| Landing hero | `hisobkor-character-candidate-v3-3d-2026-09-24.png` | Mahsulotning haqiqiy ekran kompozitsiyasi yonida kichik aksent; desktop 240–320 px, mobil 140–190 px | Mahsulot qiymati va asosiy CTA birinchi ko‘rinsin; personaj skrinshotni berkitmasin |
| Birinchi kirish / onboarding | `hisobkor-character-candidate-v3-3d-2026-09-24.png` | Xush kelibsiz panelida 180–240 px | «Birinchi kompaniyangizni qo‘shing» va bitta aniq CTA |
| Kompaniyalar ro‘yxati bo‘sh | `hisobkor-character-invite-2026-09-24.png` | Bo‘sh panel markazi yoki matn yonida 160–220 px | Nega ro‘yxat bo‘shligi va «Kompaniya qo‘shish» |
| Kompaniya hujjatlari bo‘sh | `hisobkor-character-invite-2026-09-24.png` | Hujjatlar ro‘yxatining bo‘sh qismida 160–220 px | «Hujjat yuklash»; talab ro‘yxati bo‘lsa shunga bog‘lash |
| Yuklama/tahlil ishga tushdi | `hisobkor-character-thinking-2026-09-24.png` | Vazifa holati kartasida 96–150 px, statik rasm | Haqiqiy `queued/processing` holati, fayl nomi, vaqt va qayta urinish; soxta progress foizi emas |
| Fayl tahlilida dalil yetishmaydi | `hisobkor-character-review-2026-09-24.png` | Tekshiruv xabari yonida 96–140 px | Yetishmayotgan dalil ro‘yxati va «Tekshirish»; muammo jiddiyligini rang/ikonka/matn bilan ko‘rsat |
| Kompaniya MHXS loyihasi hali yo‘q | `hisobkor-character-invite-2026-09-24.png` | MHXS bo‘limining bo‘sh holati, 160–220 px | «MHXS loyihasini boshlash», kerakli manba hisoblar ro‘yxati |
| Mapping, tuzatish yoki izoh tekshiruv kutmoqda | `hisobkor-character-review-2026-09-24.png` | Faqat umumiy review xulosasida 96–140 px; har jadval qatorida takrorlama | Nechta masala ochiq, kim mas’ul, «Masalalarni ko‘rish» |
| MHXS chat hali bo‘sh | `hisobkor-character-help-2026-09-24.png` | Chat oynasining kirish qismida 88–120 px | 2–3 manbali savol namunasi; AI javobi manbalarga bog‘lanishi haqida qisqa izoh |
| Hujjat yoki hisobot qoralamasi tasdiqlandi | `hisobkor-character-complete-2026-09-24.png` | Yakuniy muvaffaqiyat panelida 100–160 px; doimiy banner emas | Nima yakunlangani, qaysi versiya/davr va keyingi amal |
| Header / app ikonka | `hisobkor-character-icon-concept-2026-09-24.png` | Header 28–36 px; 16/32 px favicon uchun alohida sodda belgi kerak bo‘lishi mumkin | Yonida «Hisobkor» so‘z belgisi; dekorativ rasm bo‘lsa `alt=""` |

**Joylashtirish qoidalari:** data jadvali, balans, summalar, forma labeli, ruxsat rad etilishi, xavfsizlik xatosi yoki hal qilinmagan jiddiy hisob xatosi ichiga personaj qo‘yma. Bunday joyda aniq xabar, sabab, manba va keyingi amal ustun. Review personaji tanbeh ohangida bo‘lmasin; «muammoni birga ko‘ramiz» kayfiyati bo‘lsin. Mobil ekranda matn va CTA rasm sababli pastga surilib qolmasin; kerak bo‘lsa rasmni 96–140 px ga tushir yoki yashir.

**Texnik qoida:** asl PNGlarni manba sifatida saqla; sayt uchun shaffoflikni saqlaydigan optimallashtirilgan variantlar va mos `srcset` tayyorla. Landingdagi pastki rasmlarni lazy-load qil, hero uchun kerakli rasmni ustuvor yukla. Rasm faqat bezak bo‘lsa bo‘sh `alt`; holatni tushuntirishning yagona vositasi bo‘lsa qisqa ma’noli `alt` yoz. Rasmga animatsiya qo‘shilsa nozik bo‘lsin va `prefers-reduced-motion`ni hurmat qilsin. Mavjud statik rasmlarni haqiqiy animatsiya yoki 3D model deb ko‘rsatma.

## 4. Ranglar va vizual tizim

Vizual yo‘nalish: jiddiy va aniq moliyaviy ish muhiti; yorug‘ «qog‘oz» fon, tinch ko‘k navigatsiya, ma’lumot uchun keng oq maydon. GovDashdagi birlashtirilgan ish jarayoni va mahsulot ko‘rsatish usulidan ilhomlan, ularning logosi, bezagi yoki ekranlarini ko‘chirma. Grafik shovqin, «glass» kartalar va sun’iy statistikalar kerak emas.

| Token | Rang | Ishlatish |
| --- | --- | --- |
| `ink` | `#15233B` | Sarlavha, asosiy matn |
| `primary` | `#1746C8` | Asosiy CTA, faol navigatsiya; oq matn bilan |
| `primaryHover` | `#1239A7` | Hover/pressed |
| `azure` | `#36B9F6` | Logo aksenti, ma’lumot ta’kidi; oq matn bilan tugma emas |
| `page` | `#F7F9FC` | Sahifa foni |
| `surface` | `#FFFFFF` | Ish maydoni va kartalar |
| `muted` | `#55657B` | Ikkinchi darajali matn |
| `border` | `#DCE4EF` | Ajratgich va input chegarasi |
| `success` | `#087857` | Tasdiq/faqat muvaffaqiyat |
| `warning` | `#9A6400` | Tekshirish yoki yetishmagan dalil |
| `danger` | `#B33642` | Xato/rad etish |

`success/warning/danger` ma’nosini faqat rangga yuklama: ikonka va matn bo‘lsin. Ekranlarda semantik token ishlat; qattiq yozilgan ranglarni tarqatma. Interfeys matni kamida WCAG AA kontrastiga intilsin; klaviatura fokusi ravshan, tugma/teginish maydoni telefonda kamida 44×44 px. Typografiya uchun mavjud Onest shriftini saqlash mumkin; raqamli jadvallarda `tabular-nums`, izchil decimal/valyuta formatidan foydalan. Sarlavhalar, bo‘shliq va zichlik bir xil tizimda bo‘lsin. Uzun jadvalda sticky sarlavha, filter, izlanadigan ustun va mobil muqobil ko‘rinish bo‘lsin.

## 5. Landing sahifasini qayta loyihalash

`src/Landing.tsx`, `src/landing.css`, `src/theme.css` va kerakli umumiy komponentlarda quyidagi natijani yarat. Hozirgi markaziy, umumiy hero o‘rniga aniq mahsulot ko‘rsatiladigan sahifa qur:

1. **Header:** Hisobkor belgisi/nomi (tasdiqlangan personajdan olingan ixcham belgi kichik o‘lchamda tekshirilgach), `Imkoniyatlar`, `Qanday ishlaydi`, `Xavfsizlik`, `Savollar`, kirish va bitta asosiy CTA. Mobil menyu klaviatura va ekran o‘quvchida ishlasin.
2. **Hero:** desktopda chapda mahsulot va’dasi, 1–2 jumlalik izoh va birinchi CTA; o‘ngda haqiqiy ilova ko‘rinishi yoki mavjud haqiqiy skrinshotdan tuzilgan kompozitsiya. Tavsiya sarlavha: **«Bir nechta kompaniya. Bitta aniq ish jarayoni.»** Izohda hujjatlar, tekshiruv va MHXS ishlari bir joyda ekani tushunarli bo‘lsin. Ikkinchi CTA mahsulot ko‘rinishini ko‘rsatsin. Mobil holatda matn va CTA birinchi ekranda o‘qilsin.
3. **Ish jarayoni:** `Kompaniya → Hujjat → Tekshiruv → MHXS qoralamasi → Tasdiq va eksport` bosqichlari, har biri real ekranga yoki foydalanuvchi amaliga bog‘lansin. «Avtomatik» da’vosi faqat amalda bajarilgan qism uchun ishlatilsin.
4. **Uch asosiy foyda:** ko‘p kompaniyali nazorat, har faylning tekshiruv holati, manbali MHXS ishchi jarayoni. Ularni amaldagi UI skrinshotlari bilan ko‘rsat; soxta dashboard raqamlari, mijoz logolari, sharhlar yoki isbotlanmagan vaqt tejalishi qo‘shma.
5. **Ishonch va xavfsizlik:** haqiqiy saqlash/huquq/AI roziligi mexanizmlarini oddiy tilda bayon et. «100% mos», «auditdan o‘tgan», «to‘liq avtomatik MSFO» kabi asossiz da’vo ishlatma.
6. **Yakun:** sodda FAQ, aniq CTA va tegishli footer. CTA real ro‘yxatdan o‘tish/kirish oqimiga ulangan bo‘lsin. FAQ moliyaviy maslahat deb ko‘rsatilmasin.

Desktop/mobil maket, 320–1440 px oralig‘i, kontrast, klaviatura, rasmlar uchun ma’noli alt, shrift/rasm yuklanishi, CLS va ishlaydigan havolalarni tekshir. Animatsiya bo‘lsa `prefers-reduced-motion`ga rioya qil. Tasdiqlangan personajni hero yoki ish jarayoni bo‘limida yengil aksent sifatida qo‘llash mumkin; mahsulot ekrani asosiy ko‘rsatma bo‘lib qolsin.

## 6. Kompaniya ichidagi MHXS ish maydoni

Navigatsiya va ma’lumot modeli: `Kompaniyalar / [kompaniya] / MHXS`. Global MSFO ro‘yxati faqat ruxsatli loyihalarni umumiy ko‘rish uchun bo‘lishi mumkin; yaratish, yuklash, chat, tahlil, hisobot va eksport har doim `workspaceId + companyId + projectId + period` kontekstida bajarilsin. URL, API, D1 yozuvi, R2 kaliti va fon vazifasida kompaniya chegarasini serverda tekshir. Frontenddagi yashirilgan tugma vakolat tekshiruvi o‘rniga o‘tmasin.

Kompaniya MHXS sahifasida: hisobot bazasi (Full IFRS va boshqa bazalar aralashtirilmasin), birinchi o‘tish yoki davomiy davr, hisobot sanasi, qiyosiy davr, valyuta, standartlar tahriri, tayyorlovchi/tekshiruvchi; hujjatlar ro‘yxati; ochiq masalalar; ishchi jadvallar; tuzatishlar; hisobot qoralamasi; chat; audit tarixi. «Ma’lumot yo‘q», «tegishli emas» va haqiqiy `0` alohida holat bo‘lsin. Kompaniya almashsa oldingi chat/hujjat konteksti saqlanib qolmasin.

Eski `companyId` bo‘sh MSFO hujjatlari uchun migratsiya: alohida «biriktirilmagan» ro‘yxat, faqat vakolatli foydalanuvchi qo‘lda tanlab biriktiradi; tanlov tarixga yoziladi. Yangi MSFO yozuvini kompaniyasiz yaratishga yo‘l qo‘yma. Mavjud hujjatga kirish/eksportdan oldin server tomonidan kompaniya a’zoligi tekshirilsin.

## 7. Har yuklangan fayl uchun tahlil

Har qo‘llab-quvvatlangan fayl yuklangach, kompaniya/davrga bog‘langan **tahlil vazifasi** ochilsin. Tahlil holatlari `queued → processing → needs_review | completed | failed | unsupported`. PDF (shu jumladan skan), DOCX, rasm va jadval formatlari amaldagi qo‘llab-quvvatlash imkoniga qarab ochiq ro‘yxat bilan ishlasin. O‘qib bo‘lmaydigan, parolli, juda katta yoki noma’lum formatdagi fayl jim o‘tib ketmasin; sababi va qayta urinish yo‘li ko‘rinsin. `failed/unsupported` ham barcha fayllar ro‘yxatida aks etsin.

Natija: hujjat turi, kompaniya rekviziti, sana/davr/valyuta, ajratilgan muhim qiymatlar, dublikat ehtimoli, shartnoma/faktura mosligi, yetishmagan ma’lumot, mumkin bo‘lgan MHXS yo‘nalishi va ishonch darajasi. **Har topilma fayl versiyasi + sahifa/varaq/katak + aniq parcha bilan bog‘lansin.** OCR noaniq bo‘lsa foydalanuvchi asl tasvirni yonma-yon ko‘rsin va tuzatsin. AI ko‘rmagan ma’lumotni taxminiy fakt sifatida kiritma; tasdiqsiz topilma hisob registriga yozilmasin. Bir xil fayl qayta yuklansa idempotent tekshiruv va versiya qoidasi ishlasin.

AI roziligi, provayderga yuborish, saqlash muddati va maxfiylik foydalanuvchiga ravshan bo‘lsin. Rozilik o‘chirilganda yuklash va qo‘lda ishlash davom etadi, AI tahlil ishga tushmaydi. Maxfiy fayl log, URL yoki brauzer console’iga chiqmasin.

## 8. MHXSga o‘tkazish: hisobli ish jarayoni

**Termin:** asosiy UI nomi `MHXS`, yordamchi qidiruv/izohda `MSFO / IFRS`. «Faylni MSFOga aylantirish» faqat uslubiy qayta yozish emas: mahalliy hisob ma’lumotlarini tanlangan standart bo‘yicha tan olish, baholash, tasniflash va taqdimotga moslash. Bir PDF bilan to‘liq MHXS hisobotini kafolatlama.

**Ishchi zanjir:**

1. Mahalliy hisob bazasi, trial balance (TB), registrlar, oldingi davrlar, shartnomalar, aktiv/qarz reyestrlari va siyosatlarni o‘zgarmas manba versiyalari sifatida import qilish.
2. TB strukturasi, davri, hisoblar takrori, debet/kredit tengligi va boshlang‘ich/aylanma/yakuniy bog‘lanishni tekshirish. Yetishmagan yoki qisman eksportni «to‘liq TB» deb ko‘rsatmaslik.
3. Mahalliy hisoblar → MHXS satrlari mappingi. Ajratish uchun analitika yoki buxgalter tasdiqlagan qoida talab etilsin; yashirin foiz/raqam o‘ylab topilmasin.
4. Ishchi jadvallar va tuzatishlar jurnali: har yozuvga debet/kredit, summa, valyuta, davr, sabab, standart/tahrir, fayldagi dalil, parametr, muallif, tekshiruvchi va holat. `draft → review → approved`dan keyingina transformatsiya balansiga ta’sir etsin. Tasdiqlangan yozuv tahriri reversal + yangi versiya bilan yuritilsin.
5. Tasdiqlangan manba + tasdiqlangan tuzatishlardan hisobot satrini deterministik hisoblash; har satrdan manba hujjat va jurnalga orqaga yurish. Qayta hisoblash bir xil kirishda bir xil natija bersin. Balans nomutanosibligi, muhim unmapped hisob, ochiq review va majburiy izoh yetishmasligi final paketni to‘xtatsin.
6. Natija dastlab **«MHXS ishchi qoralamasi»**. To‘liq muvofiqlik bayonoti barcha tegishli talablar mutaxassis tomonidan tasdiqlangandagina. Tizim audit fikri chiqarmaydi va tashqi buxgalteriya registriga o‘zicha posting qilmaydi.

**IFRS 1 birinchi o‘tish:** birinchi hisobot davri, qiyosiy davr va ochilish sanasini alohida yuritish; qo‘llanadigan hisob siyosati, ruxsat etilgan ozod etish/istisno bo‘yicha ekspert qarorini qayd etish; oldingi hisob bazasi va MHXS o‘rtasidagi solishtirishlarni tayyorlash. Boshlang‘ich ma’lumot bo‘lmasa «tayyor» holati berilmasin. Manba: [IFRS 1 rasmiy sahifasi](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-1-first-time-adoption-of-ifrs/).

**Davrga mos qoidalar:** IFRS 18 2027-yil 1-yanvardan boshlanadigan yillik davrlar uchun kuchga kiradi; erta qo‘llash mumkin va u IAS 1 o‘rnini egallaydi. Shuning uchun 2026 loyihasida IAS 1 asosidagi taqdimot, 2027+ loyihada IFRS 18, erta qo‘llashda hujjatlashtirilgan tanlov qo‘llansin. Hisobot chiqarilgan tarixiy snapshot keyingi qoida yangilanishida o‘zgarmasin. IFRS 18 faqat sarlavhani almashtirish emas; foyda/zarar subtotallari, guruhlash va izohlarni qoida paketi bilan ko‘rib chiqish kerak. Manba: [IFRS 18 rasmiy sahifasi](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/).

**Pul oqimi:** operatsion, investitsion va moliyalashtirish oqimlarini ajratish; naqd pulsiz operatsiyani pul oqimi deb qo‘shmaslik; qoldiq bilan solishtirish. Faqat ikkita balansdan «to‘liq cash flow» yaratma. Manba: [IAS 7 rasmiy sahifasi](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/).

O‘zbekistonning BHMS va rivojlantirilayotgan MHMS qoidalari kompaniyaning **manba hisobi** bo‘lishi mumkin; ularni MHXS bilan sinonim deb olma. Kompaniya bo‘yicha manba hisob bazasi va qo‘llanadigan yuridik rejim alohida sozlansin, yangilanishlar rasmiy manba va sana bilan versiyalansin. Manba: [Iqtisodiyot va moliya vazirligi standartlar bo‘limi](https://gov.uz/oz/imv/sections/view/111726), [me’yoriy hujjatlar](https://gov.uz/oz/imv/sections/view/121388). Standartlarning to‘liq matnini mahsulotga yoki model bilim bazasiga ko‘chirishdan oldin [IFRS litsenziya shartlarini](https://www.ifrs.org/products-and-services/ifrs-accounting-licensing/) tekshir.

## 9. Kompaniya hujjatlariga tayangan chat

Har kompaniyada va har MHXS loyihasida chat paneli: «Bu raqam qayerdan?», «Nima yetishmayapti?», «Qaysi tuzatish nega taklif qilindi?» kabi savollarga javob. Chat javobi foydalanuvchi ruxsatli fayl versiyasi, sahifa/katak va tasdiqlangan ishchi jadvalga havola bersin. Manba topilmasa «bilmayman / yetarli dalil yo‘q» desin. Standartga oid xulosa uchun standart/tahrir va rasmiy manba ko‘rsatsin; manbada yo‘q band raqamini to‘qimasin.

Chat **taklif** yaratishi mumkin: vazifa, mapping yoki tuzatish qoralamasi. U foydalanuvchi tekshiruvisiz tasdiqlangan jurnal, moliyaviy hisobot yoki kompaniya sozlamalarini o‘zgartirmasin. AI javobi va har bir yozish/qo‘llash amali alohida auditga tushsin. Foydalanuvchi qaysi kontekst ishlatilganini, manbalar ro‘yxatini va AI xatolanishi mumkinligini amaliy joyda ko‘rsin.

## 10. Wordga o‘xshash tahrirlash

Mavjud `src/msfo/Editor.tsx` imkoniyatlarini buzmasdan, qoralama hisobot va izohlar uchun oddiy tahrir tajribasi yarating: sahifa ko‘rinishi, aniq format paneli, sarlavha uslublari, bold/italic, ro‘yxat, tekislash, jadval qator/ustun, undo/redo, topish, klaviatura yorliqlari, rasmiy hujjatga mos A4/print preview. `DOCX` import/eksport, PDF eksport va turli sahifa/bo‘limlardagi jadval fidelity’sini haqiqiy namunalar bilan tekshir. Kerak bo‘lsa mavjud redaktorni kengaytirish yoki barqaror rich-text frameworkka ko‘chish qarorini kichik prototip bilan asosla; yangi qaramlikni odat bo‘yicha qo‘shma.

Autosave holati («saqlandi/saqlanmoqda/xato»), versiyalar tarixi, tiklash, bir vaqtda ikki oynada tahrir nizosi, izoh/review va tasdiqlangan snapshot zarur. AI qayta yozishi oldindan farqni ko‘rsatsin va foydalanuvchi qo‘llagandan keyin matnni o‘zgartirsin. Hujjatdagi raqamni manba bilan bog‘lash saqlansin; foydalanuvchi qo‘lda o‘zgartirsa «manba bilan qayta tekshirish kerak» holati chiqsin. Tashqi/paste/AI HTML sanitizatsiyasi saqlansin.

## 11. Xavfsizlik, ishonchlilik va kuzatuv

- `workspaceId/companyId` ajratilishi barcha read/write/list/search/file/chat/job endpointlarida serverda sinovdan o‘tsin; cross-company IDlarni almashtirib ko‘rish testlari bo‘lsin.
- D1 metama’lumot va R2 fayl versiyasi bir-biriga bog‘lansin; manba fayl o‘zgarmas, yangi yuklash yangi versiya. AI queue qayta ishga tushganda ikki marta tuzatish yozmasin. Vaqtinchalik nosozlikda foydalanuvchiga amalni davom ettirish yo‘li ko‘rinsin.
- Audit: kim, qachon, qaysi kompaniya/davr, oldingi/yangi qiymat yoki havola, manba va tasdiq. Moliyaviy raqamlar tarixini jim o‘zgartirma.
- Rozilik, retention, provayderga yuborish va o‘chirish siyosati haqiqiy implementatsiyaga mos yozilsin. Ruxsat bo‘lmagan foydalanuvchiga chat javobi yoki eski fon job natijasi orqali boshqa kompaniya ma’lumoti chiqmasin.
- AI ishonch darajasi foydalanuvchiga falsafiy «ishonch foizi» sifatida emas, aniq «tasdiqlangan / tekshirish kerak / manba yetishmaydi» ish holati bilan berilsin.

## 12. Ishlab chiqish ketma-ketligi va qabul mezonlari

**1-bosqich — poydevor va dizayn:** mavjud UI/code/test holatini ko‘r; rang tokenlari, komponent holatlari, yangi landing, mobil navigatsiya va tasdiqlangan personajdan foydalanish. Ixcham ikonka avval kichik o‘lchamda tekshirilsin. Natija: landingning desktop/mobil ko‘rinishi, barcha CTA ishlaydi, accessibility va build tekshiruvi o‘tadi.

**2-bosqich — kompaniya ichidagi MHXS:** ma’lumot migratsiyasi, kompaniya navigatsiyasi, ruxsatlar, eski biriktirilmagan yozuv oqimi. Natija: kompaniya A foydalanuvchisi B ma’lumotini URL/API/job/file orqali ko‘ra olmaydi; yangi MHXS hujjati kompaniyasiz yaratilmaydi.

**3-bosqich — fayl tahlili va chat:** tahlil queue/holatlari, dalil manzili, qo‘lda tuzatish, ruxsatli manbali chat. Natija: har qo‘llab-quvvatlangan yuklama aniq yakuniy holatga keladi; noto‘g‘ri yoki o‘qilmagan fayl sababini ko‘rsatadi; manbasiz chat raqam to‘qimaydi.

**4-bosqich — MHXS transformatsiya yadrosi:** avval bitta kompaniyada TB import → mapping → qo‘lda asoslangan tuzatish → review → hisobot qoralamasi. Keyin real ehtiyoj bo‘yicha tasdiqlangan hisoblash modullari va IFRS 1/18 checklistlari. Natija: bir xil kirishdan bir xil hisobot, balans nazorati, har raqamdan manbagacha yo‘l, 2026/2027 shablon tanlovi to‘g‘ri.

**5-bosqich — redaktor va release:** DOCX/PDF fidelity, versiya/tiklash, review, eksport. Natija: uzun matn, jadval va o‘zbekcha/ruscha belgilar yo‘qolmaydi; eksportdagi raqamlar hisobot snapshotiga mos.

Har bosqichda o‘zgarish ro‘yxati, ekran tasviri, o‘tgan testlar va ochiq cheklovni ber. Mavjud `npm run typecheck`, `npm test`, `npm run build:cloud`ni tegishli o‘zgarishdan keyin bajargin; foydalanuvchining aniq tasdig‘isiz prod deploy/push qilma. Ayniqsa moliyaviy hisob uchun ekspert tasdiqlagan nazorat misollarini qo‘sh. Vaqt yoki scope yetmasa «tayyor» deb yozma: ishlaydigan bosqichni topshir va qolganini aniq vazifalar bilan ko‘rsat.

## 13. Dizayn va metodologiya manbalari

- [GovDash — mahsulotning birlashtirilgan ish jarayoni uchun ilhom](https://www.govdash.com/) va [Dash Agents](https://www.govdash.com/platform/dash-agents). Vizual yoki matn nusxasi olinmasin.
- [IFRS 1 — birinchi qo‘llash](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-1-first-time-adoption-of-ifrs/).
- [IFRS 18 — taqdimot va ochiqlash, kuchga kirish sanasi](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/).
- [IAS 7 — pul oqimlari](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/).
- [IFRS Foundation — standart materiallarini litsenziyalash](https://www.ifrs.org/products-and-services/ifrs-accounting-licensing/).
- [O‘zbekiston Iqtisodiyot va moliya vazirligi — standartlar](https://gov.uz/oz/imv/sections/view/111726).

**Yakuniy qabul qoidasi:** Hisobkor birinchi foydalanuvchi uchun tushunarli va ishonchli bo‘lsin. «Ideal» degani tekshirilmagan avtomatlashuv va bezak emas; har muhim raqamning manbasi, har amalning holati, har kompaniyaning chegarasi va keyingi qadam ravshan bo‘lishi.
