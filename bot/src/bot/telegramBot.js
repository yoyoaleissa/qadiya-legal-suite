const { Telegraf, Markup } = require('telegraf');
const { MojScraper } = require('../scraper/mojScraper');
const { generateCasePDF } = require('../pdf/pdfGenerator');
const { syncCase } = require('../sync/supabaseSync');
const logger = require('../utils/logger');
const fs = require('fs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

class QadiyaBot {
  constructor() {
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    }
    
    this.bot = new Telegraf(BOT_TOKEN);
    this.scraper = new MojScraper();
    this.activeRequests = new Map(); // Track active requests per user
    this.setupHandlers();
  }

  setupHandlers() {
    // /start command
    this.bot.start((ctx) => {
      const welcomeMessage = `
🏛️ *QADIYA — Kuwait Legal Intelligence Bot*

مرحباً! أنا بوت قضية للاستعلام عن القضايا من وزارة العدل الكويتية.

*المميزات / Features:*
• تقرير PDF شامل مع جميع بيانات القضية
• جلسات المحكمة والأحكام بالتفصيل
• ملخص ذكي بالذكاء الاصطناعي
• روابط إضافة للتقويم
• الجدول الزمني الكامل للقضية

*الاستخدام / How to use:*
أرسل الرقم الآلي للقضية وسأقوم بإعداد تقرير PDF احترافي.

*مثال:* \`222486500\`

_أرسل رقم القضية للبدء._
      `;
      ctx.replyWithMarkdown(welcomeMessage);
    });

    // /help command
    this.bot.help((ctx) => {
      const helpMessage = `
*الأوامر / Commands:*
/start — رسالة الترحيب
/help — المساعدة
/status — حالة البوت

*كيفية الاستخدام:*
1️⃣ أرسل الرقم الآلي للقضية (9 أرقام)
2️⃣ انتظر 15-30 ثانية
3️⃣ استلم تقرير PDF شامل

*محتويات التقرير:*
📋 بيانات المحكمة الكلية
⚖️ بيانات الاستئناف والتمييز
🗓️ جدول الجلسات
⚖️ الأحكام والمنطوق
📂 بيانات التنفيذ
🏛️ بيانات المخفر والنيابة
📅 المستجدات الكاملة
🤖 ملخص ذكي وتوصيات

_Powered by AI — Qadiya_
      `;
      ctx.replyWithMarkdown(helpMessage);
    });

    // /status command
    this.bot.command('status', (ctx) => {
      ctx.reply('✅ Bot is running and ready.\n🤖 AI Summary: Active\n📄 PDF Generation: Active\n🌐 MOJ Portal: Connected');
    });

    // Handle text messages (case numbers)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text.trim();
      
      // Ignore commands
      if (text.startsWith('/')) return;
      
      // Validate case number (should be numeric, 6-12 digits)
      const caseNumber = text.replace(/\s/g, '');
      if (!/^\d{6,12}$/.test(caseNumber)) {
        await ctx.reply(
          '⚠️ *رقم قضية غير صحيح*\n\n' +
          'يرجى إرسال الرقم الآلي للقضية (6-12 رقم).\n' +
          'مثال: `222486500`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check if user already has an active request
      const userId = ctx.from.id;
      if (this.activeRequests.has(userId)) {
        await ctx.reply('⏳ جاري معالجة طلبك السابق. يرجى الانتظار...');
        return;
      }

      await this.processCaseInquiry(ctx, caseNumber);
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      logger.error(`Bot error for ${ctx.updateType}:`, err);
      ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    });
  }

  async processCaseInquiry(ctx, caseNumber) {
    const userId = ctx.from.id;
    this.activeRequests.set(userId, true);

    try {
      // Send processing message
      const statusMsg = await ctx.reply(
        `🔍 *جاري البحث عن القضية ${caseNumber}...*\n\n` +
        '⏳ يرجى الانتظار 15-30 ثانية\n' +
        '🔐 _حل الكابتشا..._',
        { parse_mode: 'Markdown' }
      );

      // Scrape the case
      const result = await this.scraper.scrapeCase(caseNumber);

      if (!result.success) {
        await ctx.reply(
          `❌ *فشل في استرجاع بيانات القضية*\n\n` +
          `رقم القضية: \`${caseNumber}\`\n` +
          `الخطأ: ${result.error}\n\n` +
          '_يرجى التحقق من الرقم والمحاولة مرة أخرى._',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Sync to Supabase (non-blocking — dashboard will see the data)
      syncCase(result, caseNumber).catch((err) =>
        logger.warn(`Supabase sync failed (non-blocking): ${err.message}`)
      );

      // Update status
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          null,
          '📄 _جاري إنشاء التقرير الذكي..._\n🤖 تحليل البيانات بالذكاء الاصطناعي...',
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        // Ignore edit errors
      }

      // Generate PDF
      const pdfPath = await generateCasePDF(result);

      // Build caption with key info
      const caption = this.buildCaption(result);
      
      // Build inline keyboard buttons
      const buttons = this.buildInlineButtons(result, caseNumber);

      // Send the PDF
      const sendOptions = {
        caption: caption,
        parse_mode: 'Markdown'
      };
      
      if (buttons.length > 0) {
        sendOptions.reply_markup = { inline_keyboard: buttons };
      }

      await ctx.replyWithDocument(
        { source: pdfPath, filename: `Qadiya_${caseNumber}.pdf` },
        sendOptions
      );

      // Clean up the PDF file after sending
      setTimeout(() => {
        try { fs.unlinkSync(pdfPath); } catch (e) {}
      }, 5000);

      // Delete the status message
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch (e) {}

      logger.info(`Successfully processed case ${caseNumber} for user ${userId}`);

    } catch (error) {
      logger.error(`Error processing case ${caseNumber}:`, error);
      await ctx.reply(
        `❌ *خطأ في معالجة القضية*\n\n` +
        `القضية: \`${caseNumber}\`\n\n` +
        '_بوابة وزارة العدل قد تكون غير متاحة مؤقتاً. يرجى المحاولة لاحقاً._',
        { parse_mode: 'Markdown' }
      );
    } finally {
      this.activeRequests.delete(userId);
    }
  }

  /**
   * Build a rich caption for the PDF document
   */
  buildCaption(result) {
    const { caseNumber, firstInstance, appeal, hearings, judgments, events } = result;
    
    let caption = `✅ *تقرير قضية ${caseNumber}*\n\n`;
    
    // Status
    let status = '⚪ غير محدد';
    if (events && events.length > 0) {
      const latest = events[0].action || '';
      if (latest.includes('حكم') || latest.includes('عدم قبول') || latest.includes('حفظ')) {
        status = '🔴 مغلقة';
      } else {
        status = '🟢 نشطة';
      }
    }
    caption += `الحالة: ${status}\n`;
    
    // Court info
    if (firstInstance && firstInstance.length > 0) {
      const fi = firstInstance[0];
      caption += `المحكمة: ${fi['الدائرة'] || fi['الجهة'] || '-'}\n`;
    }
    
    // Judgments summary
    if (judgments && judgments.length > 0) {
      const totalJ = judgments.reduce((sum, j) => sum + j.entries.length, 0);
      caption += `الأحكام: ${totalJ} حكم\n`;
    }
    
    // Hearings summary
    if (hearings && hearings.length > 0) {
      const totalH = hearings.reduce((sum, h) => sum + h.sessions.length, 0);
      caption += `الجلسات: ${totalH} جلسة\n`;
    }
    
    // Next hearing
    const today = new Date().toISOString().split('T')[0];
    let nextDate = null;
    if (hearings) {
      for (const h of hearings) {
        for (const s of h.sessions) {
          if (s.nextDate && s.nextDate > today) {
            if (!nextDate || s.nextDate < nextDate) nextDate = s.nextDate;
          }
        }
      }
    }
    if (nextDate) {
      caption += `\n📅 *الجلسة القادمة: ${nextDate}*\n`;
    }
    
    caption += `\n_Powered by Qadiya AI 🤖_`;
    return caption;
  }

  /**
   * Build inline keyboard buttons (Google Calendar, etc.)
   */
  buildInlineButtons(result, caseNumber) {
    const buttons = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Find next hearing for calendar link
    let nextHearing = null;
    let nextCourt = '';
    if (result.hearings) {
      for (const h of result.hearings) {
        for (const s of h.sessions) {
          if (s.nextDate && s.nextDate > today) {
            if (!nextHearing || s.nextDate < nextHearing.nextDate) {
              nextHearing = s;
              nextCourt = h.court;
            }
          }
        }
      }
    }
    
    if (nextHearing && nextHearing.nextDate) {
      const startDate = nextHearing.nextDate.replace(/-/g, '');
      const title = encodeURIComponent(`جلسة قضية ${caseNumber}`);
      const details = encodeURIComponent(`${nextCourt}\nرقم القضية: ${caseNumber}`);
      const location = encodeURIComponent('محكمة الكويت');
      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${startDate}&details=${details}&location=${location}`;
      
      buttons.push([
        { text: '📆 إضافة للتقويم / Add to Calendar', url: calUrl }
      ]);
    }
    
    // MOJ Portal link
    buttons.push([
      { text: '🌐 بوابة العدل / MOJ Portal', url: 'https://eservices.moj.gov.kw/searchCriteria/searchByCase.jsp' }
    ]);
    
    return buttons;
  }

  async start() {
    try {
      // Initialize the scraper
      await this.scraper.init();
      
      // Start the bot
      this.bot.launch().then(() => {
        logger.info('Qadiya Telegram Bot polling active');
      }).catch(err => {
        logger.error('Bot launch error:', err);
      });
      
      logger.info('Qadiya Telegram Bot started successfully');
      
      // Graceful shutdown
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async stop(signal) {
    logger.info(`Received ${signal}, shutting down...`);
    this.bot.stop(signal);
    await this.scraper.close();
    process.exit(0);
  }
}

module.exports = QadiyaBot;
