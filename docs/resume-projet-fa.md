# خلاصه اجرایی پروژه CRM (FA)

## هدف
این پروژه یک CRM عملیاتی برای شرکت بازرگانی مواد اولیه غذایی است تا کل مسیر فروش از سرنخ تا قرارداد را پوشش دهد.

## خروجی‌های اصلی
- احراز هویت و نقش‌ها (admin / commercial / standard_user)
- CRUD کامل برای Contacts، Companies، Leads، Tasks با قابلیت Edit
- پایپ‌لاین فروش ۷ مرحله‌ای با جابه‌جایی سریع و تاریخچه مرحله
- داشبورد KPI با بازه‌های ۷/۳۰/۹۰ روز
- Funnel و نرخ تبدیل بین مراحل
- اتوماسیون ایمیل (ارسال دستی، ارسال تست، follow-up 72h)
- جلوگیری از ارسال تکراری follow-up با قفل idempotent در دیتابیس
- لاگ کامل ایمیل شامل status، error و provider_message_id

## APIهای مهم
- `GET /api/leads` با فیلترهای کامل
- `GET /api/tasks` با فیلترهای کامل
- `GET /api/dashboard?range=7d|30d|90d`
- `POST /api/jobs/followup?dry_run=true`

## تحویل فنی
- CI با GitHub Actions (`lint + build`)
- اسکریپت seed دمو: `npm run seed:demo`
- گزارش کامل FR: `docs/rapport-projet-fr.md`
- چک‌لیست دفاع: `docs/checklist-demo.md`

## مسیر دمو پیشنهادی
1. ورود به سیستم
2. ساخت شرکت و مخاطب
3. ساخت lead و تغییر مرحله
4. ساخت task و تغییر وضعیت
5. ارسال ایمیل تست
6. اجرای follow-up dry-run و اجرای واقعی
7. نمایش KPI و Funnel در داشبورد

## محدودیت فعلی و گام بعدی
- خروجی PDF/CSV و نوتیفیکیشن real-time هنوز پیاده نشده
- در نسخه بعدی: تست E2E و بهبود گزارش‌گیری