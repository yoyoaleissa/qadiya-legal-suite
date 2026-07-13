# Qadiya Telegram Bot

The client-facing intelligence engine for Qadiya OS. This bot connects directly to the Kuwait Ministry of Justice (MOJ) portal, extracts live case data, generates premium PDF reports, and delivers smart notifications to clients via Telegram.

## Features

| Feature | Description |
|---------|-------------|
| MOJ Case Lookup | Scrapes live data from `eservices.moj.gov.kw` including all court levels |
| AI CAPTCHA Solving | Uses vision AI to solve the MOJ portal's image CAPTCHA |
| Deep Data Extraction | Retrieves hearings (viewMeetings) and judgments (viewVerds) |
| Premium PDF Reports | Multi-page branded dossier with timeline, hearings table, judgments |
| AI Case Summary | Bilingual (AR/EN) summary with lawyer recommendations |
| Smart Judgment Alerts | Appeal deadline countdown with Google Calendar one-click links |
| Google Calendar Links | One-click "Add to Calendar" for every future hearing |
| Supabase Sync | Upserts scraped data into the shared database for the dashboard |

## Setup

```bash
cd bot
cp .env.example .env
# Fill in your credentials
npm install
node index.js
```

## Architecture

```
bot/
├── index.js                    # Entry point
├── src/
│   ├── scraper/
│   │   ├── mojScraper.js       # MOJ portal session + data extraction
│   │   └── captchaSolver.js    # AI vision CAPTCHA solver
│   ├── ai/
│   │   └── summaryGenerator.js # GPT-powered case summary
│   ├── pdf/
│   │   ├── pdfGenerator.js     # Premium case report PDF
│   │   └── judgmentNotification.js # Smart judgment alert PDF
│   ├── bot/
│   │   ├── telegramBot.js      # Telegram bot handler
│   │   └── judgmentAlert.js    # Inline buttons & alert builder
│   └── utils/
│       └── logger.js           # Structured logging
```

## MOJ Portal Endpoints

The scraper accesses these endpoints after authentication:

| Endpoint | Data |
|----------|------|
| `finsView.jsp` | First Instance court data |
| `applView.jsp` | Appeal court data |
| `cassView.jsp` | Cassation court data |
| `execView.jsp` | Execution procedures |
| `poliView.jsp` | Police/prosecution data |
| `viewLastEvents.jsp` | Case timeline events |
| `expertView.jsp` | Expert reports |
| `announceView.jsp` | Court announcements |
| `viewMeetings.jsp` | Hearing sessions (deep) |
| `viewVerds.jsp` | Judgment details (deep) |

## Supabase Integration

When the bot scrapes a case, it upserts data into the same Supabase tables that the dashboard reads:
- `cases` → case metadata
- `hearings` → hearing sessions
- `judgments` → court rulings
- `case_timeline` → event history
- `court_levels` → court progression

This means any case looked up via Telegram automatically appears in the dashboard.
