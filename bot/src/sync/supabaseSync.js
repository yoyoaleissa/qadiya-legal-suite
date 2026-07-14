/**
 * Supabase Sync Module
 * Upserts scraped MOJ data into the shared Supabase database
 * so the dashboard sees live case data from the Telegram bot.
 *
 * Authentication model:
 *   The bot signs in as a regular user account (BOT_EMAIL / BOT_PASSWORD)
 *   that has been granted the 'bot' role in the user_roles table. RLS
 *   policies on cases/hearings/judgments allow that role to INSERT/UPDATE.
 *   No service_role key is used or required.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let supabase = null;
let signInPromise = null;

async function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.BOT_EMAIL;
  const password = process.env.BOT_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    logger.warn('Supabase bot credentials not configured — sync disabled');
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

/**
 * Sync a full scraped case into Supabase
 * @param {object} caseData - The full case data from mojScraper
 * @param {string} caseNumber - The case auto number
 */
async function syncCase(caseData, caseNumber) {
  const sb = await getClient();
  if (!sb) return;

  try {
    // 1. Upsert the main case record
    const caseRecord = {
      case_number: caseNumber,
      status: determineCaseStatus(caseData),
      updated_at: new Date().toISOString(),
    };

    // Extract case title from first instance or appeal
    if (caseData.firstInstance) {
      caseRecord.title = caseData.firstInstance.caseType || `Case ${caseNumber}`;
      caseRecord.title_ar = caseData.firstInstance.caseType || `قضية ${caseNumber}`;
      caseRecord.court = caseData.firstInstance.court || null;
      caseRecord.filed_date = caseData.firstInstance.filingDate || null;
    }

    const { data: caseRow, error: caseErr } = await sb
      .from('cases')
      .upsert(caseRecord, { onConflict: 'case_number' })
      .select('id')
      .single();

    if (caseErr) {
      logger.error(`Supabase case upsert failed: ${caseErr.message}`);
      return;
    }

    const caseId = caseRow.id;

    // 2. Sync court levels
    await syncCourtLevels(sb, caseId, caseData);

    // 3. Sync hearings
    if (caseData.hearings && caseData.hearings.length > 0) {
      await syncHearings(sb, caseId, caseData.hearings);
    }

    // 4. Sync judgments
    if (caseData.judgments && caseData.judgments.length > 0) {
      await syncJudgments(sb, caseId, caseData.judgments);
    }

    // 5. Sync timeline events
    if (caseData.events && caseData.events.length > 0) {
      await syncTimeline(sb, caseId, caseData.events);
    }

    // 6. Sync execution data
    if (caseData.execution) {
      await syncExecution(sb, caseId, caseData.execution);
    }

    logger.info(`Supabase sync complete for case ${caseNumber} (id: ${caseId})`);
  } catch (err) {
    logger.error(`Supabase sync error: ${err.message}`);
  }
}

function determineCaseStatus(caseData) {
  if (caseData.execution && caseData.execution.status) {
    return 'execution';
  }
  if (caseData.appeal) return 'appeal';
  return 'active';
}

async function syncCourtLevels(sb, caseId, caseData) {
  const levels = [];

  if (caseData.firstInstance) {
    levels.push({
      case_id: caseId,
      level: 'first_instance',
      court_name: caseData.firstInstance.court || null,
      court_name_ar: caseData.firstInstance.court || null,
      circuit: caseData.firstInstance.circuit || null,
      filing_date: caseData.firstInstance.filingDate || null,
      case_type: caseData.firstInstance.caseType || null,
      case_type_ar: caseData.firstInstance.caseType || null,
    });
  }

  if (caseData.appeal) {
    levels.push({
      case_id: caseId,
      level: 'appeal',
      court_name: caseData.appeal.court || null,
      court_name_ar: caseData.appeal.court || null,
      circuit: caseData.appeal.circuit || null,
      filing_date: caseData.appeal.filingDate || null,
      case_type: caseData.appeal.caseType || null,
      case_type_ar: caseData.appeal.caseType || null,
    });
  }

  if (levels.length > 0) {
    const { error } = await sb
      .from('court_levels')
      .upsert(levels, { onConflict: 'case_id,level' });
    if (error) logger.warn(`Court levels sync warning: ${error.message}`);
  }
}

async function syncHearings(sb, caseId, hearings) {
  const records = hearings.map((h, idx) => ({
    case_id: caseId,
    session_date: h.date || null,
    decision: h.decision || null,
    decision_ar: h.decision || null,
    next_date: h.nextDate || null,
    circuit_number: h.circuitNo || null,
    session_number: idx + 1,
  }));

  const { error } = await sb
    .from('hearings')
    .upsert(records, { onConflict: 'case_id,session_date' });
  if (error) logger.warn(`Hearings sync warning: ${error.message}`);
}

async function syncJudgments(sb, caseId, judgments) {
  const records = judgments.map((j) => ({
    case_id: caseId,
    ruling_text: j.ruling || null,
    ruling_text_ar: j.ruling || null,
    judgment_date: j.date || null,
    degree: j.degree || null,
    degree_ar: j.degree || null,
    judgment_type: j.type || null,
    amount: j.amount ? parseFloat(j.amount.replace(/[^\d.]/g, '')) || null : null,
    payment_status: j.paymentStatus || null,
  }));

  const { error } = await sb
    .from('judgments')
    .upsert(records, { onConflict: 'case_id,judgment_date' });
  if (error) logger.warn(`Judgments sync warning: ${error.message}`);
}

async function syncTimeline(sb, caseId, events) {
  const records = events.map((e) => ({
    case_id: caseId,
    event_date: e.date || null,
    event_type: e.type || 'event',
    description: e.description || null,
    description_ar: e.description || null,
  }));

  const { error } = await sb
    .from('case_timeline')
    .upsert(records, { onConflict: 'case_id,event_date,event_type' });
  if (error) logger.warn(`Timeline sync warning: ${error.message}`);
}

async function syncExecution(sb, caseId, execution) {
  if (!execution.procedures || execution.procedures.length === 0) return;

  const records = execution.procedures.map((p) => ({
    case_id: caseId,
    procedure_type: p.type || null,
    procedure_type_ar: p.type || null,
    procedure_date: p.date || null,
    status: p.status || null,
    status_ar: p.status || null,
  }));

  const { error } = await sb
    .from('execution_procedures')
    .upsert(records, { onConflict: 'case_id,procedure_date,procedure_type' });
  if (error) logger.warn(`Execution sync warning: ${error.message}`);
}

module.exports = { syncCase };
