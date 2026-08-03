/**
 * MOJ Updates Sync
 * ------------------------------------------------------------------
 * Persists newly detected Ministry of Justice regulations / circulars /
 * announcements into public.moj_updates.
 *
 * Authentication model matches supabaseSync.js: the bot signs in as a regular
 * user account (BOT_EMAIL / BOT_PASSWORD) that holds the 'bot' role in
 * user_roles. RLS allows that role to INSERT into moj_updates. No service_role
 * key is used or required.
 *
 * Detection: a row is "new" when neither its source_url nor its content_hash
 * already exists in the table. Both columns are UNIQUE, so concurrent runs
 * cannot create duplicates either.
 *
 * NOTE: embeddings / legal_knowledge ingestion are intentionally NOT done here
 * — rows land with status = 'new' and are reviewed by a human first.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { fetchMojUpdates } = require('../scraper/mojUpdatesScraper');

let supabase = null;
let signInPromise = null;

async function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.BOT_EMAIL;
  const password = process.env.BOT_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    logger.warn('Supabase bot credentials not configured — MOJ updates sync disabled');
    return null;
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: true },
  });

  signInPromise = signInPromise || client.auth.signInWithPassword({ email, password });
  const { error } = await signInPromise;
  if (error) {
    logger.error(`Bot sign-in failed: ${error.message}`);
    signInPromise = null;
    return null;
  }

  supabase = client;
  return supabase;
}

async function loadKnown(client) {
  const { data, error } = await client
    .from('moj_updates')
    .select('source_url, content_hash')
    .limit(5000);

  if (error) throw new Error(error.message);

  const urls = new Set();
  const hashes = new Set();
  for (const row of data || []) {
    if (row.source_url) urls.add(row.source_url);
    if (row.content_hash) hashes.add(row.content_hash);
  }
  return { urls, hashes };
}

/**
 * Run one detection pass.
 * @returns {Promise<{checked:number, inserted:number, skipped:number, usedFallback:boolean}>}
 */
async function syncMojUpdates() {
  const client = await getClient();
  if (!client) return { checked: 0, inserted: 0, skipped: 0, usedFallback: false };

  const { items, usedFallback } = await fetchMojUpdates();
  const known = await loadKnown(client);

  const fresh = [];
  let skipped = 0;
  for (const item of items) {
    if (known.urls.has(item.source_url) || known.hashes.has(item.content_hash)) {
      skipped++;
      continue;
    }
    known.urls.add(item.source_url);
    known.hashes.add(item.content_hash);
    fresh.push({
      title: item.title || null,
      title_ar: item.title_ar,
      content: item.content || null,
      content_ar: item.content_ar || null,
      source_url: item.source_url,
      category: item.category || 'announcement',
      published_at: item.published_at || null,
      content_hash: item.content_hash,
      status: 'new',
    });
  }

  let inserted = 0;
  if (fresh.length > 0) {
    const { data, error } = await client
      .from('moj_updates')
      .upsert(fresh, { onConflict: 'source_url', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(error.message);
    inserted = (data || []).length;
  }

  logger.info(
    `MOJ updates sync: checked ${items.length}, inserted ${inserted}, already known ${skipped}` +
      (usedFallback ? ' (demo fixture source)' : ''),
  );

  return { checked: items.length, inserted, skipped, usedFallback };
}

module.exports = { syncMojUpdates };
