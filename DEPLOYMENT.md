# Cloudflare deployment

## Arxitektura

Bitta Worker (`hisobkor`) ikkita hostga xizmat qiladi: `hisobkor.uz` — landing, `app.hisobkor.uz` — platforma va `/api/*`. Foydalanuvchi sessiyasi faqat app hostida. Har bir hisobning D1 ish joyi va R2 fayl manzillari alohida.

`wrangler.jsonc` konfiguratsiyasi: D1 `hisobkor-production`, R2 `hisobkor-documents`, Workflow `hisobkor-document-review`. R2 uchun r2.dev yoki public custom domain yoqilmaydi. Faylni faqat autentifikatsiyalangan Worker beradi.

## Tayyorlash va chiqarish

```sh
npm ci
npm run build
npm test
npm run build:cloud
npx wrangler d1 migrations apply DB --remote
npm run deploy:cloud
```

Domen route’lari Cloudflare Workers Custom Domains orqali biriktiriladi. Ahost registraridagi nameserverlar Cloudflare zone taqdim etgan qiymatlarga o‘zgartiriladi. Pochta uchun avvalgi A/MX/TXT yozuvlari saqlanishi shart.

## Maxfiy qiymatlar

OpenAI kalitini chatga, GitHub’ga, `.env.example` yoki `wrangler.jsonc`ga yozmang. Cloudflare Worker Settings → Variables and Secrets → **Secret**, nomi `OPENAI_API_KEY`; yoki terminalda yashirin interaktiv kiritish:

```sh
npx wrangler secret put OPENAI_API_KEY
```

Model ochiq konfiguratsiyadagi `OPENAI_MODEL` bilan belgilanadi. API kaliti bo‘lmasa fayl va qo‘lda tekshiruv ishlaydi, AI o‘zini ishlayotgandek ko‘rsatmaydi. API bilan haqiqiy sinov alohida bajariladi.

## Hisoblar

Foydalanuvchi `app.hisobkor.uz/#register` sahifasida login va parol tanlab hisob yaratadi. Hisob ochilgach, o‘zining bo‘sh ish joyida buxgalter ma’lumotlarini to‘ldiradi. Login 3–40, parol 12–128 belgidan iborat; parol takroran kiritiladi. Asl parol D1’ga yozilmaydi, faqat hash saqlanadi. Email tasdiqlash va parolni email bilan tiklash yoqilmagan.

Administrator uchun `worker/admin-seed.mjs` yordamchisi ham mavjud. Tartib [CLOUD-BACKEND.md](docs/CLOUD-BACKEND.md)da. Parolni shell tarixiga ochiq yozmang; interaktiv kiritishdan foydalaning.

## Zaxira va tiklash

Foydalanuvchi ilovadan kompaniyalar va fayllarni birgalikda zaxiralaydi. D1 ma’lumotlari va R2 asl fayllari server zaxirasida ham birgalikda saqlanishi kerak. D1 eksport:

```sh
npx wrangler d1 export DB --remote --output /safe/private/path/hisobkor.sql
```

R2 obyektlarini yopiq alohida zaxiraga ko‘chiring. D1’ni tiklash R2 fayllarini avtomatik tiklamaydi. Avval alohida sinov muhitida ikkala qismini tiklab, kirish va fayl o‘qilishini tekshiring. Ishlab turgan bazaga ustidan import qilishdan oldin yangi zaxira oling.

## Lokal ma’lumotlar

Eski `npm start` preview ma’lumotlari brauzerda qoladi. Ular avtomatik tashqi serverga yuborilmaydi. Kerakli hisobga kirgach “Zaxira nusxalari” orqali bo‘sh ish joyiga import qilinadi.

## Operatsion chegaralar

Hujjat 25 MBgacha. D1 ish joyi JSON yozuvi 1 MBgacha; bu chegaradan oldin hajm aniq xato bilan cheklanadi. Katta mijozlar uchun hujjat metadata’sini alohida sahifalangan jadvallarga o‘tkazish talab etiladi. AI kunlik/navbat chegaralari backendda. Monitoringda fayl mazmuni, parollar va API kalitlari yozilmaydi.
