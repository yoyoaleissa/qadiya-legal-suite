require('dotenv').config();
const { Telegraf } = require('telegraf');
const { MojScraper } = require('./src/scraper/mojScraper');
const { generateCasePDF } = require('./src/pdf/pdfGenerator');
const { syncCase } = require('./src/sync/supabaseSync');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure dirs
['output', 'logs', 'fonts'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const scraper = new MojScraper();
scraper.init();

const activeRequests = new Map();

bot.start((ctx) => {
  ctx.replyWithMarkdown(`
🏛️ *QADIYA — Kuwait Legal Intelligence Bot*
مرحباً! أنا بوت قضية للاستعلام عن القضايا من وزارة العدل الكويتية.

*الاستخدام:*
أرسل الرقم الآلي للقضية (6-12 رقم) وسأقوم بإعداد تقرير PDF.
*مثال:* \`222486500\`

_أرسل رقم القضية للبدء._
  `);
});

bot.help((ctx) => {
  ctx.replyWithMarkdown(`*كيفية الاستخدام:*\n1️⃣ أرسل الرقم الآلي (6-12 رقم)\n2️⃣ انتظر 15-30 ثانية\n3️⃣ استلم PDF\n\n*مثال:* \`222486500\``);
});

bot.command('status', (ctx) => {
  ctx.reply('✅ Bot is running.\n🤖 AI: Active\n📄 PDF: Active\n🌐 MOJ: Connected');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  // Remove spaces and slashes for flexible input
  let caseNumber = text.replace(/[\s\/\-]/g, '');
  
  // If it looks like year/number format (e.g. 54782026), still validate as digits
  if (!/^\d{6,12}$/.test(caseNumber)) {
    await ctx.reply(
      '⚠️ *رقم قضية غير صحيح*\n\n' +
      'يرجى إرسال الرقم الآلي للقضية (6-12 رقم فقط).\n' +
      'مثال: `222486500`\n\n' +
      '⚠️ *ملاحظة:* أرسل الرقم الآلي وليس رقم القضية/السنة',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const userId = ctx.from.id;
  if (activeRequests.has(userId)) {
    await ctx.reply('⏳ جاري معالجة طلبك السابق...');
    return;
  }

  activeRequests.set(userId, true);
  logger.info(`Processing case ${caseNumber} for user ${userId} (${ctx.from.first_name})`);

  try {
    const statusMsg = await ctx.reply(
      `🔍 *جاري البحث عن القضية ${caseNumber}...*\n\n⏳ يرجى الانتظار 15-30 ثانية\n🔐 _حل الكابتشا..._`,
      { parse_mode: 'Markdown' }
    );

    const result = await scraper.scrapeCase(caseNumber);

    if (!result.success) {
      await ctx.reply(
        `❌ *فشل في استرجاع بيانات القضية*\n\nرقم القضية: \`${caseNumber}\`\nالخطأ: ${result.error || 'غير معروف'}\n\n_يرجى التحقق من الرقم والمحاولة مرة أخرى._`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Sync to Supabase (non-blocking)
    syncCase(result, caseNumber).catch(err => logger.warn(`Sync failed: ${err.message}`));

    try {
      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null,
        '📄 _جاري إنشاء التقرير..._\n🤖 تحليل بالذكاء الاصطناعي...',
        { parse_mode: 'Markdown' });
    } catch (e) {}

    const pdfPath = await generateCasePDF(result);

    await ctx.replyWithDocument(
      { source: pdfPath, filename: `Qadiya_${caseNumber}.pdf` },
      { caption: `✅ *تقرير قضية ${caseNumber}*\n\n_Powered by Qadiya AI 🤖_`, parse_mode: 'Markdown' }
    );

    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch (e) {} }, 5000);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}

    logger.info(`Successfully processed case ${caseNumber}`);
  } catch (error) {
    logger.error(`Error processing ${caseNumber}:`, error.message);
    await ctx.reply(
      `❌ *خطأ في معالجة القضية*\n\nالقضية: \`${caseNumber}\`\n\n_بوابة وزارة العدل قد تكون غير متاحة. يرجى المحاولة لاحقاً._`,
      { parse_mode: 'Markdown' }
    );
  } finally {
    activeRequests.delete(userId);
  }
});

bot.catch((err, ctx) => {
  logger.error(`Bot error:`, err.message);
});

// Launch with explicit polling options
logger.info('=== Qadiya Bot Starting (direct mode) ===');
bot.launch({ 
  dropPendingUpdates: true,
  allowedUpdates: ['message']
}).then(() => {
  logger.info('✅ Bot polling ACTIVE - ready to receive messages');
}).catch(err => {
  logger.error('❌ Bot launch FAILED:', err.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
