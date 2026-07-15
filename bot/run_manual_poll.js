require('dotenv').config();
const { Telegraf } = require('telegraf');
const { MojScraper } = require('./src/scraper/mojScraper');
const { generateCasePDF } = require('./src/pdf/pdfGenerator');
const { syncCase } = require('./src/sync/supabaseSync');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const https = require('https');

['output', 'logs', 'fonts'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const scraper = new MojScraper();
scraper.init();
const activeRequests = new Map();

// Simple fetch wrapper
function tgApi(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${API_BASE}/${method}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 60000
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch(e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendMessage(chatId, text, opts = {}) {
  return tgApi('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...opts });
}

async function sendDocument(chatId, filePath, filename, caption) {
  // Use fetch for multipart
  const FormData = (await import('node-fetch')).default ? null : null;
  // Fallback: use telegraf's telegram instance just for sending
  const { Telegram } = require('telegraf');
  const tg = new Telegram(BOT_TOKEN);
  return tg.sendDocument(chatId, { source: filePath, filename }, { caption, parse_mode: 'Markdown' });
}

async function processMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = (msg.text || '').trim();
  
  if (!text || text.startsWith('/start')) {
    await sendMessage(chatId, '🏛️ *QADIYA Bot*\nأرسل الرقم الآلي (6-12 رقم)\n*مثال:* `222486500`');
    return;
  }
  if (text.startsWith('/')) return;

  let caseNumber = text.replace(/[\s\/\-]/g, '');
  logger.info(`Message from ${msg.from.first_name}: "${text}" → "${caseNumber}"`);

  if (!/^\d{6,12}$/.test(caseNumber)) {
    await sendMessage(chatId, '⚠️ أرسل الرقم الآلي (6-12 رقم فقط)\nمثال: `222486500`');
    return;
  }

  if (activeRequests.has(userId)) {
    await sendMessage(chatId, '⏳ جاري معالجة طلبك السابق...');
    return;
  }

  activeRequests.set(userId, true);
  try {
    await sendMessage(chatId, `🔍 *جاري البحث عن ${caseNumber}...*\n⏳ 15-30 ثانية`);
    const result = await scraper.scrapeCase(caseNumber);

    if (!result.success) {
      await sendMessage(chatId, `❌ فشل: \`${caseNumber}\`\n${result.error || ''}\n_حاول مرة أخرى_`);
      return;
    }

    syncCase(result, caseNumber).catch(e => logger.warn(`Sync: ${e.message}`));
    const pdfPath = await generateCasePDF(result);
    await sendDocument(chatId, pdfPath, `Qadiya_${caseNumber}.pdf`, `✅ *تقرير قضية ${caseNumber}*\n_Powered by Qadiya AI 🤖_`);
    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch(e){} }, 5000);
    logger.info(`✅ Done: ${caseNumber}`);
  } catch (error) {
    logger.error(`Error ${caseNumber}: ${error.message}`);
    await sendMessage(chatId, `❌ خطأ: \`${caseNumber}\`\n_حاول لاحقاً_`);
  } finally {
    activeRequests.delete(userId);
  }
}

// Manual polling loop
let offset = 0;
async function poll() {
  while (true) {
    try {
      const resp = await tgApi('getUpdates', { offset, timeout: 5, limit: 10 });
      if (resp.ok && resp.result && resp.result.length > 0) {
        for (const update of resp.result) {
          offset = update.update_id + 1;
          if (update.message) {
            processMessage(update.message).catch(e => logger.error(`Handler error: ${e.message}`));
          }
        }
      }
    } catch (err) {
      logger.warn(`Poll error: ${err.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

logger.info('=== Qadiya Bot (Manual Poll Mode) ===');
logger.info(`Token: ${BOT_TOKEN ? 'SET' : 'MISSING'}`);
logger.info(`AI: ${process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'}`);

// Delete webhook first, then start polling
tgApi('deleteWebhook', { drop_pending_updates: false }).then(() => {
  logger.info('🟢 Webhook cleared, starting manual poll...');
  poll();
}).catch(err => {
  logger.error('deleteWebhook failed, starting anyway:', err.message);
  poll();
});
