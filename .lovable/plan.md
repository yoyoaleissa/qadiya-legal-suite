# Qadiya OS — Public Landing Page

## Goal
Ship a credible, Arabic-first marketing page at `/` that sells Qadiya OS to Kuwaiti law firms, without breaking the existing app.

## Routing changes
- Move the current dashboard from `src/routes/_authenticated/index.tsx` → `src/routes/_authenticated/dashboard.tsx` (URL `/dashboard`).
- Create a new public `src/routes/index.tsx` = the landing page (SSR on, no auth gate).
- Signed-in visitors hitting `/` are redirected client-side to `/dashboard` (small `useEffect` reading the Supabase session — no SSR loop).
- Update every internal reference from `to="/"` → `to="/dashboard"`:
  - `src/components/app-shell.tsx` (top nav + bottom nav — 2 spots)
  - `src/routes/login.tsx` (3 post-login navigations)
  - The `<Link to="/">` inside the 404 component in `__root.tsx` stays as-is (goes to marketing, which is correct).
- Add a "Sign in" button in the landing header that links to `/login`.

## Page structure (Arabic primary, RTL, EN toggle)
Single scroll landing on `/`, all copy AR-first with an EN mirror shown via a language toggle that reuses `useApp()` from `src/lib/app-context.tsx`.

1. **Sticky header** — Qadiya wordmark (Fraunces/IBM Plex Sans Arabic), primary nav anchors (المميزات · كيف تعمل · الأسعار · الأسئلة), language toggle, "دخول" (→ `/login`), "ابدأ التجربة" primary CTA.
2. **Hero** — headline: "منظومة إدارة المكاتب القانونية في الكويت." Sub: MOJ sync · تذكيرات جلسات · فوترة KWD · بوابة موكل. Dual CTA: "ابدأ التجربة" + "شاهد عرضاً". Right side: a stylized dashboard mock built from real UI primitives (Cards/Badges), not a screenshot, so it stays crisp bilingual + dark/light.
3. **Trust bar** — muted strip: "متوافق مع نقابة المحامين · تكامل بوابة وزارة العدل · بيانات على الأرض الكويتية · ثنائي اللغة AR/EN".
4. **Problem** — 3 pain cards in the lawyer's voice ("فاتتني جلسة الأسبوع الماضي" · "أطارد فواتير من ستة أشهر" · "الموكّل يتصل كل يوم يسأل عن قضيته").
5. **Pillars** — 4 cards: تقارير القضايا و مزامنة العدل · المساعد القانوني الذكي · التقويم القضائي · الفوترة و حساب الأمانة. Each with icon, one-line promise, "اعرف أكثر" jumping to the deep dive.
6. **Deep dive strip** — 4 alternating rows (right/left) with a stylized mock and 3 bullets each, matching the pillars.
7. **How it works** — 3 numbered steps: أنشئ حساب المكتب → استورد قضاياك → استلم إحاطتك اليومية.
8. **Client portal teaser** — mini phone-frame mock + copy: "موكّلك يرى قضيته و فواتيره من هاتفه." Link to `/portal`.
9. **Pricing** — 3 tiers in KWD/شهر (placeholder numbers, editable):
   - **منفرد** — 19 KWD / محامٍ واحد / 50 قضية.
   - **مكتب** — 49 KWD / حتى 10 محامين / قضايا غير محدودة / حساب أمانة.
   - **شركاء** — 149 KWD / محامون غير محدودون / لوحة شركاء / تقارير مجدولة.
   Middle tier highlighted with brass-gold border ("الأكثر شيوعاً").
10. **FAQ** — 6 items in an accordion: أين تُخزَّن بياناتنا؟ · هل السحب من العدل قانوني؟ · هل تدعمون RTL كاملاً؟ · هل يمكن استيراد قضايانا الحالية؟ · هل هناك تجربة مجانية؟ · كيف نلغي الاشتراك؟
11. **Founder note** — short paragraph, brass-gold accent, "صُنع في الكويت لمكاتب المحاماة الكويتية."
12. **Final CTA** — big centered "جرّب Qadiya لمدة 14 يوماً" + primary button → `/login`.
13. **Footer** — 4 columns (المنتج · الشركة · قانوني · تواصل), copyright, EN toggle mirror.

## Visual system
- Palette: Navy Trust (`#0f1b3d`, `#1e3a5f`, `#3b6fa0`, `#e8edf3`) — reuses existing tokens in `src/styles.css`, no new hex values in components.
- Type: Fraunces (EN display), IBM Plex Sans Arabic (AR everywhere), Plus Jakarta Sans (EN body) — already loaded.
- Motion: one hero fade+slide with `framer-motion` (already installed via shadcn deps; add only if missing). Scroll-in for pillar cards. No parallax, no auto-carousels.
- Sections use `container mx-auto max-w-6xl`, generous vertical rhythm (py-24 md:py-32), brass-gold used only for the middle pricing tier and the founder note.

## SEO & metadata (landing route only)
Per-route `head()` on `src/routes/index.tsx`:
- `title`: "Qadiya OS — منظومة إدارة المكاتب القانونية في الكويت"
- `description` (AR + EN mix, <160 chars)
- `og:title`, `og:description`, `og:url` = `https://qadiya.lovable.app/`, `og:type: website`
- `twitter:card: summary_large_image`
- JSON-LD `SoftwareApplication` with name, applicationCategory, offers (3 tiers), inLanguage `["ar", "en"]`
- Leaf-level `canonical` = `https://qadiya.lovable.app/`
- The `/dashboard` route gets `robots: noindex` (private app surface).
- No `og:image` this pass — hosting injects a screenshot at serve time. I'll mention to you that if you want a custom OG image later, I can generate one.
- Update `public/sitemap[.]xml.ts` to include `/` (landing) and drop `/dashboard` from public sitemap; keep `/portal`.

## Files touched
**New**
- `src/routes/index.tsx` (landing page, SSR, ~600 lines split into local sub-components)
- `src/components/landing/*` — small local components (Hero, PillarCard, PricingCard, FAQ, DashboardMock, PortalMock) to keep the route file readable
- `src/routes/_authenticated/dashboard.tsx` (moved from `_authenticated/index.tsx`, content unchanged)

**Edited**
- `src/routes/_authenticated/index.tsx` → deleted
- `src/components/app-shell.tsx` — 2 `to="/"` → `to="/dashboard"`
- `src/routes/login.tsx` — 3 `navigate({ to: "/" })` → `to: "/dashboard"`
- `src/routes/sitemap[.]xml.ts` — landing entry + drop dashboard
- `src/routes/__root.tsx` — 404 CTA stays `to="/"` (correct, points to marketing now)

**Unchanged**
- All feature code, backend, RLS, auth flow. Zero DB migrations.

## Explicit non-goals for this turn
- No new backend / server functions.
- No pricing enforcement or Stripe wiring (numbers are marketing copy only).
- No email capture form (would need Lovable Emails domain — I'll offer this after the page ships).
- No OG image generation.
- No changes to `/portal` or `/login` visual design beyond a "back to home" affordance.

## Risk & rollback
The one thing that will feel different for existing users: bookmarking `qadiya.lovable.app` → they now land on marketing and click into `/dashboard` after signing in. Redirect makes the transition invisible for anyone with an active session.

Rollback = revert the two route-file moves + the 5 link updates.
