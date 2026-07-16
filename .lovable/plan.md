# Qadiya OS — Site Review & Improvement Plan

Here's an honest walkthrough of what's strong, what's missing, and what would move the product from "impressive demo" to "daily-driver for a Kuwaiti law firm."

## What's already strong
- Bilingual AR/RTL + EN, dark/light, mobile bottom nav, PWA manifest.
- Real backend (Cloud) with RLS hardened, roles model, admin gating.
- Case reports, AI assistant, court map links, deadline calculator, Telegram bot pipeline, seeded demo data.

## What's missing / weak (prioritized)

### 1. Notifications & alerts (biggest gap)
No push, no email, no in-app notification center. A legal app lives or dies on deadline alerts.
- In-app **Notification Center** (bell icon in header) — unread count, grouped by type (deadline, hearing tomorrow, new judgment, invoice overdue, task assigned).
- **Email digests** (daily morning briefing + judgment alerts) via Resend.
- **Web Push** (PWA is set up but no `serviceWorker.js` or push subscription yet).
- **WhatsApp/Telegram** reminder hook for the client portal.

### 2. Client Portal is thin
`/portal` exists but clients can't really *do* anything.
- Client login (magic link, phone OTP via Cloud auth).
- "My cases" view with status, next hearing, latest judgment, deadline countdown.
- Document sharing (client can view/download files their lawyer released).
- Invoice view + "Pay now" (Stripe/Paddle/KNET link).
- Secure chat thread per case (already have `client_messages` table — surface it).

### 3. Documents module is a stub
`documents.tsx` exists but there's no real storage, versioning, or templates in use.
- Wire Cloud Storage bucket for case files (PDF, DOCX, images).
- Drag-drop upload, preview, per-case folder view.
- **Document templates** (already have `document-templates.ts`) → one-click generate memo/POA/appeal draft with case merge fields, download as .docx.
- OCR + AR/EN full-text search on uploaded PDFs.

### 4. Billing depth
Current billing is a list. Missing:
- **Trust/escrow account** tracking (KWD deposits, drawdowns, statements) — required for Kuwait Bar compliance.
- Recurring retainers, partial payments, credit notes.
- KNET/Stripe payment link on each invoice.
- Aged receivables report + one-click reminder email in Arabic.
- Time-entry timer widget (start/stop button, not just manual entry).

### 5. Court intelligence (the differentiator)
This is where Qadiya could actually beat competitors.
- **Auto-refresh case status** from MOJ portal on a schedule (bot already scrapes — surface a "Last synced X min ago" + "Refresh now" per case).
- **Judgment archive search** (RAG over `legal_knowledge` + past judgments already in DB — already have `embeddings.server.ts`, needs a proper UI beyond the AI assistant).
- **Appeal-window calculator** front and center on any case with a judgment (component exists — put it on the case detail hero, not just below).
- **Conflict-of-interest check** when adding a new client (name/civil-ID match against existing opposing parties).

### 6. Team & collaboration
- Assignee avatars on tasks/cases, @mentions in comments.
- Case comments/notes thread (internal only).
- Activity feed per case (who did what, when).
- Delegation & workload view for partners ("Ahmed has 23 open tasks, 4 overdue").

### 7. Dashboard is informational, not actionable
- Add **"Focus today"** section: top 3 things this user must do today (overdue + due-today combined, sorted).
- Add **KPIs for partners**: revenue MTD, WIP hours unbilled, collections rate, win rate.
- Replace static cards with sparklines/trend arrows.

### 8. Search
`GlobalSearch` is present but likely keyword-only. Add:
- Semantic search across cases, judgments, uploaded docs (embeddings already wired).
- Filter chips (status, court level, date range, client).
- Recent + saved searches.

### 9. Reporting & exports
- Firm-wide analytics page (cases by status, revenue, hearings per month, avg case duration).
- Export to Excel/PDF on every list view.
- Scheduled monthly firm report emailed to partner.

### 10. Polish gaps
- No **onboarding flow** for a fresh account beyond `DemoTour` — needs a "Create your first client → case → task" wizard.
- **Empty states** are inconsistent (some pages just show blank tables).
- **Loading skeletons** on data-heavy pages (dashboard flashes).
- **Keyboard shortcuts** panel (`?` to open) — only ⌘K exists.
- **Audit log** (who viewed/edited what) — required for legal compliance.
- **Backup/export all data** button in Settings.
- **Settings page doesn't exist** — no way to edit firm name, logo, letterhead, VAT number, invoice numbering, working hours, holidays (Kuwait calendar).

### 11. SEO / marketing surface
The published app has no public marketing page — `/` is the auth-gated dashboard. If Qadiya is meant to be sold:
- Public landing page at `/` with product story, screenshots, pricing, Arabic-first copy.
- Move current dashboard to `/app`.

## Recommended sequencing

**Phase 1 (foundational, ~1 week each):**
1. Notification Center + email digests
2. Settings page (firm profile, holidays, invoice config)
3. Documents storage + templates end-to-end

**Phase 2 (differentiation):**
4. Client Portal build-out + secure chat + pay online
5. Trust account + KNET payments
6. MOJ auto-refresh surfaced in UI + conflict check

**Phase 3 (scale):**
7. Team collaboration (comments, mentions, activity)
8. Analytics dashboard + scheduled reports
9. Public landing page + audit log

## Ask before I build

Rather than guess, three questions to steer this:

1. **Who's the buyer?** Solo lawyer, mid-size firm (5–20 lawyers), or in-house counsel? Priorities differ sharply.
2. **What's the #1 pain** you want fixed next — missed deadlines, unpaid invoices, client communication, or MOJ data freshness?
3. **Do you want a public marketing site** at `/`, or should the app stay auth-gated?

Answer those and I'll turn the top 2–3 items into a concrete build plan.
