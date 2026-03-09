# خلاصه اجرایی پروژه CRM (FA)

## هدف
این پروژه یک CRM عملیاتی برای شرکت بازرگانی مواد اولیه غذایی است تا کل مسیر فروش از سرنخ تا قرارداد را پوشش دهد.

## خروجی‌های اصلی
- احراز هویت و نقش‌ها (`admin` / `commercial` / `standard_user`)
- CRUD کامل برای `Contacts`، `Companies`، `Leads`، `Tasks` و `Products`
- تعریف نقش شرکت‌ها (`supplier`، `customer`، `both`)
- اتصال محصول به شرکت در دو دسته:
  - معامله‌شده (`traded`)
  - پتانسیل (`potential`)
- پایپ‌لاین فروش ۷ مرحله‌ای با جابه‌جایی سریع و تاریخچه مرحله
- فیلترهای چندمعیاره روی Leads/Tasks/Contacts/Companies/Products
- داشبورد KPI با بازه‌های ۷/۳۰/۹۰ روز + Funnel + Leaderboard + Stage aging
- تقویم ماهانه تسک‌ها + اعلان مهلت (تاخیر و نزدیک‌به‌موعد)
- اتوماسیون ایمیل:
  - ارسال دستی
  - ارسال تست
  - Follow-up خودکار 72h
  - Reminder خودکار برای تسک‌ها
- تحلیل ایمیل:
  - open/click count
  - open/click rate
  - ثبت timestamp باز شدن و کلیک
- جلوگیری از ارسال تکراری jobها با قفل idempotent در دیتابیس

## APIهای مهم
- `GET /api/leads` با فیلترهای کامل
- `GET /api/tasks` با فیلترهای کامل
- `GET /api/products` با فیلترهای `q/category/is_active/relation_type`
- `GET /api/dashboard?range=7d|30d|90d`
- `POST /api/jobs/followup?dry_run=true`
- `POST /api/jobs/task-reminders?dry_run=true`
- `POST /api/webhooks/brevo`

## تحویل فنی
- CI با GitHub Actions (`lint + build`)
- اسکریپت seed دمو: `npm run seed:demo`
- تست خودکار E2E با Playwright: `npm run test:e2e` (پاس)
- گزارش کامل FR: `docs/rapport-projet-fr.md`
- چک‌لیست دفاع: `docs/checklist-demo.md`

## مسیر دمو پیشنهادی (8 تا 10 دقیقه)
1. ورود به سیستم
2. ساخت شرکت، مخاطب و اتصال محصول
3. ساخت lead و جابه‌جایی مرحله در pipeline
4. ساخت task، نمایش در تقویم، تغییر وضعیت
5. ارسال ایمیل تست
6. اجرای follow-up به صورت dry-run و سپس اجرای واقعی
7. اجرای task reminders به صورت dry-run
8. نمایش KPIها، Funnel، Leaderboard و نرخ open/click

## محدودیت فعلی و گام بعدی
- خروجی PDF/CSV هنوز بومی‌سازی نشده
- اعلان real-time داخل خود اپ هنوز اضافه نشده
- گام بعدی: گزارش‌گیری پیشرفته، اتصال BI، و Docker به عنوان bonus
