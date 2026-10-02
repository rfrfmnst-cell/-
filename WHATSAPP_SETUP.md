# ربط واتساب انطلاقة مع Meta Cloud API

هذا التكامل مصمم للعمل مع مسار Meta الرسمي لربط WhatsApp Business Platform. لا تضع أي أسرار داخل GitHub.

## متغيرات البيئة المطلوبة على الخادم

- `WHATSAPP_ACCESS_TOKEN` — رمز وصول دائم من Meta.
- `WHATSAPP_PHONE_NUMBER_ID` — Phone Number ID للرقم المرتبط بانطلاقة.
- `WHATSAPP_VERIFY_TOKEN` — قيمة سرية تختارها لتأكيد الـWebhook.
- `META_APP_SECRET` — App Secret للتحقق من توقيع Webhook.
- `META_GRAPH_API_VERSION` — إصدار Graph API الذي يظهر في إعدادات تطبيق Meta.

## عنوان Webhook

بعد نشر هذه النسخة على النطاق:

`https://antlaqh.com/api/whatsapp/webhook`

استخدم نفس قيمة `WHATSAPP_VERIFY_TOKEN` في إعداد Meta.

## الوظائف المجهزة

- استقبال تحقق Webhook من Meta.
- التحقق من توقيع `X-Hub-Signature-256` عند ضبط `META_APP_SECRET`.
- حفظ أحداث الرسائل وحالات التسليم في مجلد بيانات الخادم.
- إرسال رسالة تأكيد واتساب عند إنشاء عقد.
- إرسال رسالة تأكيد عند إنشاء طلب موقع.
- إرسال رسالة تأكيد عند إنشاء طلب منتج رقمي.
- إظهار حالة تفعيل واتساب في `/api/health`.

## أمان الرقم الموثق

هذا الكود لا يحذف رقم WhatsApp Business ولا ينقل الرقم ولا يغير حالة Meta Verified. الربط الفعلي للرقم يتم من حساب Meta عبر المسار الرسمي المناسب للرقم الحالي.
