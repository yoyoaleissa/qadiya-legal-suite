# Qadiya Telegram Bot — Deployment & Environment

The bot in this `/bot` directory is a **standalone Node.js process**. It is
**not** part of the web app build, **not** a Lovable Cloud function, and it is
never bundled or deployed with the dashboard. It runs wherever you choose to
host a long-running Node process (a VPS, a container, Railway/Render/Fly, a
home server with `pm2`, etc.).

Because of that, its environment variables belong in a **`bot/.env` file on the
bot's host** — not in the web app's runtime secrets.

## Authentication model

The bot **signs in as a regular user account** with the `bot` role, and writes
through row-level security policies scoped to that role. **No service-role
key is used or required.** This is safer than shipping a service-role key to
an external host: if the bot host is ever compromised, the attacker only gets
the bot's write access to `cases` / `hearings` / `judgments`, not full
database admin.

## Required environment variables

Copy `bot/.env.example` to `bot/.env` and fill in the values below.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `TELEGRAM_BOT_TOKEN` | ✅ | [@BotFather](https://t.me/BotFather) → `/newbot` (or `/token` for an existing bot) | The bot won't start without it. |
| `OPENAI_API_KEY` | ✅ | Your OpenAI (or OpenAI-compatible) provider dashboard | Used for CAPTCHA solving and AI case summaries. |
| `OPENAI_API_BASE` | optional | — | Defaults to `https://api.openai.com/v1`. Set only if using an OpenAI-compatible provider. |
| `SUPABASE_URL` | ✅ | Pre-filled | `https://lhxmapuuozlsibwwncsg.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Pre-filled in `.env.example` | The public anon key. Safe to embed. |
| `BOT_EMAIL` | ✅ | You choose | Email of the dedicated bot user account (see setup below). |
| `BOT_PASSWORD` | ✅ | You choose | Password for that account. Store only in `bot/.env`. |

## One-time bot account setup

Do this once, before the first deployment:

### 1. Create the bot user

Sign the bot user up through the dashboard sign-up page (`/login` → *Create
account*) using the email/password you plan to put in `BOT_EMAIL` /
`BOT_PASSWORD`. Any admin can also create it from the Users tab in the
backend console.

### 2. Grant the `bot` role

From the backend SQL editor (or ask an admin of the dashboard to run this),
insert the role row for that account:

```sql
insert into public.user_roles (user_id, role)
select id, 'bot'::app_role
from auth.users
where email = 'bot@your-firm.com';
```

The `bot` role is defined in the `app_role` enum and is granted INSERT and
UPDATE on `cases`, `hearings`, and `judgments` via RLS policies added in the
migration `Bot RLS policies`.

### 3. Fill in `bot/.env`

```
BOT_EMAIL=bot@your-firm.com
BOT_PASSWORD=<the password you set>
```

## Run the bot

```bash
cd bot
cp .env.example .env      # then edit .env with the values above
npm install
node index.js             # or: pm2 start index.js --name qadiya-bot
```

## Verify

- Startup logs should show `Telegram Token: Configured` and
  `Qadiya Telegram Bot polling active`.
- Send a 9-digit case number to the bot in Telegram; it should reply with a
  PDF and the case should appear in the dashboard shortly after.
- If sync fails silently, check for `Bot sign-in failed` in the logs — that
  means `BOT_EMAIL` / `BOT_PASSWORD` don't match a real account, or the
  account is missing the `bot` role.

## Security reminder

`bot/.env` contains four secrets (`TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`,
`BOT_EMAIL`, `BOT_PASSWORD`). Ensure it is git-ignored and readable only by
the bot process user. If the bot password ever leaks, sign in to the
dashboard as an admin, reset that user's password, and update `bot/.env`.
