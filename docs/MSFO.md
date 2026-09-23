# MSFO redaktori

PDF yoki Word (.docx) hujjatini, yoki nusxa olingan matnni AI yordamida MSFO (IFRS) shakliga o‘tkazish, Word’ga o‘xshash redaktorda tahrirlash va .docx qilib yuklab olish.

## Oqim
1. `#msfo` → «Yangi hujjat»: tur (Moliyaviy hisobot / Matnli hujjat), manba (PDF, .docx yoki joylashtirilgan matn); nom, kompaniya, til va ko‘rsatma «Qo‘shimcha sozlamalar» ichida; «AI tahliliga ruxsat» (standart yoqilgan, O‘zbekistondan tashqaridagi server haqida ogohlantirish), kompaniya, natija tili, qo‘shimcha ko‘rsatma.
2. `.docx` brauzerda o‘qiladi (`src/msfo/docx.mjs`, `fflate`): sarlavhalar, qalin/kursiv/tagiga chizilgan, tekislash, ro‘yxatlar, jadvallar (colspan/rowspan).
3. `POST /api/msfo` (`action: convert`) → `msfo-service.mjs` → OpenAI Responses API, qat’iy JSON sxema: `title, summary, documentHtml, changes[{severity, title, detail, standard}], limitations`.
4. Redaktor (`src/msfo/Editor.tsx`): contentEditable sahifa + formatlash paneli, jadval qator/ustun amallari, Word’dan formatli joylashtirish.
5. Tanlangan qismni qayta yozish: `action: rewrite` → oldindan ko‘rish → «Qo‘llash» (Ctrl+Z bilan qaytadi).
6. «Word (.docx)» — `blocksToDocx` (A4, Times New Roman 12, jadval chegaralari, ro‘yxat raqamlari).

## Xavfsizlik
- Redaktorga kiradigan har qanday HTML (docx, joylashtirish, AI javobi) `sanitizeHtml` orqali blok modeliga aylantirilib, qayta escape qilingan HTML sifatida chiqadi — script, atribut, havola, rasm o‘tmaydi.
- Hujjat mazmuni `application/json` fayl sifatida saqlanadi (HTML emas), shuning uchun fayl endpointi hech qachon markup bermaydi.
- Prompt hujjat matnini ishonchsiz ma’lumot deb belgilaydi; raqam o‘ylab topilmaydi, yo‘q qiymat `[ma’lumot kerak: …]`.

## Saqlash
- Ish joyi holatida faqat metama’lumot: `state.msfo[] = {id, title, mode, language, companyId, fileKey, sourceName, instruction, createdAt, updatedAt, converted, counts}` (worker `validateWorkspaceState` tekshiradi).
- Mazmun `{version:1, html, sourceHtml, ai}` — `/api/files/<fileKey>`. Server rejimida fayl kalitlari o‘zgarmas, shuning uchun har saqlash yangi kalit (2,5 s kutib, avtomatik; Ctrl+S).

## Cloudflare
- Yangi migratsiya yo‘q. Kunlik limit `login_limits` jadvalidagi `msfo:<account>:<kun>` bucket bilan; `AI_MAX_DAILY_MSFO` (standart 60).
- `OPENAI_API_KEY` va `OPENAI_MODEL` mavjud sozlamalardan olinadi. So‘rov sinxron (1–3 daqiqa), timeout 280 s.

## Fon rejimi va PDF (2026-09-23)
- `POST /api/msfo` (`action: convert`) OpenAI Responses API'ga `background: true, store: true` bilan yuboradi va darhol `{job:{id}}` qaytaradi; brauzer `GET /api/msfo/jobs/:id` ni har 3 soniyada so‘raydi. Natija o‘qilgach javob OpenAI'dan `DELETE` qilinadi.
- Job id hisobga bog‘lanadi: `login_limits` jadvalida `sha256("msfojob:<account>:<id>")` qatori (24 soat). Migratsiya kerak emas.
- PDF manba: brauzer faylni saqlaydi (`sourceFileKey`), o‘tkazishda base64 qilib yuboradi (15 MBgacha); model uni `input_file` sifatida o‘qiydi (skanlar ham). «Asl hujjat» yorlig‘ida PDF iframe’da ko‘rinadi.
- Sahifa yopilsa ham topshiriq serverda davom etadi; `item.job` saqlanadi va hujjat qayta ochilganda so‘rash davom etadi.
- `aiAuto` = AI roziligi: o‘chirilsa avtomatik tekshiruv va MSFO o‘tkazish ishlamaydi.
