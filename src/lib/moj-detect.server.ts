/**
 * Shared MOJ regulatory-update detection + plain-language explanation.
 *
 * Server-only. Used by both the scheduled cron endpoint
 * (src/routes/api/public/hooks/moj-updates-sync.ts) and the on-demand
 * "Update Knowledge" button (src/lib/moj-updates.functions.ts).
 *
 * Source pages (confirmed live against www.moj.gov.kw):
 *   - /AR/pages/Search02.aspx                 الأخبار              (news)
 *       items link to  DisplayNews.aspx?ItemID=<n>
 *   - /AR/pages/Search03.aspx                 الإعلانات            (announcements)
 *       items link to  DisplayAnn.aspx?ItemID=<n>
 *   - /AR/Pages/Decisions_and_circulars.aspx  القرارات والتعاميم الوزارية (regulations)
 *       items link directly to PDF files under
 *       /AR/Decisions_and circulars/<Arabic title>.pdf (note the literal
 *       space in the folder name, and Arabic filenames — both need URL
 *       encoding, handled in absolute() below).
 *
 * These pages ARE plain server-rendered HTML (confirmed by direct fetch) —
 * an earlier version of this file assumed they were SharePoint pages that
 * render client-side and could only be parsed with a headless browser. That
 * assumption was wrong and masked two real bugs instead:
 *   1. the item-link regex looked for literal "?ID=" / "&ID=", but every
 *      live listing page actually uses "ItemID=" (e.g. "?ItemID=3478"),
 *      which never matches "[?&]ID=" — so zero items ever matched, and the
 *      fabricated MOCK_UPDATES fixture was shown in the app as if real.
 *   2. the previous source list pointed at Search09.aspx (a general
 *      procedures/services directory, not regulations) and looked for PDFs
 *      under "/Documents/", which isn't where circulars actually live
 *      (they're under "/Decisions_and circulars/").
 *
 * Both are fixed below via per-source `match` modes. MOCK_UPDATES is kept
 * purely as a last-resort fallback (network hiccup, page redesign) so the
 * detect → store → display pipeline never goes fully dark — it should
 * rarely if ever trigger now.
 *
 * If the ministry redesigns these pages again: re-fetch each URL, confirm
 * the query param / path pattern item links use, and update `SOURCES` /
 * `looksLikeItem()` accordingly. Nothing downstream changes.
 */

const BASE = "https://www.moj.gov.kw";

type MatchMode = "itemid" | "document";

const SOURCES: { url: string; category: string; match: MatchMode }[] = [
  { url: `${BASE}/AR/pages/Search02.aspx`, category: "news", match: "itemid" },
  { url: `${BASE}/AR/pages/Search03.aspx`, category: "announcement", match: "itemid" },
  { url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx`, category: "regulation", match: "document" },
];

export type DetectedItem = {
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
    source_url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx#demo-circular-appeal-filing`,
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
    source_url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx#demo-fees-decision`,
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

function stripTags(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a possibly-relative href against the page it was found on, and
 * normalize spaces/Arabic characters to a valid encoded URL. decodeURI+
 * encodeURI is idempotent, so this is safe whether href was already encoded
 * or not.
 */
function absolute(href: string, pageUrl: string): string | null {
  try {
    const resolved = new URL(href, pageUrl).href;
    return encodeURI(decodeURI(resolved));
  } catch {
    return null;
  }
}

function looksLikeItem(href: string, matchMode: MatchMode) {
  if (matchMode === "itemid") return /[?&]ItemID=\d+/i.test(href);
  if (matchMode === "document") return /\.(pdf|docx?)$/i.test(href);
  return false;
}

function parseListing(html: string, source: { url: string; category: string; match: MatchMode }) {
  const out: Omit<DetectedItem, "content_hash">[] = [];
  const seen = new Set<string>();
  const minTextLen = source.match === "document" ? 4 : 15;
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    const href = m[1] ?? "";
    const text = stripTags(m[2] ?? "");
    if (!looksLikeItem(href, source.match) || text.length < minTextLen) continue;
    const url = absolute(href, source.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title_ar: text,
      title: null,
      content_ar: text,
      content: null,
      source_url: url,
      category: source.category,
      published_at: null,
    });
  }
  return out;
}

export async function fetchMojUpdates() {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const res = await fetch(source.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; QadiyaBot/1.0)" },
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) return [];
        return parseListing(await res.text(), source);
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

  const withHash: DetectedItem[] = [];
  for (const item of items) {
    const basis = `${item.title_ar.trim()}::${(item.content_ar ?? "").trim()}`
      .replace(/\s+/g, " ")
      .toLowerCase();
    withHash.push({ ...item, content_hash: await sha256(basis) });
  }
  return { items: withHash, usedFallback };
}

/**
 * Plain-language explanation of a detected update, via the Lovable AI Gateway
 * (the same provider that already powers the Report Bot and AI Assistant).
 * Returns null when no AI key is configured — callers must then present the raw
 * text honestly rather than fabricating a summary.
 */
export async function explainUpdate(item: {
  title_ar: string;
  title?: string | null;
  content_ar?: string | null;
  content?: string | null;
  category?: string | null;
}): Promise<{ explanation_en: string; explanation_ar: string } | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const system = `You explain Kuwaiti Ministry of Justice regulations, circulars and announcements to lawyers and their clients in plain language.
Rules:
- Explain what the item means IN PRACTICE: who it affects, what changes, what someone must now do differently.
- No legal advice, no predictions. Descriptive only.
- Arabic must be formal Modern Standard Arabic in legal register, but plain and understandable.
- If the source text is too thin to explain, say so plainly instead of inventing detail.
- Reply ONLY with strict minified JSON with exactly these keys: explanation_en, explanation_ar.
- Each explanation: 2-4 sentences.`;

  const user = `Ministry item (JSON):\n${JSON.stringify({
    title: item.title ?? null,
    title_ar: item.title_ar,
    content: item.content ?? null,
    content_ar: item.content_ar ?? null,
    category: item.category ?? null,
  })}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("[moj-updates] gateway error", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = {};
      }
    }
  }
  if (!parsed["explanation_en"] && !parsed["explanation_ar"]) return null;
  return {
    explanation_en: parsed["explanation_en"] ?? "",
    explanation_ar: parsed["explanation_ar"] ?? "",
  };
}
