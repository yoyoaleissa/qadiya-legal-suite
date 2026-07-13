const logger = require('../utils/logger');

/**
 * CAPTCHA Solver using AI Vision (Gemini Flash)
 * Reads the 4-digit CAPTCHA from the MOJ portal using an LLM with vision capabilities.
 * This is free and ~95%+ accurate on simple digit CAPTCHAs.
 * 
 * Falls back to 2captcha if configured, or random guess as last resort.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const CAPTCHA_MODEL = process.env.CAPTCHA_MODEL || 'gemini-3-flash-preview';
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY; // Optional 2captcha fallback

/**
 * Solve CAPTCHA using AI Vision (primary) or 2captcha (fallback)
 * @param {string} imageBase64 - Base64 encoded CAPTCHA image
 * @returns {string} The 4-digit CAPTCHA solution
 */
async function solveCaptcha(imageBase64) {
  // Primary method: AI Vision
  if (OPENAI_API_KEY) {
    try {
      const result = await solveWithVision(imageBase64);
      if (result) return result;
    } catch (error) {
      logger.warn('AI Vision CAPTCHA solving failed:', error.message);
    }
  }

  // Fallback: 2captcha service
  if (CAPTCHA_API_KEY) {
    try {
      const result = await solveWith2Captcha(imageBase64);
      if (result) return result;
    } catch (error) {
      logger.warn('2captcha fallback failed:', error.message);
    }
  }

  // Last resort: random guess (will trigger retry in scraper)
  logger.warn('All CAPTCHA methods failed, returning random digits');
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Solve CAPTCHA using AI Vision API (Gemini Flash)
 * @param {string} imageBase64 - Base64 encoded CAPTCHA image
 * @returns {string|null} The 4-digit solution or null if failed
 */
async function solveWithVision(imageBase64, attempt = 1) {
  const prompts = [
    'What 4 digits are shown in this image? Reply with ONLY the 4 digits, nothing else.',
    'This is a CAPTCHA image containing exactly 4 numerical digits. The digits may be different colors (red, black, blue). Ignore any lines or noise. What are the 4 digits from left to right? Reply with ONLY the 4 digits, no spaces, no explanation.'
  ];

  const prompt = prompts[Math.min(attempt - 1, prompts.length - 1)];

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CAPTCHA_MODEL,
      thinking: { budget_tokens: 100 },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 500
    })
  });

  const data = await response.json();

  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    const content = data.choices[0].message.content.trim();
    
    // Check if it's exactly 4 digits
    if (/^\d{4}$/.test(content)) {
      logger.info(`CAPTCHA solved via AI Vision (attempt ${attempt}): ${content}`);
      return content;
    }

    // Try to extract 4 digits from the response
    const digits = content.replace(/\D/g, '');
    if (digits.length >= 4) {
      const result = digits.substring(0, 4);
      logger.info(`CAPTCHA extracted from AI Vision (attempt ${attempt}): ${result}`);
      return result;
    }

    // If first attempt failed, try with more detailed prompt
    if (attempt < 2) {
      logger.warn(`AI Vision returned "${content}", retrying with detailed prompt...`);
      return await solveWithVision(imageBase64, attempt + 1);
    }
  }

  logger.warn('AI Vision returned no usable content');
  return null;
}

/**
 * Solve CAPTCHA using 2captcha service (paid fallback)
 */
async function solveWith2Captcha(imageBase64) {
  const https = require('https');

  // Submit to 2captcha
  const submitResult = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      key: CAPTCHA_API_KEY,
      method: 'base64',
      body: imageBase64,
      numeric: 1,
      min_len: 4,
      max_len: 4,
      json: 1
    });

    const options = {
      hostname: '2captcha.com',
      path: '/in.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid 2captcha response')); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!submitResult.status || !submitResult.request) {
    throw new Error('2captcha submit failed: ' + JSON.stringify(submitResult));
  }

  // Poll for result
  const captchaId = submitResult.request;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await new Promise((resolve, reject) => {
      https.get(
        `https://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${captchaId}&json=1`,
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('Invalid response')); }
          });
        }
      ).on('error', reject);
    });

    if (result.status === 1) {
      logger.info(`CAPTCHA solved via 2captcha: ${result.request}`);
      return result.request;
    }
    if (result.request !== 'CAPCHA_NOT_READY') {
      throw new Error('2captcha error: ' + result.request);
    }
  }

  throw new Error('2captcha timeout');
}

module.exports = { solveCaptcha };
