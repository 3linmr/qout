# Qout Bufia

موقع مطعم مع منيو تفاعلي، سلة، وجدولة استلام. الواجهة ثابتة، والطلبات تحفظ في Supabase عبر Vercel Functions.

## المتطلبات
- حساب Supabase
- حساب Vercel

## إعداد قاعدة البيانات (Supabase)
1) افتح SQL Editor في Supabase.
2) شغّل ملف `supabase/schema.sql` لإنشاء الجداول.
3) شغّل ملف `supabase/seed.sql` لتعبئة المنيو.

## متغيرات البيئة (Vercel)
اضف المتغيرات التالية في مشروع Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## تشغيل محلي (اختياري)
- ثبّت الاعتماديات: `npm install`
- شغّل: `npx vercel dev`

## النشر على Vercel
- اربط الريبو مع Vercel.
- تأكد من إضافة متغيرات البيئة.
- انشر المشروع.

