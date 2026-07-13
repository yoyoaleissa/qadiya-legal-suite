# Qadiya Telegram Bot — Deployment & Environment

The bot in this `/bot` directory is a **standalone Node.js process**. It is
**not** part of the web app build, **not** a Supabase Edge Function, and it is
never bundled or deployed with the dashboard. It runs wherever you choose to
host a long-running Node process (a VPS, a container, Railway/Render/Fly, a
home server with `pm2`, etc.).

Because of that, its environment variables belong in a **`bot/.env` file on the
bot's host** — not in the project's runtime/edge-function secrets. Edge-function
secrets are only readable by code running inside Supabase's edge runtime; a
separate Node process cannot read them.

## Required environment variables

Copy `bot/.env.example` to `bot/.env` and fill in the values below.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `TELEGRAM_BOT_TOKEN` | ✅ | [@BotFather](https://t.me/BotFather) → `/newbot` (or `/token` for an existing bot) | The bot won't start without it. |
| `OPENAI_API_KEY` | ✅ | Your OpenAI (or OpenAI-compatible) provider dashboard | Used for CAPTCHA solving and AI case summaries. |
| `OPENAI_API_BASE` | optional | — | Defaults to `https://api.openai.com/v1`. Set only if using an OpenAI-compatible provider. |
| `SUPABASE_URL` | ✅ | Already known for this project | `https://lhxmapuuozlsibwwncsg.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase project → Settings → API → **service_role** key | Server-side secret. Never commit it or expose it to the browser. |

### About `SUPABASE_SERVICE_KEY`

The bot writes to the same database the dashboard reads from (`cases`,
`hearings`, `judgments`, `case_timeline`, etc.), so it needs the **service_role**
key to bypass RLS during sync. This key is a highly privileged secret:

- Keep it only in `bot/.env` on the bot host (which should be git-ignored).
- Never place it in any client/browser code or in the web app's `.env`.
- If it ever leaks, rotate it and update `bot/.env`.

> Note: on Lovable Cloud the service_role key is not exposed through the Lovable
> agent or UI. You must retrieve it from the Supabase project's API settings
> yourself and paste it into `bot/.env`.

## Run the bot

```bash
cd bot
cp .env.example .env      # then edit .env with the values above
npm install
node index.js            # or: pm2 start index.js --name qadiya-bot
```

## Verify

- Startup logs should show `Telegram Token: Configured` and
  `Qadiya Telegram Bot polling active`.
- Send a 9-digit case number to the bot in Telegram; it should reply with a PDF
  and the case should appear in the dashboard shortly after (Supabase sync).

## Security reminder

`bot/.env` contains three secrets (`TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`,
`SUPABASE_SERVICE_KEY`). Ensure it is git-ignored and readable only by the bot
process user.
