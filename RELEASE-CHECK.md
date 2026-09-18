# Hisobkor.uz — release tekshiruvi

2026-09-18. Cloudflare Workers + D1 + yopiq R2 + Workflows.

## Bajarildi

- Oq-qora zinc interfeys: kamida 14 px matn, kompaniya dropdowni, profil → kompaniya → hujjatlar tartibi. AI ulash va kalit kiritish foydalanuvchi ekranlaridan olib tashlandi.
- Alohida hisobkor.uz landing va app.hisobkor.uz platforma, www asosiy domenga yo‘naltiriladi.
- 54 test o‘tdi: foydalanuvchi chegaralari, sessiya/origin, saqlash revisioni, fayl versiyasi, AI parsing/natija holati, backup va asosiy buxgalter oqimi.
- Haqiqiy lokal Workerd/D1/R2: login 200, workspace 200, fayl yaratish 201, bir xil qayta yuborish 200, o‘zgartirilgan fayl IDsi 409, aslini qayta o‘qish 200, sessiyasiz fayl 401.
- Cloudflare build va deploy bajarildi; ikkala D1 migratsiyasi remote bazaga qo‘llandi. Workflow binding yaratildi.
- R2 r2.dev public access o‘chiq va custom public domain yo‘q.
- Desktop va 390 px telefon ko‘rinishi ko‘rildi; mobil DOMda gorizontal overflow va 14 pxdan kichik ko‘rinadigan matn topilmadi.
- Ahost nameserverlari everton.ns.cloudflare.com va mona.ns.cloudflare.com ga saqlandi. Pochta A/MX/TXT yozuvlari Cloudflare’da saqlandi.
- GitHub CI: test va Cloudflare dry-run build. Maxfiy qiymatlar va foydalanuvchi fayllari Git/release ichiga kirmaydi.

- 2026-09-18: OPENAI_API_KEY Cloudflare encrypted Secret sifatida saqlandi. Haqiqiy R2 → Workflow → OpenAI Responses → D1 sinovi muvaffaqiyatli: sun’iy PDFdan TEST-001, 100000 UZS va TEST-C01 to‘g‘ri ajratildi; o‘zbekcha izohlar qaytdi. Sinov fayli va vaqtinchalik yopiq yozuvlar tozalandi. Bu matnli PDF sinovi; skanerlangan rasmlarning OCR sifati alohida baholanadi.

## Hali yakunlanmagan

- Birinchi production hisobini yaratish uchun foydalanuvchi roziligi kutilmoqda.
- Nameserver o‘zgarishi saqlangan, lekin tashqi DNS/HTTPS tarqalishi tekshiruv paytida tugamagan. Cloudflare zone pending.
- Ochiq ro‘yxatdan o‘tish, email tasdiqlash, parolni email bilan tiklash yo‘q; hisob administrator orqali ochiladi.
- Eski lokal hujjatlar serverga ko‘chirilmagan. Zaxiradan kerakli hisobga import qilinadi.
- D1 ish joyi 1 MiB, fayl 25 MiB bilan cheklangan. D1/R2 zaxiradan to‘liq tiklash productionda sinovdan o‘tmagan.

Bu pilot reliz; yuqoridagi ochiq qismlar bajarilmaguncha to‘liq ommaviy ishga tushirish tugallangan deb hisoblanmaydi.
