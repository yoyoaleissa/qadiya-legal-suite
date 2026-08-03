/**
 * MOJ Regulatory Updates — Scheduled Detection Job
 *
 * Runs independently of the case-status nightly sync. It:
 *   1. Fetches the Ministry of Justice public publication pages
 *   2. Detects entries not already stored (by source URL or content hash)
 *   3. Inserts them into public.moj_updates with status = 'new'
 *
 * Deploy: add to Railway as a separate cron service, same pattern as
 * nightlySync.js.
 * Suggested schedule: 0 5 * * *  (05:00 UTC = 08:00 Kuwait, every morning)
 *
 * Manual run:  node bot/src/cron/mojUpdatesCron.js
 */

const { syncMojUpdates } = require('../sync/mojUpdatesSync');

async function runMojUpdatesSync() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📜 MOJ regulatory updates check starting:', new Date().toISOString());

  const result = await syncMojUpdates();

  console.log(`   Items seen at source : ${result.checked}`);
  console.log(`   New updates stored   : ${result.inserted}`);
  console.log(`   Already known        : ${result.skipped}`);
  if (result.usedFallback) {
    console.log('   ⚠️  Live listing returned nothing — demo fixture source was used.');
    console.log('       Swap in the confirmed MOJ feed URL in mojUpdatesScraper.js.');
  }
  console.log(`${'='.repeat(60)}\n`);

  return result;
}

if (require.main === module) {
  runMojUpdatesSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error in MOJ updates sync:', err);
      process.exit(1);
    });
}

module.exports = { runMojUpdatesSync };
