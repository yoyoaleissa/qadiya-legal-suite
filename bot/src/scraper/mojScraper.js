/**
 * MOJ Scraper - Kuwait Ministry of Justice Case Inquiry
 * Full dossier extraction including deep data (hearings, judgments, file location)
 * 
 * Endpoints:
 * 1. GET /searchCriteria/searchByCase.jsp (establish session)
 * 2. GET /captcha/imgCaptcha.jsp (get captcha image)
 * 3. POST /viewResults/validateCase.jsp (submit case + captcha)
 * 4. POST /viewResults/finsView.jsp (first-instance court data)
 * 5. POST /viewResults/applView.jsp (appeal court data)
 * 6. POST /viewResults/execView.jsp (execution data)
 * 7. POST /viewResults/poliView.jsp (police/prosecution data)
 * 8. POST /viewResults/viewLastEvents.jsp (timeline events)
 * 9. POST /viewResults/viewMeetings.jsp (hearings per court entry)
 * 10. POST /viewResults/viewVerds.jsp (judgments per court entry)
 * 11. POST /viewResults/fileLocation.jsp (file location)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { solveCaptcha } = require('./captchaSolver');
const logger = require('../utils/logger');

const BASE_URL = 'https://eservices.moj.gov.kw';
const MAX_ATTEMPTS = 5;

class MojScraper {
  constructor() {
    this.client = null;
    this.cookies = '';
  }

  init() {
    logger.info('MOJ Scraper initialized (HTTP mode - full dossier with deep data)');
  }

  close() {}

  createSession() {
    this.cookies = '';
    
    const instance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
      },
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: (status) => status < 600 // Accept all to handle 500s gracefully
    });

    instance.interceptors.response.use(response => {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const newCookies = setCookies.map(c => c.split(';')[0]);
        const cookieMap = {};
        if (this.cookies) {
          this.cookies.split('; ').forEach(c => {
            const eqIdx = c.indexOf('=');
            if (eqIdx > 0) cookieMap[c.substring(0, eqIdx)] = c;
          });
        }
        newCookies.forEach(c => {
          const eqIdx = c.indexOf('=');
          if (eqIdx > 0) cookieMap[c.substring(0, eqIdx)] = c;
        });
        this.cookies = Object.values(cookieMap).join('; ');
      }
      return response;
    });

    instance.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers['Cookie'] = this.cookies;
      }
      return config;
    });

    this.client = instance;
  }

  /**
   * Main scrape function - returns comprehensive case dossier with deep data
   */
  async scrapeCase(caseNumber) {
    logger.info(`Scraping case (full dossier + deep data): ${caseNumber}`);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${MAX_ATTEMPTS}`);
        this.createSession();

        // Step 1: Load search page
        await this.client.get('/searchCriteria/searchByCase.jsp');
        logger.info('Session established');

        // Step 2: Get CAPTCHA
        const captchaResp = await this.client.get('/captcha/imgCaptcha.jsp');
        const captchaBuffer = Buffer.from(captchaResp.data);
        if (captchaBuffer.length < 500) {
          logger.warn('Captcha too small, retrying...');
          continue;
        }

        // Step 3: Solve CAPTCHA
        const captchaBase64 = captchaBuffer.toString('base64');
        const captchaText = await solveCaptcha(captchaBase64);
        logger.info(`CAPTCHA solved: ${captchaText}`);

        if (!captchaText || !/^\d{4}$/.test(captchaText)) {
          logger.warn(`Invalid CAPTCHA: "${captchaText}"`);
          continue;
        }

        // Step 4: Submit form
        const formData = `txtCaseNo=${caseNumber}&txtCaptcha2=${captchaText}&searchType=0`;
        const submitResp = await this.client.post('/viewResults/validateCase.jsp', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': `${BASE_URL}/searchCriteria/searchByCase.jsp`
          }
        });

        const submitHtml = Buffer.from(submitResp.data).toString('utf-8');
        if (!submitHtml.includes(caseNumber)) {
          logger.warn(`CAPTCHA wrong (attempt ${attempt})`);
          await this.delay(1000);
          continue;
        }

        logger.info('Form submitted successfully');

        // Step 5: Extract all data sections
        const result = {
          success: true,
          caseNumber: caseNumber,
          firstInstance: [],    // First-instance court entries
          appeal: {},          // Appeal court data
          execution: {},       // Execution file data
          police: {},          // Police/prosecution data
          events: [],          // Full timeline
          hearings: [],        // Deep: hearings per court level
          judgments: [],       // Deep: judgments per court level
          scrapedAt: new Date().toISOString()
        };

        // 5a: First-instance court data (finsView.jsp)
        let finsLinkParams = [];
        try {
          const resp = await this.ajaxPost('/viewResults/finsView.jsp');
          const html = this.decodeWin1256(resp.data);
          result.firstInstance = this.parseFirstInstance(html);
          finsLinkParams = this.extractDealLinkParams(html);
          logger.info(`First instance: ${result.firstInstance.length} court entries, ${finsLinkParams.length} link params`);
        } catch (err) {
          logger.warn(`finsView failed: ${err.message}`);
        }

        // 5b: Appeal court data (applView.jsp)
        let applLinkParams = [];
        try {
          const resp = await this.ajaxPost('/viewResults/applView.jsp');
          const html = this.decodeWin1256(resp.data);
          result.appeal = this.parseAppeal(html);
          applLinkParams = this.extractDealLinkParams(html);
          logger.info(`Appeal: ${Object.keys(result.appeal).length} fields, ${applLinkParams.length} link params`);
        } catch (err) {
          logger.warn(`applView failed: ${err.message}`);
        }

        // 5c: Execution data (execView.jsp)
        try {
          const resp = await this.ajaxPost('/viewResults/execView.jsp');
          const html = this.decodeWin1256(resp.data);
          result.execution = this.parseExecution(html);
          logger.info(`Execution: ${Object.keys(result.execution).length} fields`);
        } catch (err) {
          logger.warn(`execView failed: ${err.message}`);
        }

        // 5d: Police/prosecution data (poliView.jsp)
        try {
          const resp = await this.ajaxPost('/viewResults/poliView.jsp');
          const html = this.decodeWin1256(resp.data);
          result.police = this.parsePolice(html);
          logger.info(`Police: ${Object.keys(result.police).length} fields`);
        } catch (err) {
          logger.warn(`poliView failed: ${err.message}`);
        }

        // 5e: Timeline events (viewLastEvents.jsp)
        try {
          const resp = await this.ajaxPost('/viewResults/viewLastEvents.jsp');
          const html = this.decodeWin1256(resp.data);
          result.events = this.parseEvents(html);
          logger.info(`Events: ${result.events.length} entries`);
        } catch (err) {
          logger.warn(`viewLastEvents failed: ${err.message}`);
        }

        // 5f: Deep data - Hearings and Judgments for each court level
        const allLinkParams = [...finsLinkParams, ...applLinkParams];
        
        for (const params of allLinkParams) {
          // Hearings (lnk=1)
          if (params.lnk === '1') {
            try {
              const hearingData = await this.fetchHearings(params);
              if (hearingData) {
                result.hearings.push(hearingData);
                logger.info(`Hearings for ${params.regno}: ${hearingData.sessions.length} sessions`);
              }
            } catch (err) {
              logger.warn(`Hearings failed for ${params.regno}: ${err.message}`);
            }
          }
          
          // Judgments (lnk=2)
          if (params.lnk === '2') {
            try {
              const judgmentData = await this.fetchJudgments(params);
              if (judgmentData) {
                result.judgments.push(judgmentData);
                logger.info(`Judgments for ${params.regno}: ${judgmentData.entries.length} entries`);
              }
            } catch (err) {
              logger.warn(`Judgments failed for ${params.regno}: ${err.message}`);
            }
          }
        }

        return result;

      } catch (error) {
        logger.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt < MAX_ATTEMPTS) await this.delay(2000);
      }
    }

    return {
      success: false,
      caseNumber: caseNumber,
      error: `Failed after ${MAX_ATTEMPTS} attempts. The MOJ portal may be temporarily unavailable.`
    };
  }

  /**
   * Extract dealLinkPages onclick parameters from HTML
   * Returns array of {lnk, flag, reg/regno, cco/ccode, typ/ctype, lvl, parent/parentV}
   */
  extractDealLinkParams(html) {
    const params = [];
    const regex = /dealLinkPages\('(\d+)',\s*'(\d+)',\s*'(\d+)',\s*'(\d+)',\s*'([^']+)',\s*'(\d+)',\s*(\d+)\)/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      params.push({
        lnk: match[1],
        flag: match[2],
        regno: match[3],
        ccode: match[4],
        ctype: match[5],
        lvl: match[6],
        parentV: match[7]
      });
    }
    
    return params;
  }

  /**
   * Fetch hearings (viewMeetings.jsp) for a court entry
   */
  async fetchHearings(params) {
    const postData = `iflag=${params.flag}&regno=${params.regno}&ccode=${params.ccode}&ctype=${params.ctype}&lvl=${params.lvl}&parentV=${params.parentV}`;
    
    const resp = await this.client.post('/viewResults/viewMeetings.jsp', postData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/viewResults/validCase.jsp`
      }
    });

    if (resp.status !== 200) return null;
    
    const html = this.decodeWin1256(resp.data);
    if (html.length < 200 || !html.includes('resultTable')) return null;
    
    return this.parseHearings(html, params);
  }

  /**
   * Parse hearings HTML response
   * Structure:
   * - Header table: الجهة, الدائرة, الرقم, سنة القضية
   * - Data table: م, تاريخ الجلسة, قرار المحكمة, رقم الدائرة, الجلسة التالية
   */
  parseHearings(html, params) {
    const $ = cheerio.load(html);
    const tables = $('table.resultTable');
    
    const result = {
      court: '',
      circuit: '',
      caseNo: '',
      year: '',
      regno: params.regno,
      lvl: params.lvl,
      sessions: []
    };

    // Parse header table (first table)
    if (tables.length >= 1) {
      const headerCells = $(tables[0]).find('td');
      headerCells.each((i, cell) => {
        const text = $(cell).text().trim();
        const prevTh = $(cell).prev('th');
        const label = prevTh.length ? prevTh.text().trim() : '';
        
        if (label === 'الجهة') result.court = text;
        else if (label === 'الدائرة') result.circuit = text;
        else if (label === 'الرقم') result.caseNo = text;
        else if (label === 'سنة القضية') result.year = text;
      });
    }

    // Parse sessions table (second table)
    if (tables.length >= 2) {
      $(tables[1]).find('tr').each((i, row) => {
        if (i === 0) return; // Skip header row
        const cells = $(row).find('td');
        if (cells.length >= 4) {
          const dateCell = $(cells[1]);
          // Extract date from the div with onclick
          let date = dateCell.text().trim();
          const decision = $(cells[2]).text().trim();
          const circuitNum = $(cells[3]).text().trim();
          const nextDate = cells.length >= 5 ? $(cells[4]).text().trim() : '-';
          
          // Extract getCirData params for bonus detail
          const onclickMatch = dateCell.html().match(/getCirData\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\)/);
          
          const session = {
            num: $(cells[0]).text().trim(),
            date,
            decision,
            circuitNum,
            nextDate: nextDate === '-' ? null : nextDate,
          };
          
          if (onclickMatch) {
            session.cirData = {
              court: onclickMatch[1],
              type: onclickMatch[2],
              date: onclickMatch[3],
              cirNum: onclickMatch[4],
              day: onclickMatch[5],
              regno: onclickMatch[6]
            };
          }
          
          result.sessions.push(session);
        }
      });
    }

    return result.sessions.length > 0 ? result : null;
  }

  /**
   * Fetch judgments (viewVerds.jsp) for a court entry
   */
  async fetchJudgments(params) {
    const postData = `iflag=${params.flag}&regno=${params.regno}&ccode=${params.ccode}&ctype=${params.ctype}&lvl=${params.lvl}&parentV=${params.parentV}`;
    
    const resp = await this.client.post('/viewResults/viewVerds.jsp', postData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/viewResults/validCase.jsp`
      }
    });

    if (resp.status !== 200) return null;
    
    const html = this.decodeWin1256(resp.data);
    if (html.length < 200 || !html.includes('resultTable')) return null;
    
    return this.parseJudgments(html, params);
  }

  /**
   * Parse judgments HTML response
   * Structure: م, تاريخ الحكم, الدرجة, منطوق الحكم, النوع, المبلغ, حالة السداد, التنفيذ
   */
  parseJudgments(html, params) {
    const $ = cheerio.load(html);
    
    const result = {
      regno: params.regno,
      lvl: params.lvl,
      entries: []
    };

    $('table.resultTable tr').each((i, row) => {
      if (i === 0) return; // Skip header
      const cells = $(row).find('td');
      if (cells.length >= 6) {
        // The ruling text is inside a button/modal - extract from modal-body or button text
        let ruling = '';
        const rulingCell = $(cells[3]);
        const modalBody = rulingCell.find('.modal-body');
        if (modalBody.length) {
          ruling = modalBody.text().trim();
        } else {
          const btn = rulingCell.find('button');
          ruling = btn.length ? btn.text().trim() : rulingCell.text().trim();
        }

        const entry = {
          num: $(cells[0]).text().trim(),
          date: $(cells[1]).text().trim(),
          degree: $(cells[2]).text().trim(),
          ruling: ruling,
          type: $(cells[4]).text().trim(),
          amount: cells.length >= 6 ? $(cells[5]).text().trim() : '',
          paymentStatus: cells.length >= 7 ? $(cells[6]).text().trim() : '',
          execution: cells.length >= 8 ? $(cells[7]).text().trim() : ''
        };
        
        result.entries.push(entry);
      }
    });

    return result.entries.length > 0 ? result : null;
  }

  /**
   * Helper: AJAX POST to an endpoint
   */
  async ajaxPost(path) {
    return this.client.post(path, '', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/viewResults/validCase.jsp`
      }
    });
  }

  /**
   * Decode windows-1256 response buffer
   */
  decodeWin1256(data) {
    return iconv.decode(Buffer.from(data), 'windows-1256');
  }

  /**
   * Parse first-instance court data from finsView.jsp
   */
  parseFirstInstance(html) {
    const $ = cheerio.load(html);
    const entries = [];
    
    // The finsView has a specific structure: HR-separated entries
    // Each entry has a TABLE with single-cell rows containing field values
    // Fields: الرقم الآلي, رقم القضية, سنة, تاريخ التسجيل, الدائرة/النوع, الجهة, الرصيد, حالة الملف, الموقع
    
    const fieldLabels = [
      'الرقم الآلي',
      'رقم القضية',
      'سنة القضية',
      'تاريخ التسجيل',
      'الدائرة',
      'الجهة',
      'الرصيد',
      'حالة الملف',
      'الموقع'
    ];

    // Split by HR tags to get individual entries
    const sections = html.split(/<HR>/i);
    
    for (const section of sections) {
      if (!section.includes('calss') && !section.includes('TABLE')) continue;
      const sec$ = cheerio.load(section);
      const tables = sec$('table');
      
      tables.each((i, table) => {
        const entry = {};
        const values = [];

        sec$(table).find('tr').each((j, row) => {
          const cells = sec$(row).find('td');
          if (cells.length === 1) {
            const value = sec$(cells[0]).text().trim();
            if (value && value !== 'الجلسات' && value !== 'الأحكام' && value !== 'مكان الملف' && value !== '|') {
              values.push(value);
            }
          } else if (cells.length === 2) {
            const label = sec$(cells[0]).text().trim();
            const value = sec$(cells[1]).text().trim();
            if (label && value) entry[label] = value;
          }
        });

        // Map single-cell values to labels
        if (values.length >= 3) {
          values.forEach((val, idx) => {
            if (idx < fieldLabels.length) {
              entry[fieldLabels[idx]] = val;
            }
          });
        }

        if (Object.keys(entry).length >= 3 && (entry['رقم القضية'] || entry['الرقم الآلي'])) {
          entries.push(entry);
        }
      });
    }

    // Deduplicate
    const seen = new Set();
    return entries.filter(e => {
      const key = e['الرقم الآلي'] || e['رقم القضية'] || JSON.stringify(e);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse appeal court data from applView.jsp
   */
  parseAppeal(html) {
    const $ = cheerio.load(html);
    const data = {};

    if (html.includes('عفوا') || html.includes('لا توجد بيانات')) {
      return data;
    }

    const fieldLabels = [
      'الرقم الآلي',
      'تاريخ التسجيل',
      'رقم القضية',
      'سنة القضية',
      'الدائرة',
      'الموقع',
      'حالة الملف',
      'المحكمة'
    ];

    const values = [];
    $('table').first().find('tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length === 1) {
        const value = $(cells[0]).text().trim();
        if (value && value !== 'الجلسات' && value !== 'الأحكام' && value !== 'مكان الملف' && value !== '|') {
          values.push(value);
        }
      } else if (cells.length === 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (label && value) data[label] = value;
      }
    });

    if (values.length >= 3) {
      values.forEach((val, idx) => {
        if (idx < fieldLabels.length) {
          data[fieldLabels[idx]] = val;
        }
      });
    }

    return data;
  }

  /**
   * Parse execution data from execView.jsp
   */
  parseExecution(html) {
    const $ = cheerio.load(html);
    const data = {};

    if (html.includes('عفوا') || html.includes('لا توجد بيانات')) {
      return data;
    }

    const fieldLabels = [
      'الرقم الآلي',
      'تاريخ التسجيل',
      'رقم الملف',
      'الجهة',
      'الرصيد',
      'حالة الملف'
    ];

    const values = [];
    $('table').first().find('tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length === 1) {
        const value = $(cells[0]).text().trim();
        if (value) values.push(value);
      } else if (cells.length === 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (label && value) data[label] = value;
      }
    });

    if (values.length >= 3) {
      values.forEach((val, idx) => {
        if (idx < fieldLabels.length) {
          data[fieldLabels[idx]] = val;
        }
      });
    }

    return data;
  }

  /**
   * Parse police/prosecution data from poliView.jsp
   */
  parsePolice(html) {
    const $ = cheerio.load(html);
    const data = { station: {}, prosecution: {} };

    if (html.includes('عفوا') || html.includes('لا توجد بيانات')) {
      return data;
    }

    const tables = $('table');
    
    if (tables.length >= 1) {
      $(tables[0]).find('tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length === 2) {
          const label = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (label && value) data.station[label] = value;
        } else if (cells.length === 1) {
          const value = $(cells[0]).text().trim();
          if (value && !value.includes('عفوا')) {
            const fields = ['رقم القضية في المخفر/الجهة', 'المخفر/الجهة', 'تاريخ الحادث/الطلب', 'تاريخ التسجيل بالمخفر/الجهة'];
            if (i < fields.length) data.station[fields[i]] = value;
          }
        }
      });
    }

    if (tables.length >= 2) {
      $(tables[1]).find('tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length === 2) {
          const label = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (label && value) data.prosecution[label] = value;
        } else if (cells.length === 1) {
          const value = $(cells[0]).text().trim();
          if (value && !value.includes('عفوا')) {
            const fields = ['رقم القضية في النيابة', 'نوع القضية', 'النيابة', 'تاريخ الورود للنيابة الجزئية', 'تاريخ الورود للنيابة الكلية', 'تاريخ الورود للمحكمة', 'تاريخ التسجيل بالمحكمة'];
            if (i < fields.length) data.prosecution[fields[i]] = value;
          }
        }
      });
    }

    return data;
  }

  /**
   * Parse timeline events from viewLastEvents.jsp
   */
  parseEvents(html) {
    const $ = cheerio.load(html);
    const events = [];

    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 3) {
        const num = $(cells[0]).text().trim();
        const date = $(cells[1]).text().trim();
        const action = $(cells[2]).text().trim();
        
        if (date && /\d{4}-\d{2}-\d{2}/.test(date)) {
          events.push({ num, date, action });
        }
      }
    });

    return events;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { MojScraper };
