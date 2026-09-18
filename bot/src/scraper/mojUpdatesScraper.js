/**
 * MOJ Regulatory Updates Scraper
 * ------------------------------------------------------------------
 * Separate from mojScraper.js (which handles per-case status lookups on
 * eservices.moj.gov.kw). This module watches the Ministry of Justice public
 * publication pages for NEW regulations, circulars, announcements and news.
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
 *      which never matches "[?&]ID=" — so zero items ever matched.
 *   2. the previous source list pointed at Search09.aspx (a general
 *      procedures/services directory, not regulations) and looked for PDFs
 *      under "/Documents/", which isn't where circulars actually live
 *      (they're under "/Decisions_and circulars/") — so it only ever
 *      matched unrelated reference PDFs (lawyer guide, governance manual).
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

const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BASE = 'https://www.moj.gov.kw';

/**
 * Public listing pages to watch. `category` maps to moj_updates.category.
 * `match` selects how item links are recognized on that page:
 *   - 'itemid'   : href contains a numeric ItemID=... query param
 *                  (news / announcement listing pages)
 *   - 'document' : href points directly at a .pdf/.doc/.docx file
 *                  (the circulars page, which has no per-item ID param)
 */
const SOURCES = [
  { url: `${BASE}/AR/pages/Search02.aspx`, category: 'news', match: 'itemid' },
  { url: `${BASE}/AR/pages/Search03.aspx`, category: 'announcement', match: 'itemid' },
  { url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx`, category: 'regulation', match: 'document' },
];

/**
 * Demo fixture used only if every live source fails to parse (see header
 * note). Shaped exactly like a parsed live item so the rest of the pipeline
 * is unaffected either way.
 */
const MOCK_UPDATES = [
  {
    title_ar: 'تعميم بشأن مواعيد قيد الدعاوى أمام محاكم الاستئناف',
    title: 'Circular on filing deadlines before the Courts of Appeal',
    content_ar:
      'يُعمل اعتباراً من تاريخ صدور هذا التعميم بضرورة إيداع صحيفة الاستئناف خلال الميعاد المقرر قانوناً، مع إرفاق سند الوكالة وصورة الحكم المستأنف، ولا تُقبل الصحيفة المودعة بغير ذلك.',
    source_url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx#demo-circular-appeal-filing`,
    category: 'regulation',
    published_at: null,
  },
  {
    title_ar: 'إعلان بشأن تنظيم العمل بإدارة التنفيذ خلال العطلة القضائية',
    title: 'Announcement on Execution Department operations during judicial recess',
    content_ar:
      'تُعلن وزارة العدل عن تنظيم سير العمل بإدارة التنفيذ خلال العطلة القضائية، على أن تقتصر الطلبات المقبولة على الطلبات المستعجلة وفقاً للضوابط المقررة.',
    source_url: `${BASE}/AR/pages/Search03.aspx#demo-execution-recess`,
    category: 'announcement',
    published_at: null,
  },
  {
    title_ar: 'قرار وزاري بشأن رسوم استخراج صور الأحكام والمستندات القضائية',
    title: 'Ministerial decision on fees for copies of judgments and court documents',
    content_ar:
      'صدر قرار وزاري بتعديل الرسوم المقررة على استخراج صور الأحكام والمستندات القضائية، ويُعمل به من تاريخ نشره في الجريدة الرسمية.',
    source_url: `${BASE}/AR/Pages/Decisions_and_circulars.aspx#demo-fees-decision`,
    category: 'regulation',
    published_at: null,
  },
];

/** Stable fingerprint used for duplicate detection (independent of the URL). */
function contentHash(item) {
  const basis = `${(item.title_ar || '').trim()}::${(item.content_ar || '').trim()}`
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return crypto.createHash('sha256').update(basis).digest('hex');
}

/**
 * Resolve a possibly-relative href against the page it was found on, and
 * normalize spaces/Arabic characters to a valid encoded URL. decodeURI+
 * encodeURI is idempotent, so this is safe whether href was already encoded
 * or not.
 */
function absolute(href, pageUrl) {
  if (!href) return null;
  try {
    const resolved = new URL(href, pageUrl).href;
    return encodeURI(decodeURI(resolved));
  } catch {
    return null;
  }
}

function looksLikeItem(href, matchMode) {
  if (matchMode === 'itemid') return /[?&]ItemID=\d+/i.test(href);
  if (matchMode === 'document') return /\.(pdf|docx?)$/i.test(href);
  return false;
}

/**
 * Parse a listing page into update items, per the source's match mode.
 */
function parseListing(html, source) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();
  const minTextLen = source.match === 'document' ? 4 : 15;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!looksLikeItem(href, source.match) || text.length < minTextLen) return;

    const url = absolute(href, source.url);
    if (!url || seen.has(url)) return;
    seen.add(url);

    const contentAr =
      source.match === 'document'
        ? text
        : $(el).closest('li, tr, div').text().replace(/\s+/g, ' ').trim().slice(0, 2000) || text;

    items.push({
      title_ar: text,
      title: null,
      content_ar: contentAr,
      content: null,
      source_url: url,
      category: source.category,
      published_at: null,
    });
  });

  return items;
}

async function fetchSource(source) {
  try {
    const res = await axios.get(source.url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QadiyaBot/1.0)' },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return parseListing(res.data, source);
  } catch (err) {
    logger.warn(`MOJ updates: failed to fetch ${source.url} — ${err.message}`);
    return [];
  }
}

/**
 * Fetch all watched sources.
 * @returns {Promise<{items: Array, usedFallback: boolean}>}
 */
async function fetchMojUpdates() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  let items = results.flat();
  let usedFallback = false;

  if (items.length === 0) {
    logger.warn('MOJ updates: no items parsed from any live source — using demo fixture');
    items = MOCK_UPDATES.map((m) => ({ ...m, content: m.content ?? null, title: m.title ?? null }));
    usedFallback = true;
  }

  return {
    usedFallback,
    items: items.map((item) => ({ ...item, content_hash: contentHash(item) })),
  };
}

module.exports = { fetchMojUpdates, contentHash, SOURCES, MOCK_UPDATES };
