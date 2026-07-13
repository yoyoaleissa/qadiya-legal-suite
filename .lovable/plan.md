## Goal

Make Legal Suite (this real/backed app) visually indistinguishable from the demo **Qadiya Insight** — same sidebar layout, palette, typography, cards, and polish in both light and dark mode. The only difference stays functional: real backend here, mock data there.

## What the reference looks like (Qadiya Insight)

- **No marketing landing page.** Every route lives inside a persistent left **sidebar shell** (`app-shell.tsx`): navy sidebar with gold gavel logo "Qadiya OS / Kuwait Legal Suite", nav list, top header with a Role selector + AR/EN toggle + theme toggle. `index` route *is* the dashboard.
- **Palette:** deep navy `oklch(0.28 0.06 260)` + warm gold `oklch(0.78 0.13 80)`, ivory background. Different values from the current app.
- **Fonts:** Fraunces (display) + **Inter** (body) + **Noto Naskh Arabic** (RTL). Current app uses Plus Jakarta Sans / IBM Plex Sans Arabic — will switch.
- **Nav items:** Dashboard, Report Bot, Clients & Cases, Court Calendar, Tasks, Billing, Documents, AI Assistant.

## Changes I will make

1. **Design tokens** — replace `src/styles.css` `:root`/`.dark`/`@theme` blocks with the reference's exact oklch values (keeping the print rules the real app needs).
2. **Fonts** — swap the Google Fonts `<link>` in `__root.tsx` to Fraunces + Inter + Noto Naskh Arabic; update font stacks in `styles.css`.
3. **App shell** — add `src/components/app-shell.tsx` (sidebar + header) matching the reference exactly; retire the top-nav `SiteHeader` for app pages.
4. **App context** — extend the existing context with `role`/`setRole` and a `setLang`, keeping the current key-based `t()` for real pages (shell/new pages use inline EN/AR).
5. **Routes / layout** — wrap routes in `AppShell` via `__root.tsx`. Convert `index` into the dashboard (styled like the reference), and drop the old marketing hero.
6. **Restyle existing real pages** — `report`, `documents`, and the dashboard to the reference's card/heading styles. The Report Bot keeps its **real backend server function** but adopts the reference's visual treatment.

## The one decision (please confirm)

The reference sidebar links to **Clients, Calendar, Tasks, Billing, AI Assistant** — pages this real app does not have yet. To make the sidebar/layout identical without broken links, I plan to:

**Option A (recommended):** Create those routes now, styled identically to the reference, showing a polished "Connected to live backend — data syncing" empty/placeholder state (no fake mock records). Sidebar looks identical; nothing pretends to be seeded data.

**Option B:** Only show sidebar items that have real pages today (Dashboard, Report Bot, Documents), add the rest as disabled "Coming soon" items. Fully honest, but the sidebar won't be 1:1 with the demo yet.

I'll proceed with **Option A** unless you prefer B. Real functionality (Report Bot backend, document generation) stays fully intact either way.
