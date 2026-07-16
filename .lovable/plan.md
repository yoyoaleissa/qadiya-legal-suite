
# Firm Scoping (Multi-Tenancy)

Right now every staff user can read every other firm's data — the RLS policies check `is_staff(auth.uid())` with no firm filter. This plan fixes that and sets up the login/signup flow so each law office is its own tenant.

## Decisions I'm defaulting to (say the word to change any)

- **Login stays email + password.** No firm code on the login screen. The firm is looked up from the user's profile.
- **First user of a new firm creates the firm** during signup and becomes its `admin` + `partner`. Everyone else joins by invitation email.
- **One firm per user.** A user cannot belong to two firms at once (rare in practice, and it doubles the complexity of every policy). We can revisit later.
- **No firm number shown in the UI** for now. Internally each firm has a UUID; we can expose a human-readable "Firm ID" later if useful for support.

## What changes in the database

### 1. New `firms` table
`name_en`, `name_ar`, `slug` (unique, e.g. `al-jaber-partners`), `created_by`, timestamps. Owned by the first user; readable by all its members.

### 2. New `firm_invitations` table
`firm_id`, `email`, `role`, `token`, `expires_at`, `accepted_at`. Partners/admins create invites; anyone with the token can accept.

### 3. `profiles.firm_id` — the single source of truth for "who belongs where"
Every user has exactly one `firm_id`. Signup creates a firm; invitation acceptance sets `firm_id` to the inviting firm.

### 4. `firm_id` added to every business table
`cases`, `clients`, `hearings`, `judgments`, `tasks`, `invoices`, `trust_ledger`, `time_entries`, `case_documents`, `case_notes`, `case_timeline`, `case_reports`, `client_messages`, `court_levels`, `execution_procedures`, `execution_receipts`, `generated_reports`, `workflow_templates`, `firm_settings`, `audit_log`, `legal_knowledge` (stays firm-agnostic — shared reference data), `client_messages`.

`firm_id` is NOT NULL, indexed, and defaulted via a `BEFORE INSERT` trigger that reads `profiles.firm_id` for `auth.uid()` — so existing app code that inserts rows without a `firm_id` keeps working.

### 5. Two new security-definer helpers
- `current_firm_id()` → returns the caller's `profiles.firm_id`
- `belongs_to_firm(_firm_id uuid)` → returns `true` if the caller's firm matches

### 6. RLS rewrite — every business table's policies become:
- `SELECT/UPDATE/DELETE`: `is_staff(auth.uid()) AND belongs_to_firm(firm_id)`
- `INSERT`: `belongs_to_firm(firm_id)` (trigger fills the default)

Existing role-based extras (partner-only trust writes, admin-only audit reads, bot-only case updates) are preserved and *AND*-ed with the firm check.

### 7. Backfill
Any existing rows are assigned to a single "legacy" firm owned by the first admin, so nothing breaks.

## What changes in the app

### Signup flow (`/auth`)
Two paths on the same page:
- **"Start a new firm"** — email, password, firm name (EN + AR). Creates `firms` row, creates `profiles` row with that `firm_id`, grants `admin` + `partner` roles. Lands on `/dashboard`.
- **"I have an invitation"** — email, password, invitation token (prefilled from the URL when they click an invite link). Creates `profiles` row with the inviting firm's `firm_id`, grants the invited role.

### Login stays the same
Email + password. No firm code.

### New `Settings → Team` page
Lists firm members and pending invitations. Partners/admins can:
- Invite a new member (email + role) → generates a token, shows a copyable invite link
- Revoke pending invitations
- Change a member's role
- Remove a member

### App-shell tweak
Show the firm's name (from `firms.name_ar` / `name_en`) in the sidebar header so users always know which firm they're inside.

### `Accept invitation` route (`/invite/$token`)
Public route. Validates the token, then routes to signup with the token prefilled (or, if the user's already signed in with a different firm, shows an error).

## Migration strategy (one DB migration, sequenced)

```text
1. CREATE firms, firm_invitations
2. ALTER profiles ADD firm_id
3. Create a "Legacy Firm" row, assign it to every existing profile
4. ALTER every business table ADD firm_id (nullable at first)
5. Backfill firm_id on every business row from profiles (via created_by/user_id fallback → legacy firm)
6. Add NOT NULL + FK + index on firm_id
7. Add BEFORE INSERT trigger that fills firm_id from profiles when missing
8. DROP old policies, CREATE new firm-scoped policies
9. Add current_firm_id() + belongs_to_firm() helpers
10. GRANT the new tables
```

Wrapped in a single transaction; if anything fails, nothing lands.

## Risk

- The migration is large (~50 policies). Well-tested with backfill, but worth knowing.
- Users signed in *right now* keep their session; on next request the new policies apply. If a firm exists, they see their firm's data. If not (edge case), they see nothing until we run the backfill — which is why backfill is part of the migration itself.
- `client.server` admin operations bypass RLS as always; nothing there changes.

## What I'm NOT doing in this pass

- Cross-firm sharing (a lawyer temporarily working on another firm's case)
- Firm-level billing/subscriptions
- Firm branding (logo per firm in reports) — `firm_settings` already exists, we just scope it
- Subdomain-per-firm (`aljaber.qadiya.app`) — schema will support it later
- SSO / SAML — not requested

## Files that will change

- **New migration** (schema + policies + trigger + backfill)
- **New**: `src/routes/invite.$token.tsx`, `src/routes/_authenticated/settings.team.tsx`, `src/components/InviteMemberDialog.tsx`, `src/lib/firms.functions.ts`, `src/lib/invitations.functions.ts`
- **Edited**: `src/routes/auth.tsx` (add "Start a firm" / "Accept invite" tabs), `src/components/app-shell.tsx` (show firm name), `src/routes/_authenticated/dashboard.tsx` (queries will just work — RLS handles it)

---

Approve and I'll execute end-to-end. If any decision at the top looks wrong (one-firm-per-user, no firm code on login, first-signup-creates-firm), say so and I'll adjust before touching the DB.
