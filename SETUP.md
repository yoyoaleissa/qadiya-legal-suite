# Setup Instructions for Yousef

This commit adds: Billing module, Create Task/Client/Case forms, Google Calendar links, Workflow Templates, and the Telegram Bot integration.

## Step 1: Run the Database Migration

Go to your Supabase Dashboard → SQL Editor → paste and run the contents of:

```
supabase/migrations/20260714000001_billing_tables.sql
```

This creates 3 new tables: `invoices`, `time_entries`, `workflow_templates`.

## Step 2: Seed Workflow Templates (Optional)

After running the migration, paste this in the SQL Editor to get starter workflow templates:

```sql
INSERT INTO workflow_templates (name, name_ar, description, description_ar, steps) VALUES
('New Civil Case', 'قضية مدنية جديدة', 'Standard workflow for filing a new civil case', 'سير عمل قياسي لرفع قضية مدنية جديدة', '[
  {"title": "Review client documents", "title_ar": "مراجعة مستندات الموكّل", "priority": "high", "days_offset": 0},
  {"title": "Draft statement of claim", "title_ar": "صياغة صحيفة الدعوى", "priority": "high", "days_offset": 3},
  {"title": "File case at court", "title_ar": "إيداع الدعوى بالمحكمة", "priority": "high", "days_offset": 7},
  {"title": "Serve defendant", "title_ar": "إعلان المدعى عليه", "priority": "medium", "days_offset": 10},
  {"title": "Prepare for first hearing", "title_ar": "التحضير للجلسة الأولى", "priority": "medium", "days_offset": 20}
]'::jsonb),
('Appeal Judgment', 'استئناف حكم', 'Workflow for filing an appeal within the 30-day window', 'سير عمل لتقديم استئناف خلال 30 يوماً', '[
  {"title": "Analyze judgment for appeal grounds", "title_ar": "تحليل الحكم لأسباب الاستئناف", "priority": "high", "days_offset": 0},
  {"title": "Draft appeal memorandum", "title_ar": "صياغة مذكرة الاستئناف", "priority": "high", "days_offset": 7},
  {"title": "Client review and approval", "title_ar": "مراجعة وموافقة الموكّل", "priority": "medium", "days_offset": 14},
  {"title": "File appeal at court", "title_ar": "إيداع الاستئناف بالمحكمة", "priority": "high", "days_offset": 21},
  {"title": "Prepare appeal hearing brief", "title_ar": "تحضير مذكرة جلسة الاستئناف", "priority": "medium", "days_offset": 25}
]'::jsonb),
('Execution Proceedings', 'إجراءات تنفيذ', 'Workflow for enforcing a court judgment', 'سير عمل لتنفيذ حكم قضائي', '[
  {"title": "Obtain certified judgment copy", "title_ar": "الحصول على نسخة حكم مصدّقة", "priority": "high", "days_offset": 0},
  {"title": "File execution request", "title_ar": "تقديم طلب التنفيذ", "priority": "high", "days_offset": 3},
  {"title": "Serve execution notice to debtor", "title_ar": "إعلان المدين بالتنفيذ", "priority": "medium", "days_offset": 7},
  {"title": "Follow up with execution department", "title_ar": "متابعة إدارة التنفيذ", "priority": "medium", "days_offset": 14},
  {"title": "Report execution status to client", "title_ar": "إبلاغ الموكّل بحالة التنفيذ", "priority": "low", "days_offset": 21}
]'::jsonb);
```

## Step 3: Bot Environment Variables (Only if deploying the Telegram bot)

The bot lives in `/bot` and runs separately from the web app. To deploy it:

1. Copy `bot/.env.example` to `bot/.env`
2. Fill in:
   - `TELEGRAM_BOT_TOKEN` — from @BotFather
   - `OPENAI_API_KEY` — for CAPTCHA solving and AI summaries
   - `SUPABASE_URL` — already in your project: `https://lhxmapuuozlsibwwncsg.supabase.co`
   - `SUPABASE_SERVICE_KEY` — from Supabase Dashboard → Settings → API → service_role key

3. Run: `cd bot && npm install && node index.js`

The bot will scrape MOJ data and automatically sync it into the same Supabase database the dashboard reads from.

## What's New in This Commit

| Feature | File(s) |
|---------|---------|
| Billing module (invoices, status, summary) | `billing.tsx`, `billing.functions.ts`, migration |
| Create Task dialog + status change buttons | `tasks.tsx`, `tasks.functions.ts` |
| Workflow Templates (run pre-built task chains) | `tasks.tsx`, `tasks.functions.ts`, migration |
| Create Client dialog | `clients.tsx`, `cases.functions.ts` |
| Google Calendar links on all events | `calendar.tsx`, `google-calendar.ts` |
| Google Calendar links on task deadlines | `tasks.tsx` |
| Telegram Bot with MOJ scraper + Supabase sync | `/bot/*` |

## That's it. Pull the commit in Lovable, run the migration, and everything works.
