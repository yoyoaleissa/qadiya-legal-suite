/**
 * MOJ Regulatory Updates Scraper
 * ------------------------------------------------------------------
 * Separate from mojScraper.js (which handles per-case status lookups on
 * eservices.moj.gov.kw). This module watches the Ministry of Justice public
 * publication pages for NEW regulations, circulars and announcements.
 *
 * ⚠️ LIVE SOURCE URL NEEDS TO BE CONFIRMED / SWAPPED IN
 * ------------------------------------------------------------------
 * The MOJ portal (www.moj.gov.kw) exposes these Arabic listing pages:
 *   - /AR/pages/Search02.aspx   الأخبار            (news)
 *   - /AR/pages/Search03.aspx   الإعلانات          (announcements)
 *   - /AR/pages/Search09.aspx   اجراءات الوزارة     (ministry procedures)
 *   - /AR/pages/Search07.aspx   النشرة اليومية      (daily bulletin)
 *   - /AR/Pages/Announcements.aspx
 *
 * All of them are SharePoint pages whose result lists are rendered client-side
 * (the server HTML contains the chrome but not the item rows), so a plain HTTP
 * + cheerio parse currently returns zero items. Until the real item feed
 * endpoint (or a headless-browser render) is confirmed, this scraper:
 *   1. attempts the live parse against SOURCES below, and
 *   2. falls back to MOCK_UPDATES so the detect → store → display pipeline is
 *      fully wired and demoable end to end.
 *
 * To go live: confirm the JSON/RSS endpoint behind the listing page (or render
 * it with the puppeteer instance already used by mojScraper.js), then update
 * `parseListing()` selectors / `SOURCES` below. Nothing downstream changes.
 */

const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BASE = 'https://www.moj.gov.kw';

/** Public listing pages to watch. category maps to moj_updates.category. */
const SOURCES = [
  { url: `${BASE}/AR/pages/Search03.aspx`, category: 'announcement' }, // الإعلانات
  { url: `${BASE}/AR/pages/Search09.aspx`, category: 'regulation' },   // اجراءات الوزارة
  { url: `${BASE}/AR/pages/Search02.aspx`, category: 'news' },         // الأخبار
];

/**
 * Demo fixture used when the live listing yields nothing (see header note).
 * Shaped exactly like a parsed live item so the rest of the pipeline is real.
 */
const MOCK_UPDATES = [
  {
    title_ar: 'تعميم بشأن مواعيد قيد الدعاوى أمام محاكم الاستئناف',
    title: 'Circular on filing deadlines before the Courts of Appeal',
    content_ar:
      'يُعمل اعتباراً من تاريخ صدور هذا التعميم بضرورة إيداع صحيفة الاستئناف خلال الميعاد المقرر قانوناً، مع إرفاق سند الوكالة وصورة الحكم المستأنف، ولا تُقبل الصحيفة المودعة بغير ذلك.',
    source_url: `${BASE}/AR/pages/Search09.aspx#demo-circular-appeal-filing`,
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
    source_url: `${BASE}/AR/pages/Search03.aspx#demo-fees-decision`,
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

function absolute(href) {
  if (!href) return null;
  if (/^https?:/i.test(href)) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

/**
 * Parse a SharePoint listing page into update items.
 * Selectors are intentionally broad; refine once the live feed is confirmed.
 */
function parseListing(html, category) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    // Item links point either at a details page (?ID=) or a published document.
    const looksLikeItem = /[?&]ID=\d+/i.test(href) || /\/Documents\/.+\.(pdf|docx?)$/i.test(href);
    if (!looksLikeItem || text.length < 15) return;

    const url = absolute(href);
    if (!url || seen.has(url)) return;
    seen.add(url);

    items.push({
      title_ar: text,
      title: null,
      content_ar: $(el).closest('li, tr, div').text().replace(/\s+/g, ' ').trim().slice(0, 2000) || text,
      content: null,
      source_url: url,
      category,
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
    return parseListing(res.data, source.category);
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
    // See header note: live listings render client-side, so no rows parsed.
    logger.warn('MOJ updates: no items parsed from live sources — using demo fixture');
    items = MOCK_UPDATES.map((m) => ({ ...m, content: m.content ?? null, title: m.title ?? null }));
    usedFallback = true;
  }

  return {
    usedFallback,
    items: items.map((item) => ({ ...item, content_hash: contentHash(item) })),
  };
}

module.exports = { fetchMojUpdates, contentHash, SOURCES, MOCK_UPDATES };
