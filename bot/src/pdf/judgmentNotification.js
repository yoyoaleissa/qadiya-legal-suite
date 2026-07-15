const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(__dirname, '../../output');

/**
 * Generate a Smart Judgment Notification PDF
 * This replaces the basic 5-line lawyer letter with a full AI-powered dossier
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.caseNumber - Case number (e.g., "5478/2026")
 * @param {string} params.autoNumber - MOJ auto number
 * @param {string} params.clientName - Client name
 * @param {string} params.opponentName - Opponent/plaintiff name
 * @param {string} params.court - Court name
 * @param {string} params.circuit - Circuit number
 * @param {string} params.courtType - Court type (تجاري مدني جزئي, etc.)
 * @param {string} params.judgmentDate - Judgment date (YYYY-MM-DD)
 * @param {string} params.ruling - Ruling text
 * @param {number} params.amount - Amount in KD (if monetary)
 * @param {string} params.clientRole - Client role (مدعي/مدعي عليه)
 * @param {string} params.lawyerName - Lawyer name
 * @param {string} params.firmName - Law firm name
 * @param {Object} params.caseData - Full scraped case data (optional)
 * @param {Object} params.aiAnalysis - AI-generated analysis (optional)
 */
async function generateJudgmentNotification(params) {
  const filename = `Judgment_${params.caseNumber.replace('/', '-')}_Notification.pdf`;
  const filepath = path.join(OUTPUT_DIR, filename);

  let browser = null;

  try {
    // Calculate appeal deadline (30 days from judgment in Kuwait)
    const judgmentDate = new Date(params.judgmentDate);
    const appealDeadline = new Date(judgmentDate);
    appealDeadline.setDate(appealDeadline.getDate() + 30);
    
    const today = new Date();
    const daysRemaining = Math.ceil((appealDeadline - today) / (1000 * 60 * 60 * 24));
    
    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(
      `https://eservices.moj.gov.kw/searchCriteria/searchByCase.jsp`,
      { width: 90, margin: 1, color: { dark: '#1B3A5C', light: '#ffffff' } }
    );

    // Build Google Calendar link for appeal deadline
    const appealDateStr = appealDeadline.toISOString().split('T')[0].replace(/-/g, '');
    const calTitle = encodeURIComponent(`⚠️ آخر موعد استئناف - قضية ${params.caseNumber}`);
    const calDetails = encodeURIComponent(
      `آخر موعد لتقديم الاستئناف\n` +
      `القضية: ${params.caseNumber}\n` +
      `المدعي: ${params.opponentName}\n` +
      `المبلغ: ${params.amount} د.ك\n` +
      `المحكمة: ${params.court} - ${params.courtType}\n\n` +
      `⚠️ تنبيه: فوات هذا الموعد يعني أن الحكم يصبح نهائياً`
    );
    const calLocation = encodeURIComponent(params.court || 'محكمة الكويت');
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${appealDateStr}/${appealDateStr}&details=${calDetails}&location=${calLocation}`;

    // Build Google Tasks link (using Google Tasks URL scheme)
    const taskTitle = encodeURIComponent(`استئناف قضية ${params.caseNumber} - ${params.opponentName}`);
    const taskDetails = encodeURIComponent(`المبلغ: ${params.amount} د.ك | آخر موعد: ${appealDeadline.toLocaleDateString('en-GB')}`);
    const tasksLink = `https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1`;

    // Build reminder calendar event (7 days before deadline)
    const reminderDate = new Date(appealDeadline);
    reminderDate.setDate(reminderDate.getDate() - 7);
    const reminderDateStr = reminderDate.toISOString().split('T')[0].replace(/-/g, '');
    const reminderTitle = encodeURIComponent(`🔔 تذكير: 7 أيام متبقية للاستئناف - قضية ${params.caseNumber}`);
    const reminderLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${reminderTitle}&dates=${reminderDateStr}/${reminderDateStr}&details=${calDetails}&location=${calLocation}`;

    const html = buildNotificationHTML(params, {
      appealDeadline,
      daysRemaining,
      calendarLink,
      reminderLink,
      tasksLink,
      qrDataUrl,
      today
    });

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
    });

    await page.close();
    const size = (fs.statSync(filepath).size / 1024).toFixed(0);
    logger.info(`Judgment Notification PDF generated: ${filepath} (${size} KB)`);
    return filepath;

  } catch (error) {
    logger.error('Judgment Notification PDF generation failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

function buildNotificationHTML(params, computed) {
  const { appealDeadline, daysRemaining, calendarLink, reminderLink, tasksLink, qrDataUrl, today } = computed;
  const judgmentDate = new Date(params.judgmentDate);
  
  // Urgency level
  let urgencyColor, urgencyBg, urgencyText, urgencyIcon;
  if (daysRemaining <= 7) {
    urgencyColor = '#dc2626'; urgencyBg = '#fef2f2'; urgencyText = 'عاجل جداً / CRITICAL'; urgencyIcon = '🚨';
  } else if (daysRemaining <= 14) {
    urgencyColor = '#ea580c'; urgencyBg = '#fff7ed'; urgencyText = 'عاجل / URGENT'; urgencyIcon = '⚠️';
  } else if (daysRemaining <= 21) {
    urgencyColor = '#d97706'; urgencyBg = '#fffbeb'; urgencyText = 'مهم / IMPORTANT'; urgencyIcon = '⏰';
  } else {
    urgencyColor = '#16a34a'; urgencyBg = '#f0fdf4'; urgencyText = 'متاح / ON TRACK'; urgencyIcon = '✅';
  }

  // Risk assessment
  const riskItems = [];
  if (params.amount > 5000) {
    riskItems.push({ level: 'HIGH', text: `المبلغ المحكوم به (${params.amount.toLocaleString()} د.ك) يتجاوز 5,000 د.ك — يُنصح بالاستئناف`, textEn: 'Amount exceeds KD 5,000 — appeal recommended' });
  } else if (params.amount > 1000) {
    riskItems.push({ level: 'MED', text: `المبلغ المحكوم به (${params.amount.toLocaleString()} د.ك) — تقييم جدوى الاستئناف مطلوب`, textEn: 'Moderate amount — evaluate appeal feasibility' });
  } else {
    riskItems.push({ level: 'LOW', text: `المبلغ المحكوم به (${params.amount.toLocaleString()} د.ك) — قد يكون السداد أجدى من الاستئناف`, textEn: 'Low amount — payment may be more cost-effective than appeal' });
  }
  
  if (daysRemaining <= 10) {
    riskItems.push({ level: 'HIGH', text: `بقي ${daysRemaining} يوم فقط على انتهاء مهلة الاستئناف`, textEn: `Only ${daysRemaining} days remaining for appeal` });
  }
  
  riskItems.push({ level: 'INFO', text: 'عدم الاستئناف خلال 30 يوم يجعل الحكم نهائياً وقابلاً للتنفيذ الجبري', textEn: 'Failure to appeal within 30 days makes the judgment final and enforceable' });
  riskItems.push({ level: 'INFO', text: 'يمكن للمدعي التقدم بطلب تنفيذ فوري بعد انتهاء مهلة الاستئناف', textEn: 'Plaintiff can file for immediate enforcement after appeal deadline' });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Arabic', 'Inter', sans-serif;
    font-size: 9.5px;
    color: #1f2937;
    line-height: 1.6;
    direction: rtl;
    background: white;
  }

  .page { padding: 0; }

  /* Top Banner */
  .top-banner {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
    color: white;
    padding: 18px 24px;
    border-radius: 10px;
    margin-bottom: 10px;
    position: relative;
    overflow: hidden;
  }
  .top-banner::before {
    content: '';
    position: absolute;
    top: -50%; right: -20%;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
    border-radius: 50%;
  }
  .banner-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .banner-brand { font-size: 24px; font-weight: 900; letter-spacing: 3px; }
  .banner-subtitle { font-size: 9px; font-weight: 300; opacity: 0.7; margin-top: 3px; }
  .banner-type { 
    background: rgba(255,255,255,0.15); 
    border: 1px solid rgba(255,255,255,0.3);
    padding: 4px 14px; 
    border-radius: 20px; 
    font-size: 9px; 
    font-weight: 600;
    backdrop-filter: blur(4px);
  }
  .banner-case { font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif; margin-top: 8px; }
  .banner-date { font-size: 8px; opacity: 0.6; font-family: 'Inter', sans-serif; margin-top: 2px; }

  /* URGENT ALERT */
  .alert-box {
    background: ${urgencyBg};
    border: 2px solid ${urgencyColor};
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .alert-left { flex: 1; }
  .alert-badge {
    display: inline-block;
    background: ${urgencyColor};
    color: white;
    padding: 3px 12px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .alert-title { font-size: 12px; font-weight: 800; color: ${urgencyColor}; }
  .alert-subtitle { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .alert-right { text-align: center; }
  .countdown-number {
    font-size: 36px;
    font-weight: 900;
    color: ${urgencyColor};
    font-family: 'Inter', sans-serif;
    line-height: 1;
  }
  .countdown-label { font-size: 9px; color: ${urgencyColor}; font-weight: 600; }

  /* Judgment Summary */
  .judgment-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 10px;
  }
  .judgment-title { font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 8px; }
  .judgment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .judgment-item { display: flex; gap: 8px; }
  .judgment-label { font-size: 8.5px; color: #64748b; min-width: 80px; }
  .judgment-value { font-size: 9px; font-weight: 600; color: #1e293b; }
  .judgment-ruling {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    grid-column: 1 / -1;
  }
  .ruling-text {
    font-size: 12px;
    font-weight: 800;
    color: #dc2626;
    text-align: center;
    padding: 8px;
    background: #fef2f2;
    border-radius: 6px;
    border: 1px solid #fecaca;
  }
  .ruling-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    direction: ltr;
  }

  /* Timeline */
  .timeline-section {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .timeline-header {
    background: linear-gradient(90deg, #1e3a5f, #2563eb);
    color: white;
    padding: 6px 14px;
    font-size: 10px;
    font-weight: 700;
  }
  .timeline-body { padding: 12px 16px; }
  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 0;
    position: relative;
  }
  .timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 5px;
    top: 18px;
    bottom: -5px;
    width: 2px;
    background: #e2e8f0;
  }
  .timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .timeline-dot.past { background: #94a3b8; }
  .timeline-dot.current { background: #dc2626; border: 2px solid #fca5a5; }
  .timeline-dot.future { background: #f59e0b; border: 2px solid #fde68a; }
  .timeline-dot.deadline { background: #dc2626; border: 3px solid #fca5a5; }
  .timeline-content { flex: 1; }
  .timeline-date { font-size: 8.5px; font-family: 'Inter', sans-serif; color: #64748b; font-weight: 500; }
  .timeline-text { font-size: 9px; font-weight: 600; color: #1e293b; }
  .timeline-note { font-size: 8px; color: #6b7280; margin-top: 1px; }

  /* Risk Assessment */
  .risk-section {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .risk-header {
    background: linear-gradient(90deg, #7f1d1d, #b91c1c);
    color: white;
    padding: 6px 14px;
    font-size: 10px;
    font-weight: 700;
  }
  .risk-body { padding: 10px 14px; }
  .risk-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .risk-item:last-child { border-bottom: none; }
  .risk-badge {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 7px;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .risk-badge.HIGH { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .risk-badge.MED { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
  .risk-badge.LOW { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .risk-badge.INFO { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
  .risk-text { font-size: 9px; color: #374151; line-height: 1.5; }
  .risk-text-en { font-size: 8px; color: #6b7280; direction: ltr; text-align: left; }

  /* Action Links */
  .actions-section {
    margin-bottom: 10px;
    border: 2px solid #1e40af;
    border-radius: 10px;
    overflow: hidden;
  }
  .actions-header {
    background: linear-gradient(90deg, #1e3a8a, #3b82f6);
    color: white;
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }
  .actions-body { padding: 12px 16px; }
  .action-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    margin-bottom: 6px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .action-icon { font-size: 18px; }
  .action-content { flex: 1; }
  .action-title { font-size: 10px; font-weight: 700; color: #1e293b; }
  .action-desc { font-size: 8px; color: #64748b; margin-top: 1px; }
  .action-link {
    font-size: 7.5px;
    color: #2563eb;
    word-break: break-all;
    direction: ltr;
    text-align: left;
    margin-top: 3px;
    font-family: 'JetBrains Mono', monospace;
    background: #eff6ff;
    padding: 3px 6px;
    border-radius: 3px;
    display: block;
  }

  /* Options Section */
  .options-section {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .options-header {
    background: linear-gradient(90deg, #064e3b, #059669);
    color: white;
    padding: 6px 14px;
    font-size: 10px;
    font-weight: 700;
  }
  .options-body { padding: 10px 14px; }
  .option-card {
    padding: 8px 12px;
    margin-bottom: 6px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .option-card.recommended { border-color: #16a34a; background: #f0fdf4; }
  .option-title { font-size: 10px; font-weight: 700; color: #1e293b; }
  .option-title .rec-badge { 
    background: #16a34a; color: white; padding: 1px 6px; border-radius: 3px; 
    font-size: 7px; margin-right: 6px; 
  }
  .option-desc { font-size: 8.5px; color: #4b5563; margin-top: 3px; line-height: 1.5; }
  .option-pros { font-size: 8px; color: #16a34a; margin-top: 3px; }
  .option-cons { font-size: 8px; color: #dc2626; margin-top: 1px; }

  /* Footer */
  .footer {
    margin-top: 10px;
    padding: 10px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-left {}
  .footer-brand { font-size: 12px; font-weight: 900; color: #1e3a5f; letter-spacing: 2px; }
  .footer-text { font-size: 7.5px; color: #94a3b8; line-height: 1.6; margin-top: 3px; }
  .footer-disclaimer { 
    font-size: 7px; color: #dc2626; margin-top: 4px; 
    padding: 3px 8px; background: #fef2f2; border-radius: 3px; 
    display: inline-block;
  }
  .footer-qr { width: 60px; height: 60px; }
</style>
</head>
<body>
<div class="page">

<!-- TOP BANNER -->
<div class="top-banner">
  <div class="banner-row">
    <div>
      <div class="banner-brand">QADIYA</div>
      <div class="banner-subtitle">إشعار حكم ذكي — Smart Judgment Notification</div>
      <div class="banner-case">القضية ${params.caseNumber}</div>
      <div class="banner-date">Generated: ${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${today.toTimeString().substring(0, 5)} KWT</div>
    </div>
    <div style="text-align:left;">
      <div class="banner-type">${urgencyIcon} ${urgencyText}</div>
    </div>
  </div>
</div>

<!-- APPEAL DEADLINE ALERT -->
<div class="alert-box">
  <div class="alert-left">
    <div class="alert-badge">${urgencyIcon} APPEAL DEADLINE / مهلة الاستئناف</div>
    <div class="alert-title">آخر موعد للاستئناف: ${appealDeadline.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div class="alert-subtitle">${appealDeadline.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
  <div class="alert-right">
    <div class="countdown-number">${daysRemaining}</div>
    <div class="countdown-label">يوم متبقي<br>days left</div>
  </div>
</div>

<!-- JUDGMENT SUMMARY -->
<div class="judgment-card">
  <div class="judgment-title">📋 ملخص الحكم / Judgment Summary</div>
  <div class="judgment-grid">
    <div class="judgment-item"><span class="judgment-label">رقم القضية:</span><span class="judgment-value">${params.caseNumber}</span></div>
    <div class="judgment-item"><span class="judgment-label">تاريخ الحكم:</span><span class="judgment-value">${judgmentDate.toLocaleDateString('en-GB')}</span></div>
    <div class="judgment-item"><span class="judgment-label">المحكمة:</span><span class="judgment-value">${params.court} — ${params.courtType}</span></div>
    <div class="judgment-item"><span class="judgment-label">الدائرة:</span><span class="judgment-value">${params.circuit}</span></div>
    <div class="judgment-item"><span class="judgment-label">المدعي:</span><span class="judgment-value">${params.opponentName}</span></div>
    <div class="judgment-item"><span class="judgment-label">صفة الموكل:</span><span class="judgment-value">${params.clientRole}</span></div>
    <div class="judgment-ruling">
      <div class="ruling-text">
        ${params.ruling}<br>
        <span class="ruling-amount">KD ${params.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })}</span>
      </div>
    </div>
  </div>
</div>

<!-- CRITICAL TIMELINE -->
<div class="timeline-section">
  <div class="timeline-header">📅 الجدول الزمني الحرج / Critical Timeline</div>
  <div class="timeline-body">
    <div class="timeline-item">
      <div class="timeline-dot past"></div>
      <div class="timeline-content">
        <div class="timeline-date">${judgmentDate.toLocaleDateString('en-GB')}</div>
        <div class="timeline-text">صدور الحكم — Judgment Issued</div>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-dot current"></div>
      <div class="timeline-content">
        <div class="timeline-date">${today.toLocaleDateString('en-GB')}</div>
        <div class="timeline-text">اليوم — Today (Day ${30 - daysRemaining} of 30)</div>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-dot future"></div>
      <div class="timeline-content">
        <div class="timeline-date">${new Date(appealDeadline.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</div>
        <div class="timeline-text">🔔 تذكير: 7 أيام متبقية — Reminder: 7 days left</div>
        <div class="timeline-note">آخر فرصة مريحة لتقديم الاستئناف</div>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-dot deadline"></div>
      <div class="timeline-content">
        <div class="timeline-date">${appealDeadline.toLocaleDateString('en-GB')}</div>
        <div class="timeline-text">⛔ انتهاء مهلة الاستئناف — Appeal Deadline</div>
        <div class="timeline-note">بعد هذا التاريخ يصبح الحكم نهائياً</div>
      </div>
    </div>
  </div>
</div>

<!-- RISK ASSESSMENT -->
<div class="risk-section">
  <div class="risk-header">⚠️ تقييم المخاطر / Risk Assessment</div>
  <div class="risk-body">
    ${riskItems.map(r => `
      <div class="risk-item">
        <span class="risk-badge ${r.level}">${r.level}</span>
        <div>
          <div class="risk-text">${r.text}</div>
          <div class="risk-text-en">${r.textEn}</div>
        </div>
      </div>
    `).join('')}
  </div>
</div>

<!-- YOUR OPTIONS -->
<div class="options-section">
  <div class="options-header">💡 الخيارات المتاحة / Available Options</div>
  <div class="options-body">
    <div class="option-card ${params.amount > 2000 ? 'recommended' : ''}">
      <div class="option-title">${params.amount > 2000 ? '<span class="rec-badge">مُوصى به</span>' : ''}الخيار 1: الاستئناف</div>
      <div class="option-desc">تقديم طعن بالاستئناف خلال 30 يوم من تاريخ الحكم. يتطلب رسوم قضائية وأتعاب محاماة إضافية.</div>
      <div class="option-pros">✓ فرصة لإلغاء أو تخفيض الحكم | ✓ وقف التنفيذ مؤقتاً</div>
      <div class="option-cons">✗ تكاليف إضافية | ✗ وقت أطول | ✗ لا ضمان للنتيجة</div>
    </div>
    <div class="option-card ${params.amount <= 2000 ? 'recommended' : ''}">
      <div class="option-title">${params.amount <= 2000 ? '<span class="rec-badge">مُوصى به</span>' : ''}الخيار 2: السداد</div>
      <div class="option-desc">سداد المبلغ المحكوم به (${params.amount.toLocaleString()} د.ك) وإغلاق الملف نهائياً.</div>
      <div class="option-pros">✓ إنهاء فوري | ✓ تجنب تكاليف إضافية | ✓ حماية السمعة التجارية</div>
      <div class="option-cons">✗ دفع كامل المبلغ | ✗ لا فرصة للطعن لاحقاً</div>
    </div>
    <div class="option-card">
      <div class="option-title">الخيار 3: التسوية</div>
      <div class="option-desc">التواصل مع المدعي (${params.opponentName}) للوصول لتسوية ودية بمبلغ أقل أو بالتقسيط.</div>
      <div class="option-pros">✓ تخفيض محتمل | ✓ مرونة في السداد | ✓ حفظ العلاقة التجارية</div>
      <div class="option-cons">✗ يتطلب موافقة الطرف الآخر | ✗ قد لا ينجح</div>
    </div>
  </div>
</div>

<!-- ACTION LINKS -->
<div class="actions-section">
  <div class="actions-header">🔗 إجراءات فورية — One-Click Actions</div>
  <div class="actions-body">
    <div class="action-row">
      <div class="action-icon">📆</div>
      <div class="action-content">
        <div class="action-title">إضافة موعد الاستئناف للتقويم</div>
        <div class="action-desc">Add appeal deadline to Google Calendar (${appealDeadline.toLocaleDateString('en-GB')})</div>
        <a class="action-link" href="${calendarLink}">${calendarLink.substring(0, 90)}...</a>
      </div>
    </div>
    <div class="action-row">
      <div class="action-icon">🔔</div>
      <div class="action-content">
        <div class="action-title">تذكير قبل 7 أيام من الموعد</div>
        <div class="action-desc">Set reminder 7 days before deadline (${new Date(appealDeadline.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')})</div>
        <a class="action-link" href="${reminderLink}">${reminderLink.substring(0, 90)}...</a>
      </div>
    </div>
    <div class="action-row">
      <div class="action-icon">✅</div>
      <div class="action-content">
        <div class="action-title">إضافة مهمة: متابعة الاستئناف</div>
        <div class="action-desc">Add to Google Tasks: "File appeal for case ${params.caseNumber}"</div>
        <a class="action-link" href="${tasksLink}">tasks.google.com</a>
      </div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-left">
    <div class="footer-brand">QADIYA</div>
    <div class="footer-text">
      AI-Powered Legal Intelligence — إشعار حكم ذكي<br>
      مصدر البيانات: وزارة العدل الكويتية — بوابة العدل الإلكترونية
    </div>
    <div class="footer-disclaimer">⚠️ هذا التقرير للاسترشاد فقط وليس بديلاً عن الاستشارة القانونية</div>
  </div>
  <img class="footer-qr" src="${qrDataUrl}" alt="QR" />
</div>

</div>
</body>
</html>`;
}

module.exports = { generateJudgmentNotification };
