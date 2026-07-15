require('dotenv').config();
const { Telegraf } = require('telegraf');
const { MojScraper } = require('./src/scraper/mojScraper');
const { generateCasePDF } = require('./src/pdf/pdfGenerator');
const { syncCase } = require('./src/sync/supabaseSync');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

['output', 'logs', 'fonts'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN, {
  telegram: { 
    apiRoot: 'https://api.telegram.org',
    webhookReply: false,
    agent: null
  },
  handlerTimeout: 90000
});
const scraper = new MojScraper();
scraper.init();
const activeRequests = new Map();

bot.start((ctx) => {
  logger.info(`/start from ${ctx.from.first_name} (${ctx.from.id})`);
  ctx.replyWithMarkdown(`🏛️ *QADIYA — Kuwait Legal Intelligence Bot*\nمرحباً! أرسل الرقم الآلي للقضية (6-12 رقم).\n*مثال:* \`222486500\``);
});

bot.help((ctx) => {
  ctx.replyWithMarkdown(`أرسل الرقم الآلي (6-12 رقم) → PDF خلال 15-30 ثانية\n*مثال:* \`222486500\``);
});

bot.command('status', (ctx) => {
  ctx.reply('✅ Bot running | 🤖 AI Active | 📄 PDF Active | 🌐 MOJ Connected');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  let caseNumber = text.replace(/[\s\/\-]/g, '');
  logger.info(`Received text: "${text}" → cleaned: "${caseNumber}" from ${ctx.from.first_name}`);

  if (!/^\d{6,12}$/.test(caseNumber)) {
    await ctx.reply('⚠️ *رقم غير صحيح*\n\nأرسل الرقم الآلي (6-12 رقم فقط).\nمثال: `222486500`', { parse_mode: 'Markdown' });
    return;
  }

  const userId = ctx.from.id;
  if (activeRequests.has(userId)) {
    await ctx.reply('⏳ جاري معالجة طلبك السابق...');
    return;
  }

  activeRequests.set(userId, true);
  try {
    const statusMsg = await ctx.reply(`🔍 *جاري البحث عن القضية ${caseNumber}...*\n⏳ 15-30 ثانية\n🔐 _حل الكابتشا..._`, { parse_mode: 'Markdown' });
    const result = await scraper.scrapeCase(caseNumber);

    if (!result.success) {
      await ctx.reply(`❌ *فشل*\n\`${caseNumber}\`\n${result.error || 'خطأ غير معروف'}\n\n_حاول مرة أخرى._`, { parse_mode: 'Markdown' });
      return;
    }

    syncCase(result, caseNumber).catch(err => logger.warn(`Sync: ${err.message}`));

    try { await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, '📄 _إنشاء PDF..._', { parse_mode: 'Markdown' }); } catch(e){}

    const pdfPath = await generateCasePDF(result);
    await ctx.replyWithDocument(
      { source: pdfPath, filename: `Qadiya_${caseNumber}.pdf` },
      { caption: `✅ *تقرير قضية ${caseNumber}*\n\n_Powered by Qadiya AI 🤖_`, parse_mode: 'Markdown' }
    );
    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch(e){} }, 5000);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch(e){}
    logger.info(`✅ Done: ${caseNumber}`);
  } catch (error) {
    logger.error(`Error ${caseNumber}: ${error.message}`);
    await ctx.reply(`❌ خطأ في معالجة القضية \`${caseNumber}\`\n\n_حاول لاحقاً._`, { parse_mode: 'Markdown' });
  } finally {
    activeRequests.delete(userId);
  }
});

bot.catch((err) => logger.error(`Bot error: ${err.message}`));

logger.info('=== Qadiya Bot Starting ===');
logger.info(`Token: ${BOT_TOKEN ? 'SET' : 'MISSING'}`);
logger.info(`AI: ${process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'}`);

bot.launch({ 
  dropPendingUpdates: false,
  allowedUpdates: ['message'],
  polling: { timeout: 10 }
}).then(() => {
  logger.info('🟢 BOT POLLING ACTIVE — ready for messages');
}).catch(err => {
  logger.error('🔴 LAUNCH FAILED: ' + err.message);
  // Retry after 5 seconds
  setTimeout(() => {
    logger.info('Retrying launch...');
    bot.launch({ dropPendingUpdates: true, allowedUpdates: ['message'], polling: { timeout: 10 } })
      .then(() => logger.info('🟢 BOT POLLING ACTIVE (retry)'))
      .catch(e => logger.error('🔴 RETRY FAILED: ' + e.message));
  }, 5000);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
