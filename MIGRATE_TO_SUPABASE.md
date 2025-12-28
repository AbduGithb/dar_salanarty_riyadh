# ترحيل المشروع إلى Supabase — خطوات سريعة

ملخص الخطوات التي سأقوم بها أو يمكنك اتباعها يدويًا:

1. إعداد مشروع Supabase
   - أنشئ مشروعًا جديدًا على https://app.supabase.com
   - احفظ `SUPABASE_URL` و `SUPABASE_KEY` (Service Role Key أو Admin key فقط للاختبار)

2. إنشاء الجداول في Postgres (في SQL Editor في Supabase)

```sql
-- members
CREATE TABLE members (
  id BIGSERIAL PRIMARY KEY,
  firestore_id TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  membership_number TEXT,
  join_year INTEGER,
  total_paid NUMERIC,
  total_unpaid NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  raw JSONB
);

-- subscriptions
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  firestore_id TEXT UNIQUE,
  member_firestore_id TEXT,
  year INTEGER,
  type TEXT,
  amount NUMERIC,
  paid_amount NUMERIC,
  paid BOOLEAN,
  settlement BOOLEAN,
  payment_date TIMESTAMP WITH TIME ZONE,
  last_payment JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  raw JSONB
);

-- payments
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  firestore_id TEXT UNIQUE,
  member_firestore_id TEXT,
  amount NUMERIC,
  date TIMESTAMP WITH TIME ZONE,
  payment_date DATE,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  raw JSONB
);
```

3. تصدير البيانات من Firestore
   - احصل على ملف Service Account JSON من Firebase
   - ضعه في مشروعك (مثلاً `serviceAccountKey.json`)
   - قم بتشغيل:
     - `npm i firebase-admin dotenv` (مرة واحدة)
     - `node scripts/export_firestore.js`
   - سيخرج الملفات إلى `data/members.json`, `data/subscriptions.json`, `data/payments.json`

4. استيراد البيانات إلى Supabase
   - ضع `SUPABASE_URL` و `SUPABASE_KEY` في `.env`
   - ثبت المكتبة: `npm i @supabase/supabase-js dotenv`
   - شغّل: `node scripts/import_to_supabase.js`

5. تحقق من البيانات في لوحة Supabase
   - افتح جدول `members` و `subscriptions` و `payments` وتأكد من القيم

6. عدّل الواجهات (اختياري)
   - استبدل استدعاءات Firebase بـ Supabase JS حيثما يلزم (سأقدّم تعليمات/PR إذا رغبت)

---

إذا موافق، أبدأ الآن: 1) أنشئ سكربت التصدير والتنفيذ (قمت به)، 2) أقدّم لك SQL لإنشاء الجداول (أضفته هنا)، 3) أهيئ سكربت الاستيراد (قمت به أيضاً). أخبرني إن تريدني أن أنشئ PR لتعديل الشيفرة لاستخدام Supabase مباشرة.