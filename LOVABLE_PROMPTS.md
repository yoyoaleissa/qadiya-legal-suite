# Lovable Prompts for Qadiya OS

These are ready-to-paste prompts for Lovable to implement features that require Lovable-side configuration (environment variables, Supabase schema changes, or Lovable Cloud functions).

---

## PROMPT 1: Create Task Form (Quick Task)

```
Add a "Create Task" dialog/modal to the Tasks page. When the user clicks the "Create Task" button at the top of the page, open a modal with the following fields:

- Title (required, text input)
- Title Arabic (optional, text input with font-arabic class)
- Description (optional, textarea)
- Priority (select: high/medium/low, default medium)
- Status (select: open/in_progress/done, default open)
- Due Date (date picker, optional)
- Assigned To (select dropdown populated from profiles table)
- Related Case (select dropdown populated from cases table, optional)

On submit, insert into the `tasks` table via a new server function `createTask` in `src/lib/tasks.functions.ts`. After successful insert, invalidate the "tasks" query so the list refreshes immediately.

The modal should be bilingual (use the tt() pattern from the existing code). Close the modal on successful submit.
```

---

## PROMPT 2: Create Client Form

```
Add a "New Client" dialog/modal to the Clients page. Add a button at the top right of the page header (next to the search input). When clicked, open a modal with:

- Name (required, text)
- Name Arabic (optional, text with font-arabic)
- Email (optional, email input)
- Phone (optional, tel input)
- Civil ID (optional, text — this is the Kuwait civil ID number)
- Notes (optional, textarea)

On submit, insert into the `clients` table via a new server function `createClient` in `src/lib/clients.functions.ts`. Invalidate "clients" query on success.

Bilingual labels using the tt() pattern.
```

---

## PROMPT 3: Create Case Form

```
Add a "New Case" dialog/modal accessible from the Client detail view. When viewing a client's details (the dialog that opens when you click a client), add a "New Case" button.

Fields:
- Case Number (required, text — this is the MOJ auto number)
- Title (required, text)
- Title Arabic (optional, text)
- Court (optional, text)
- Case Type (optional, text)
- Status (select: active/appeal/execution/closed, default active)
- Filed Date (date picker, optional)

On submit, insert into the `cases` table with the client_id pre-filled. Also create a `court_levels` entry with level='first_instance'. Invalidate queries on success.
```

---

## PROMPT 4: Billing Module Schema & UI

```
The Billing page currently shows an empty state. Please implement a full billing module:

1. Create a new Supabase migration with these tables:

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  case_id UUID REFERENCES cases(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  currency TEXT DEFAULT 'KWD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  description TEXT,
  description_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  user_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  rate DECIMAL(8,3) DEFAULT 50.000,
  description TEXT,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

2. Create server functions in `src/lib/billing.functions.ts`:
   - listInvoices() — returns all invoices with client name
   - createInvoice(data) — inserts a new invoice
   - updateInvoiceStatus(id, status) — updates status

3. Update the Billing route (`src/routes/_authenticated/billing.tsx`) to show:
   - Summary cards: Total Outstanding, Total Paid This Month, Overdue Count
   - Invoice list with status badges (color-coded)
   - "Create Invoice" button that opens a modal
   - Click an invoice to see details

All bilingual with tt() pattern. Currency is KWD (Kuwaiti Dinar, 3 decimal places).
```

---

## PROMPT 5: Add Hearing from Dashboard (Google Calendar Link)

```
In the Calendar page, add an "Add to Google Calendar" button next to each hearing event. When clicked, open a new tab with a Google Calendar event creation URL pre-filled with:

- Title: The hearing title (e.g., "جلسة — قضية #222486500")
- Date/Time: The hearing date, default 9:00 AM to 10:00 AM Kuwait time (Asia/Kuwait)
- Location: The court name from the hearing data
- Description: Case number and any available details

The Google Calendar URL format is:
https://calendar.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start}/{end}&details={description}&location={location}

Dates should be in format: 20260715T090000/20260715T100000

Also add a similar "Add to Google Calendar" link on the Dashboard's upcoming hearings list items (as a small calendar icon button on the right side of each row).
```

---

## PROMPT 6: Telegram Bot Environment Variables

```
Add the following environment variables to the Lovable Cloud project settings (Settings → Environment Variables):

- TELEGRAM_BOT_TOKEN: The Telegram bot token from @BotFather (for the Qadiya bot service)
- SUPABASE_SERVICE_KEY: The Supabase service_role key (needed by the bot to write data)

These are used by the /bot directory which runs as a separate Node.js process. The bot syncs scraped MOJ data into the same Supabase database that the dashboard reads from.

Note: These do NOT need to be added to the Vite/frontend config. They are only used by the bot service.
```

---

## PROMPT 7: Daily Briefing Server Function

```
Create a new server function `getDailyBriefing` in `src/lib/report.functions.ts` that generates a daily summary for a lawyer. It should:

1. Query today's hearings from the `hearings` table
2. Query tasks due today or overdue from `tasks`
3. Query any deadlines within the next 7 days (appeal deadlines = judgment_date + 30 days)
4. Return a structured object:
   {
     todayHearings: [...],
     dueTasks: [...],
     upcomingDeadlines: [...],
     urgentCount: number,
     summary_ar: string,
     summary_en: string
   }

5. Add a "Daily Briefing" card to the Dashboard that shows this data in a collapsible section at the top, with a "Good morning" greeting and the key numbers.

The briefing should be personalized based on the user's assigned tasks and cases.
```

---

## PROMPT 8: Workflow Templates (Task Chains)

```
Add a "Workflow Templates" feature to the Tasks page. Add a dropdown button next to "Create Task" that says "From Template" / "من قالب".

When clicked, show a list of predefined workflow templates:

1. "New Case Intake" / "استلام قضية جديدة" — creates 5 tasks:
   - Review case documents (high priority, due +1 day)
   - Register power of attorney (medium, due +2 days)
   - File initial pleading (high, due +5 days)
   - Notify client of filing (low, due +6 days)
   - Set calendar reminder for first hearing (medium, due +7 days)

2. "Appeal Preparation" / "تحضير استئناف" — creates 4 tasks:
   - Review first instance judgment (high, due +1 day)
   - Draft appeal memo (high, due +7 days)
   - File appeal with court (high, due +14 days)
   - Notify client of appeal status (medium, due +15 days)

3. "Execution Follow-up" / "متابعة تنفيذ" — creates 3 tasks:
   - File execution request (high, due +1 day)
   - Follow up with execution department (medium, due +7 days)
   - Report execution status to client (low, due +14 days)

When a template is selected, insert all tasks into the `tasks` table with due dates calculated from today. All tasks should be linked to a case (show a case selector before creating).
```

---

## PROMPT 9: Mobile Bottom Navigation

```
Add a mobile bottom navigation bar (visible only on screens smaller than md breakpoint) as an alternative to the hamburger menu. Show the 5 most important nav items as icons with labels:

1. Dashboard (LayoutDashboard icon)
2. Cases (Users icon)
3. Calendar (Calendar icon)
4. Tasks (CheckSquare icon)
5. Bot (Bot icon)

Style it as a fixed bottom bar with a white/dark background, border-top, and the active item highlighted with the gold color. This is in addition to the hamburger menu (which still works for accessing all pages including Billing, Documents, AI Assistant).

The bottom nav should disappear when scrolling down and reappear when scrolling up (like modern mobile apps).
```

---

## PROMPT 10: RAG-Powered AI Assistant Enhancement

```
Enhance the AI Assistant to use RAG (Retrieval Augmented Generation) with Kuwait legal knowledge. 

1. Create a new Supabase table for the knowledge base:

CREATE TABLE legal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  category TEXT CHECK (category IN ('law','precedent','procedure','template')),
  source TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON legal_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

2. Create a Supabase Edge Function that:
   - Takes a user question
   - Generates an embedding using OpenAI
   - Queries the legal_knowledge table for the 5 most similar documents
   - Passes those documents as context to the AI model
   - Returns a grounded answer with citations

3. Update the AI Assistant route to call this edge function instead of the direct Gemini call.

4. Add a "Knowledge Base" admin section (accessible only to partner role) where they can:
   - Upload legal documents (PDF/text)
   - View/delete entries in the knowledge base
   - See the total document count

This makes the AI Assistant actually useful for Kuwaiti law questions because it can reference real legal texts.
```
