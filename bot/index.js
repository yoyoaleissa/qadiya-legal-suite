require('dotenv').config();
const QadiyaBot = require('./src/bot/telegramBot');
const logger = require('./src/utils/logger');

// Ensure required directories exist
const fs = require('fs');
const path = require('path');

const dirs = ['output', 'logs', 'fonts'];
for (const dir of dirs) {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Start the bot
async function main() {
  logger.info('=== Qadiya Bot Starting ===');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CAPTCHA Solver: AI Vision (${process.env.CAPTCHA_MODEL || 'gemini-3-flash-preview'})${process.env.CAPTCHA_API_KEY ? ' + 2captcha fallback' : ''}`);
  logger.info(`Telegram Token: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'NOT CONFIGURED'}`);

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger.error('TELEGRAM_BOT_TOKEN is required. Please set it in .env file.');
    process.exit(1);
  }

  const bot = new QadiyaBot();
  await bot.start();
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
