# Hisobkor.uz

Buxgalterlar uchun kompaniyalar, hujjatlar, avtomatik izohlar va qarorlar tarixi.

- **hisobkor.uz** — asosiy tanishtiruv sayti.
- **app.hisobkor.uz** — hisob bilan kiriladigan ish platformasi.
- Cloudflare Workers — sayt va backend; D1 — ma’lumotlar; yopiq R2 — asl fayllar; Workflows — fon tekshiruvlari.
- OCR/AI backend orqali OpenAI Responses xizmatiga ulanadi. Kalit brauzerga berilmaydi.

## Mahalliy ko‘rish

Node.js 24 yoki yangiroq:

```sh
npm ci
npm run build
npm test
npm start
```

Platforma: http://127.0.0.1:4173/; asosiy sayt: http://127.0.0.1:4173/landing.html.

Bu lokal rejim avvalgi LocalStorage/IndexedDB ma’lumotlarini saqlaydi. Cloudflare versiyasiga avtomatik ko‘chirmaydi. Zaxirani faqat kerakli hisobning bo‘sh ish joyiga import qiling.

## Cloudflare

```sh
npm run build:cloud
npx wrangler d1 migrations apply DB --local
npx wrangler dev --var ENVIRONMENT:local
```

Deploy va hisob yaratish: [DEPLOYMENT.md](DEPLOYMENT.md), backend tafsilotlari: [docs/CLOUD-BACKEND.md](docs/CLOUD-BACKEND.md).

## Ish tartibi

1. Hisobingizga kiring va buxgalter profilini to‘ldiring.
2. Kompaniya qo‘shing, dropdown orqali ishlayotgan kompaniyangizni tanlang.
3. Oylik yoki doimiy hujjatlarni yuklang. Avtomatik izohlar hujjat ichida ko‘rinadi.
4. Hujjatni qabul qiling yoki sababini yozib tuzatishga qaytaring.
5. Kompaniya tarixi, reyestri va zaxiralaridan foydalaning.

Har bir foydalanuvchining ish joyi ajratilgan. Hujjatlar ochiq URL bilan berilmaydi. Saqlashda revision tekshiruvi boshqa oynadagi o‘zgarishni bosib yozishdan saqlaydi. Fayl versiyalari va avvalgi qabul qarorlari saqlanadi.

## AI cheklovlari

Hujjatni tahlil qilish uchun fayl mazmuni backenddan OpenAI xizmatiga yuboriladi. `store:false` qo‘llanadi; bu provayderning barcha saqlash siyosatini o‘chirmaydi. AI xulosasi maslahat, qabul qarori emas. OCR xato qilishi mumkin. Jadval tahlili dastlabki 1000 qator bilan cheklanishi mumkin. Didox, elektron imzo va avtomatik soliq topshirish ulanmagan.

D1 tanlovi: foydalanuvchining 2026-09-18 kungi tasdig‘i bilan dastlabki PostgreSQL talabi Cloudflare D1’ga almashtirilgan.

## Tekshiruvlar

`npm test` — domen mantiqi, AI javobi, zaxira, saqlash, Node va Workers API testlari. `npm run build:cloud` — Worker konfiguratsiyasi va build. [RELEASE-CHECK.md](RELEASE-CHECK.md) tekshirilgan va hali tekshirilmagan qismlarni ajratadi.
