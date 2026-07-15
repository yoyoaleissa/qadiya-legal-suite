/**
 * Nightly MOJ Sync — Automated Case Monitoring
 *
 * This script runs as a cron job (2:00 AM Kuwait time) and:
 * 1. Fetches all active cases from Supabase
 * 2. Scrapes each case from the MOJ portal
 * 3. Compares with stored data to detect changes
 * 4. Sends Telegram notifications for any updates
 * 5. Creates tasks for urgent deadlines
 *
 * Deploy: Add to Railway as a separate service with cron schedule
 * Schedule: 0 23 * * * (23:00 UTC = 2:00 AM Kuwait/AST)
 */

const { createClient } = require("@supabase/supabase-js");
const { MojScraper } = require("../scraper/mojScraper");
const { Telegraf } = require("telegraf");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function getActiveCases() {
  const { data, error } = await supabase
    .from("cases")
    .select("id, case_number, title, assigned_to, client_id")
    .eq("status", "active");

  if (error) throw error;
  return data || [];
}

async function getStoredCaseData(caseNumber) {
  const { data } = await supabase
    .from("case_reports")
    .select("json_data, updated_at")
    .eq("case_number", caseNumber)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

async function detectChanges(oldData, newData) {
  const changes = [];

  if (!oldData) {
    changes.push({ type: "new_case", description: "First time tracking this case" });
    return changes;
  }

  const oldJson = typeof oldData === "string" ? JSON.parse(oldData) : oldData;
  const newJson = typeof newData === "string" ? JSON.parse(newData) : newData;

  // Check for new hearings
  const oldHearings = oldJson.hearings?.length || 0;
  const newHearings = newJson.hearings?.length || 0;
  if (newHearings > oldHearings) {
    const latestHearing = newJson.hearings[newJson.hearings.length - 1];
    changes.push({
      type: "new_hearing",
      description: `جلسة جديدة: ${latestHearing.date || "تاريخ غير محدد"}`,
      data: latestHearing,
    });
  }

  // Check for new judgments
  const oldJudgments = oldJson.judgments?.length || 0;
  const newJudgments = newJson.judgments?.length || 0;
  if (newJudgments > oldJudgments) {
    const latestJudgment = newJson.judgments[newJson.judgments.length - 1];
    changes.push({
      type: "new_judgment",
      description: `حكم جديد صدر: ${latestJudgment.decision || ""}`,
      data: latestJudgment,
    });
  }

  // Check for status change
  if (oldJson.status !== newJson.status) {
    changes.push({
      type: "status_change",
      description: `تغيير الحالة: ${oldJson.status} → ${newJson.status}`,
      oldStatus: oldJson.status,
      newStatus: newJson.status,
    });
  }

  return changes;
}

async function sendNotification(caseInfo, changes) {
  // Get the user's Telegram chat ID from their profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", caseInfo.assigned_to)
    .single();

  if (!profile?.telegram_chat_id) {
    console.log(`No Telegram chat ID for user ${caseInfo.assigned_to}, skipping notification`);
    return;
  }

  const changesList = changes
    .map((c) => {
      const icon =
        c.type === "new_judgment"
          ? "⚖️"
          : c.type === "new_hearing"
            ? "📅"
            : c.type === "status_change"
              ? "🔄"
              : "📌";
      return `${icon} ${c.description}`;
    })
    .join("\n");

  const message = `🔔 *تحديث تلقائي — قضية ${caseInfo.case_number}*\n\n${caseInfo.title || ""}\n\n${changesList}\n\n_تم الكشف عن هذا التحديث تلقائياً بواسطة Qadiya AI_`;

  try {
    await bot.telegram.sendMessage(profile.telegram_chat_id, message, {
      parse_mode: "Markdown",
    });
    console.log(`✅ Notification sent for case ${caseInfo.case_number}`);
  } catch (err) {
    console.error(`❌ Failed to send notification for case ${caseInfo.case_number}:`, err.message);
  }
}

async function createUrgentTask(caseInfo, change) {
  if (change.type !== "new_judgment") return;

  // Calculate appeal deadline (30 days from today)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  const { error } = await supabase.from("tasks").insert({
    title: `⚠️ مهلة استئناف — ${caseInfo.title || caseInfo.case_number}`,
    description: `صدر حكم جديد في القضية. مهلة الاستئناف 30 يوم تنتهي في ${deadline.toLocaleDateString("ar-KW")}`,
    due_date: deadline.toISOString(),
    status: "todo",
    priority: "urgent",
    case_id: caseInfo.id,
    assigned_to: caseInfo.assigned_to,
  });

  if (error) {
    console.error(`Failed to create task for case ${caseInfo.case_number}:`, error.message);
  } else {
    console.log(`✅ Urgent task created for case ${caseInfo.case_number}`);
  }
}

async function runNightlySync() {
  console.log(`\n🌙 Nightly MOJ Sync started at ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  const cases = await getActiveCases();
  console.log(`Found ${cases.length} active cases to check`);

  const scraper = new MojScraper();
  let updatedCount = 0;
  let errorCount = 0;

  for (const caseInfo of cases) {
    if (!caseInfo.case_number) continue;

    try {
      console.log(`\n📋 Checking case ${caseInfo.case_number}...`);

      // Get stored data
      const stored = await getStoredCaseData(caseInfo.case_number);

      // Scrape fresh data from MOJ
      const freshData = await scraper.scrapeCase(caseInfo.case_number);

      if (!freshData || freshData.error) {
        console.log(`  ⚠️ Could not scrape case ${caseInfo.case_number}: ${freshData?.error || "unknown"}`);
        errorCount++;
        continue;
      }

      // Detect changes
      const changes = await detectChanges(stored?.json_data, freshData);

      if (changes.length === 0) {
        console.log(`  ✓ No changes detected`);
        continue;
      }

      console.log(`  🔔 ${changes.length} change(s) detected!`);
      updatedCount++;

      // Store updated data
      await supabase.from("case_reports").upsert({
        case_number: caseInfo.case_number,
        json_data: freshData,
        updated_at: new Date().toISOString(),
      });

      // Send notifications
      await sendNotification(caseInfo, changes);

      // Create urgent tasks for judgments
      for (const change of changes) {
        await createUrgentTask(caseInfo, change);
      }

      // Rate limiting — wait 5 seconds between scrapes to avoid MOJ blocking
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (err) {
      console.error(`  ❌ Error processing case ${caseInfo.case_number}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🌙 Nightly sync complete:`);
  console.log(`   Total cases checked: ${cases.length}`);
  console.log(`   Cases with updates: ${updatedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Completed at: ${new Date().toISOString()}`);
}

// Run if called directly
if (require.main === module) {
  runNightlySync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error in nightly sync:", err);
      process.exit(1);
    });
}

module.exports = { runNightlySync };
