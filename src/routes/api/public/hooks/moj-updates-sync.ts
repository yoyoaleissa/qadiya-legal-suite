import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled MOJ regulatory-update detection.
 *
 * Called by pg_cron every day (see migration note). Mirrors the logic in
 * bot/src/scraper/mojUpdatesScraper.js + bot/src/sync/mojUpdatesSync.js so the
 * pipeline keeps running even when the standalone bot host is offline.
 *
 * LIVE SOURCE URL STILL NEEDS CONFIRMATION — the MOJ SharePoint listing pages
 * render their rows client-side, so the plain fetch may parse zero items; in
 * that case the demo fixture below keeps the pipeline demoable end to end.
 */

const BASE = "https://www.moj.gov.kw";

const SOURCES = [
  { url: `${BASE}/AR/pages/Search03.aspx`, category: "announcement" },
  { url: `${BASE}/AR/pages/Search09.aspx`, category: "regulation" },
  { url: `${BASE}/AR/pages/Search02.aspx`, category: "news" },
];

type Item = {
  title: string | null;
  title_ar: string;
  content: string | null;
  content_ar: string | null;
  source_url: string;
  category: string;
  published_at: string | null;
  content_hash: string;
};

const MOCK_UPDATES = [
  {
    title_ar: "تعميم بشأن مواعيد قيد الدعاوى أمام محاكم الاستئناف",
    title: "Circular on filing deadlines before the Courts of Appeal",
    content_ar:
      "يُعمل اعتباراً من تاريخ صدور هذا التعميم بضرورة إيداع صحيفة الاستئناف خلال الميعاد المقرر قانوناً، مع إرفاق سند الوكالة وصورة الحكم المستأنف، ولا تُقبل الصحيفة المودعة بغير ذلك.",
    source_url: `${BASE}/AR/pages/Search09.aspx#demo-circular-appeal-filing`,
    category: "regulation",
  },
  {
    title_ar: "إعلان بشأن تنظيم العمل بإدارة التنفيذ خلال العطلة القضائية",
    title: "Announcement on Execution Department operations during judicial recess",
    content_ar:
      "تُعلن وزارة العدل عن تنظيم سير العمل بإدارة التنفيذ خلال العطلة القضائية، على أن تقتصر الطلبات المقبولة على الطلبات المستعجلة وفقاً للضوابط المقررة.",
    source_url: `${BASE}/AR/pages/Search03.aspx#demo-execution-recess`,
    category: "announcement",
  },
  {
    title_ar: "قرار وزاري بشأن رسوم استخراج صور الأحكام والمستندات القضائية",
    title: "Ministerial decision on fees for copies of judgments and court documents",
    content_ar:
      "صدر قرار وزاري بتعديل الرسوم المقررة على استخراج صور الأحكام والمستندات القضائية، ويُعمل به من تاريخ نشره في الجريدة الرسمية.",
    source_url: `${BASE}/AR/pages/Search03.aspx#demo-fees-decision`,
    category: "regulation",
  },
];

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function contentHashBasis(titleAr: string, contentAr: string | null) {
  return `${titleAr.trim()}::${(contentAr ?? "").trim()}`.replace(/\s+/g, " ").toLowerCase();
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(href: string) {
  if (/^https?:/i.test(href)) return href;
  return `${BASE}${href.startsWith("/") ? "" : "/"}${href}`;
}

/** Broad anchor scan — same heuristic as the bot's cheerio parser. */
function parseListing(html: string, category: string) {
  const out: Omit<Item, "content_hash">[] = [];
  const seen = new Set<string>();
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    const href = m[1] ?? "";
    const text = stripTags(m[2] ?? "");
    const looksLikeItem =
      /[?&]ID=\d+/i.test(href) || /\/Documents\/.+\.(pdf|docx?)$/i.test(href);
    if (!looksLikeItem || text.length < 15) continue;
    const url = absolute(href);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      title_ar: text,
      title: null,
      content_ar: text,
      content: null,
      source_url: url,
      category,
      published_at: null,
    });
  }
  return out;
}

async function fetchMojUpdates() {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const res = await fetch(source.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; QadiyaBot/1.0)" },
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) return [];
        return parseListing(await res.text(), source.category);
      } catch {
        return [];
      }
    }),
  );

  let items = results.flat();
  let usedFallback = false;
  if (items.length === 0) {
    usedFallback = true;
    items = MOCK_UPDATES.map((m) => ({ ...m, content: null, published_at: null }));
  }

  const withHash: Item[] = [];
  for (const item of items) {
    withHash.push({
      ...item,
      content_hash: await sha256(contentHashBasis(item.title_ar, item.content_ar)),
    });
  }
  return { items: withHash, usedFallback };
}

export const Route = createFileRoute("/api/public/hooks/moj-updates-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env["SUPABASE_ANON_KEY"]) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { items, usedFallback } = await fetchMojUpdates();

        const { data: existing, error: readError } = await supabaseAdmin
          .from("moj_updates")
          .select("source_url, content_hash")
          .limit(5000);
        if (readError) {
          return new Response(JSON.stringify({ error: readError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const urls = new Set((existing ?? []).map((r) => r.source_url));
        const hashes = new Set((existing ?? []).map((r) => r.content_hash));

        const fresh = [];
        let skipped = 0;
        for (const item of items) {
          if (urls.has(item.source_url) || hashes.has(item.content_hash)) {
            skipped++;
            continue;
          }
          urls.add(item.source_url);
          hashes.add(item.content_hash);
          fresh.push({ ...item, status: "new" });
        }

        let inserted = 0;
        if (fresh.length > 0) {
          const { data, error } = await supabaseAdmin
            .from("moj_updates")
            .upsert(fresh, { onConflict: "source_url", ignoreDuplicates: true })
            .select("id");
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          inserted = (data ?? []).length;
        }

        console.log(
          `MOJ updates cron: checked ${items.length}, inserted ${inserted}, known ${skipped}` +
            (usedFallback ? " (demo fixture source)" : ""),
        );

        return new Response(
          JSON.stringify({ checked: items.length, inserted, skipped, usedFallback }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
