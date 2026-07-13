/**
 * Telegram Smart Judgment Alert
 * Sends a rich notification with inline buttons when a judgment is detected
 * 
 * This replaces the basic lawyer letter with an interactive Telegram message
 * that includes one-click actions for Calendar, Tasks, and Full Report
 */

/**
 * Build the Telegram judgment alert message and inline keyboard
 * @param {Object} params - Same params as judgmentNotification
 * @returns {Object} { text, buttons, parseMode }
 */
function buildJudgmentAlert(params) {
  const judgmentDate = new Date(params.judgmentDate);
  const appealDeadline = new Date(judgmentDate);
  appealDeadline.setDate(appealDeadline.getDate() + 30);
  
  const today = new Date();
  const daysRemaining = Math.ceil((appealDeadline - today) / (1000 * 60 * 60 * 24));
  
  // Urgency emoji
  let urgencyEmoji;
  if (daysRemaining <= 7) urgencyEmoji = '🚨';
  else if (daysRemaining <= 14) urgencyEmoji = '⚠️';
  else if (daysRemaining <= 21) urgencyEmoji = '⏰';
  else urgencyEmoji = '✅';

  // Build the message text
  const text = `${urgencyEmoji} *إشعار حكم — Judgment Alert*

━━━━━━━━━━━━━━━━━━━━

📋 *القضية:* \`${params.caseNumber}\`
⚖️ *المحكمة:* ${params.court} — ${params.courtType}
🏢 *المدعي:* ${params.opponentName}
👤 *صفتك:* ${params.clientRole}

━━━━━━━━━━━━━━━━━━━━

🔴 *الحكم:*
\`${params.ruling} — ${params.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك\`

━━━━━━━━━━━━━━━━━━━━

⏱ *مهلة الاستئناف:*
📅 آخر موعد: *${appealDeadline.toLocaleDateString('en-GB')}*
⏳ المتبقي: *${daysRemaining} يوم*

━━━━━━━━━━━━━━━━━━━━

💡 *التوصية:*
${params.amount > 2000 
  ? '→ المبلغ يستحق الاستئناف. راجع محاميك فوراً.'
  : '→ المبلغ بسيط. قيّم تكلفة الاستئناف مقابل السداد.'}

_Powered by Qadiya AI 🤖_`;

  // Build Google Calendar link for appeal deadline
  const appealDateStr = appealDeadline.toISOString().split('T')[0].replace(/-/g, '');
  const calTitle = encodeURIComponent(`⚠️ آخر موعد استئناف - قضية ${params.caseNumber}`);
  const calDetails = encodeURIComponent(
    `آخر موعد لتقديم الاستئناف\n` +
    `القضية: ${params.caseNumber}\n` +
    `المدعي: ${params.opponentName}\n` +
    `المبلغ: ${params.amount} د.ك\n` +
    `المحكمة: ${params.court}`
  );
  const calLocation = encodeURIComponent(params.court || 'محكمة الكويت');
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${appealDateStr}/${appealDateStr}&details=${calDetails}&location=${calLocation}`;

  // Reminder link (7 days before)
  const reminderDate = new Date(appealDeadline);
  reminderDate.setDate(reminderDate.getDate() - 7);
  const reminderDateStr = reminderDate.toISOString().split('T')[0].replace(/-/g, '');
  const reminderTitle = encodeURIComponent(`🔔 تذكير: 7 أيام للاستئناف - قضية ${params.caseNumber}`);
  const reminderLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${reminderTitle}&dates=${reminderDateStr}/${reminderDateStr}&details=${calDetails}&location=${calLocation}`;

  // Google Tasks link
  const tasksLink = `https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1`;

  // MOJ Portal
  const mojLink = 'https://eservices.moj.gov.kw/searchCriteria/searchByCase.jsp';

  // Build inline keyboard (3 rows)
  const buttons = [
    [
      { text: '📆 إضافة موعد الاستئناف للتقويم', url: calendarLink }
    ],
    [
      { text: '🔔 تذكير قبل 7 أيام', url: reminderLink },
      { text: '✅ إضافة مهمة', url: tasksLink }
    ],
    [
      { text: '📄 تقرير PDF كامل', callback_data: `full_report_${params.autoNumber || params.caseNumber}` },
      { text: '🌐 بوابة العدل', url: mojLink }
    ]
  ];

  return {
    text,
    buttons,
    parseMode: 'Markdown'
  };
}

/**
 * Send judgment alert via Telegram bot
 * @param {Object} bot - Telegraf bot instance
 * @param {number} chatId - Telegram chat ID
 * @param {Object} params - Judgment parameters
 */
async function sendJudgmentAlert(bot, chatId, params) {
  const { text, buttons, parseMode } = buildJudgmentAlert(params);
  
  await bot.telegram.sendMessage(chatId, text, {
    parse_mode: parseMode,
    reply_markup: { inline_keyboard: buttons }
  });
}

module.exports = { buildJudgmentAlert, sendJudgmentAlert };
