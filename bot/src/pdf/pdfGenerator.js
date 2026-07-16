const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const { generateCaseSummary } = require('../ai/summaryGenerator');

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(__dirname, '../../output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate a premium multi-page case dossier PDF
 * Features: AI summary, hearings, judgments, Google Calendar links, QR code
 */
async function generateCasePDF(caseResult) {
  const { caseNumber } = caseResult;
  const filename = `Case_${caseNumber}_Report.pdf`;
  const filepath = path.join(OUTPUT_DIR, filename);

  let browser = null;

  try {
    // Generate AI summary in parallel with QR code
    const [aiSummary, qrDataUrl] = await Promise.all([
      generateCaseSummary(caseResult),
      QRCode.toDataURL(`https://eservices.moj.gov.kw/searchCriteria/searchByCase.jsp`, {
        width: 80, margin: 1, color: { dark: '#1B3A5C', light: '#ffffff' }
      })
    ]);

    const html = buildPremiumDossierHTML(caseResult, aiSummary, qrDataUrl);

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
      margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' }
    });

    await page.close();
    const size = (fs.statSync(filepath).size / 1024).toFixed(0);
    logger.info(`Premium PDF generated: ${filepath} (${size} KB)`);
    return filepath;

  } catch (error) {
    logger.error('PDF generation failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Build Google Calendar link for a hearing date
 */
// Escape any string that will be interpolated into the PDF HTML template.
// Scraped MOJ fields and LLM-generated summaries are untrusted and must never
// be rendered as live HTML inside the Puppeteer renderer.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Recursively HTML-escape all string values inside an object/array so any
// downstream template interpolation is inert.
function deepEscape(input) {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return escapeHtml(input);
  if (Array.isArray(input)) return input.map(deepEscape);
  if (typeof input === 'object') {
    const out = {};
    for (const k of Object.keys(input)) out[k] = deepEscape(input[k]);
    return out;
  }
  return input;
}

function buildCalendarLink(date, caseNumber, court, decision) {
  const startDate = String(date || '').replace(/-/g, '');
  const endDate = startDate; // Same day
  const title = encodeURIComponent(`جلسة قضية ${caseNumber}`);
  const details = encodeURIComponent(`${court}\nالقرار: ${decision}\nرقم القضية: ${caseNumber}`);
  const location = encodeURIComponent('محكمة الكويت');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
}

/**
 * Build the premium HTML for PDF generation
 */
function buildPremiumDossierHTML(data, aiSummary, qrDataUrl) {
  // Sanitize ALL scraped and AI-generated content before templating.
  // qrDataUrl is generated locally from a fixed URL so it is safe as-is.
  data = deepEscape(data);
  aiSummary = deepEscape(aiSummary);
  const { caseNumber, firstInstance, appeal, execution, police, events, hearings, judgments } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toTimeString().substring(0, 5);

  // Determine case status
  let statusText = 'غير محدد';
  let statusTextEn = 'Unknown';
  let statusColor = '#6b7280';
  let statusIcon = '⚪';
  
  if (events && events.length > 0) {
    const latestAction = events[0].action || '';
    if (latestAction.includes('حكم') || latestAction.includes('عدم قبول') || latestAction.includes('حفظ') || latestAction.includes('انقضاء')) {
      statusText = 'مغلقة';
      statusTextEn = 'CLOSED';
      statusColor = '#dc2626';
      statusIcon = '🔴';
    } else {
      statusText = 'نشطة';
      statusTextEn = 'ACTIVE';
      statusColor = '#16a34a';
      statusIcon = '🟢';
    }
  }

  // Find next hearing from hearings data
  const today = new Date().toISOString().split('T')[0];
  let nextHearing = null;
  let nextHearingCourt = '';
  
  if (hearings && hearings.length > 0) {
    for (const h of hearings) {
      for (const s of h.sessions) {
        if (s.nextDate && s.nextDate > today) {
          if (!nextHearing || s.nextDate < nextHearing.nextDate) {
            nextHearing = s;
            nextHearingCourt = h.court;
          }
        }
      }
    }
  }

  // Calculate days until next hearing
  let daysUntil = null;
  if (nextHearing && nextHearing.nextDate) {
    const nextDate = new Date(nextHearing.nextDate);
    const todayDate = new Date(today);
    daysUntil = Math.ceil((nextDate - todayDate) / (1000 * 60 * 60 * 24));
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Noto Sans Arabic', 'Inter', sans-serif;
    font-size: 9.5px;
    color: #1f2937;
    line-height: 1.5;
    direction: rtl;
    background: white;
  }

  .page-break { page-break-before: always; }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%);
    color: white;
    border-radius: 8px;
    margin-bottom: 12px;
    position: relative;
    overflow: hidden;
  }
  .header::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }
  .header-brand { font-size: 22px; font-weight: 800; letter-spacing: 2px; z-index: 1; }
  .header-brand span { display: block; font-size: 8.5px; font-weight: 300; opacity: 0.7; margin-top: 3px; letter-spacing: 0; }
  .header-right { text-align: left; z-index: 1; }
  .header-right .case-num { font-size: 14px; font-weight: 700; font-family: 'Inter', sans-serif; }
  .header-right .meta { font-size: 8px; opacity: 0.7; margin-top: 2px; font-family: 'Inter', sans-serif; }
  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    background: ${statusColor};
    color: white;
    margin-top: 5px;
  }

  /* AI Summary Card */
  .ai-summary {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #7dd3fc;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
    position: relative;
  }
  .ai-summary-title {
    font-size: 10px;
    font-weight: 700;
    color: #0369a1;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ai-summary-text {
    font-size: 9.5px;
    color: #0c4a6e;
    line-height: 1.7;
    margin-bottom: 6px;
  }
  .ai-recommendations {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #7dd3fc;
  }
  .ai-rec-item {
    font-size: 9px;
    color: #075985;
    padding: 2px 0;
    padding-right: 12px;
    position: relative;
  }
  .ai-rec-item::before {
    content: '→';
    position: absolute;
    right: 0;
    color: #0ea5e9;
    font-weight: bold;
  }

  /* Next Hearing Alert */
  .next-hearing {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .next-hearing-info {
    font-size: 10px;
    color: #92400e;
    font-weight: 600;
  }
  .next-hearing-date {
    font-size: 13px;
    font-weight: 800;
    color: #78350f;
    font-family: 'Inter', sans-serif;
  }
  .next-hearing-days {
    background: #f59e0b;
    color: white;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
  }
  .calendar-link {
    font-size: 8px;
    color: #1d4ed8;
    text-decoration: underline;
    margin-top: 3px;
    display: block;
  }

  /* Sections */
  .section {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .section-title {
    padding: 6px 14px;
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-title.navy { background: linear-gradient(90deg, #0f172a, #1e3a5f); }
  .section-title.teal { background: linear-gradient(90deg, #134e4a, #0d9488); }
  .section-title.orange { background: linear-gradient(90deg, #7c2d12, #c2410c); }
  .section-title.purple { background: linear-gradient(90deg, #4c1d95, #7c3aed); }
  .section-title.red { background: linear-gradient(90deg, #7f1d1d, #b91c1c); }
  .section-title.blue { background: linear-gradient(90deg, #1e3a8a, #2563eb); }
  .section-title.emerald { background: linear-gradient(90deg, #064e3b, #059669); }

  /* Data Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table tr { border-bottom: 1px solid #f1f5f9; }
  .data-table tr:last-child { border-bottom: none; }
  .data-table td { padding: 4px 14px; vertical-align: top; font-size: 9px; }
  .data-table .lbl {
    font-weight: 600;
    color: #475569;
    width: 35%;
    background: #f8fafc;
  }
  .data-table .val { color: #111827; }

  /* Hearings Table */
  .hearing-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  .hearing-table th {
    background: #f1f5f9;
    padding: 5px 8px;
    font-weight: 700;
    text-align: right;
    color: #334155;
    border-bottom: 2px solid #cbd5e1;
    font-size: 8.5px;
  }
  .hearing-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 9px;
  }
  .hearing-table tr:nth-child(even) { background: #fafbfc; }
  .hearing-table .date-cell { font-family: 'Inter', sans-serif; font-weight: 500; color: #1e40af; white-space: nowrap; }
  .hearing-table .decision-cell { font-weight: 500; }
  .hearing-table .future-row { background: #fef3c7 !important; }
  .hearing-table .future-row td { color: #92400e; font-weight: 600; }

  /* Judgment Table */
  .judgment-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  .judgment-table th {
    background: #fef2f2;
    padding: 5px 8px;
    font-weight: 700;
    text-align: right;
    color: #991b1b;
    border-bottom: 2px solid #fecaca;
    font-size: 8.5px;
  }
  .judgment-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  .judgment-table .ruling-cell { max-width: 200px; line-height: 1.4; }
  .judgment-table .amount-cell { font-family: 'Inter', sans-serif; font-weight: 600; color: #dc2626; }

  /* Events Timeline */
  .events-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
  }
  .events-table th {
    background: #f1f5f9;
    padding: 4px 8px;
    font-weight: 600;
    text-align: right;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    font-size: 8px;
  }
  .events-table td {
    padding: 3px 8px;
    border-bottom: 1px solid #f8fafc;
  }
  .events-table tr:nth-child(even) { background: #fafbfc; }
  .events-table .date-col { width: 75px; font-weight: 500; color: #1e40af; white-space: nowrap; font-family: 'Inter', sans-serif; font-size: 8.5px; }
  .events-table .num-col { width: 20px; text-align: center; color: #9ca3af; }

  .sub-header {
    background: #fef3c7;
    padding: 4px 14px;
    font-weight: 700;
    font-size: 9px;
    color: #92400e;
    border-bottom: 1px solid #fde68a;
  }

  .no-data { padding: 8px 14px; color: #9ca3af; font-style: italic; font-size: 9px; text-align: center; }

  /* Footer */
  .footer {
    margin-top: 14px;
    padding: 10px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-text {
    font-size: 7.5px;
    color: #94a3b8;
    line-height: 1.6;
  }
  .footer-qr { width: 55px; height: 55px; }
  .footer-brand {
    font-size: 11px;
    font-weight: 800;
    color: #1e3a5f;
    letter-spacing: 1px;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div>
    <div class="header-brand">QADIYA قضية<span>AI-Powered Legal Intelligence — تقرير قانوني ذكي</span></div>
  </div>
  <div class="header-right">
    <div class="case-num">#${caseNumber}</div>
    <div class="meta">${dateStr} • ${timeStr} KWT</div>
    <div class="status-badge">${statusIcon} ${statusText} / ${statusTextEn}</div>
  </div>
</div>

<!-- AI SUMMARY -->
${buildAISummaryHTML(aiSummary)}

<!-- NEXT HEARING ALERT -->
${nextHearing ? buildNextHearingHTML(nextHearing, daysUntil, caseNumber, nextHearingCourt) : ''}

<!-- FIRST INSTANCE COURT -->
${buildFirstInstanceHTML(firstInstance)}

<!-- APPEAL COURT -->
${buildAppealHTML(appeal)}

<!-- HEARINGS -->
${buildHearingsHTML(hearings, caseNumber, today)}

<!-- JUDGMENTS -->
${buildJudgmentsHTML(judgments)}

<!-- POLICE & PROSECUTION -->
${buildPoliceHTML(police)}

<!-- EXECUTION -->
${buildExecutionHTML(execution)}

<!-- TIMELINE -->
${buildEventsHTML(events)}

<!-- FOOTER -->
<div class="footer">
  <div>
    <div class="footer-brand">QADIYA</div>
    <div class="footer-text">
      Powered by AI • Kuwait Ministry of Justice Data<br>
      بيانات من بوابة العدل الإلكترونية — وزارة العدل الكويتية<br>
      ⚠️ This report is for reference only. Verify critical data with the court.
    </div>
  </div>
  <img class="footer-qr" src="${qrDataUrl}" alt="QR" />
</div>

</body>
</html>`;
}

function buildAISummaryHTML(aiSummary) {
  if (!aiSummary || (!aiSummary.summaryAr && !aiSummary.summaryEn)) {
    return '';
  }

  let recsHtml = '';
  if (aiSummary.recommendations && aiSummary.recommendations.length > 0) {
    recsHtml = `<div class="ai-recommendations">
      <div style="font-size:8px;font-weight:700;color:#0369a1;margin-bottom:4px;">💡 توصيات / Recommendations:</div>
      ${aiSummary.recommendations.map(r => `<div class="ai-rec-item">${r}</div>`).join('')}
    </div>`;
  }

  return `<div class="ai-summary">
    <div class="ai-summary-title">🤖 ملخص ذكي — AI Case Summary</div>
    ${aiSummary.summaryAr ? `<div class="ai-summary-text">${aiSummary.summaryAr}</div>` : ''}
    ${aiSummary.summaryEn ? `<div class="ai-summary-text" style="direction:ltr;text-align:left;font-size:9px;color:#0c4a6e;opacity:0.85;">${aiSummary.summaryEn}</div>` : ''}
    ${recsHtml}
  </div>`;
}

function buildNextHearingHTML(nextHearing, daysUntil, caseNumber, court) {
  const calLink = buildCalendarLink(nextHearing.nextDate, caseNumber, court, '');
  
  return `<div class="next-hearing">
    <div>
      <div class="next-hearing-info">📅 الجلسة القادمة / Next Hearing</div>
      <div class="next-hearing-date">${nextHearing.nextDate}</div>
      <a class="calendar-link" href="${calLink}">📆 Add to Google Calendar</a>
    </div>
    ${daysUntil !== null ? `<div class="next-hearing-days">${daysUntil > 0 ? `بعد ${daysUntil} يوم` : 'اليوم!'}</div>` : ''}
  </div>`;
}

function buildFirstInstanceHTML(entries) {
  if (!entries || entries.length === 0) {
    return `<div class="section">
      <div class="section-title navy">📋 المحكمة الكلية / First Instance Court</div>
      <div class="no-data">لا توجد بيانات / No data available</div>
    </div>`;
  }

  let html = '';
  entries.forEach((entry, idx) => {
    const label = entries.length > 1 ? ` (${idx + 1})` : '';
    html += `<div class="section">
      <div class="section-title navy">📋 المحكمة الكلية${label} / First Instance</div>
      <table class="data-table">`;
    for (const [key, value] of Object.entries(entry)) {
      html += `<tr><td class="lbl">${key}</td><td class="val">${value}</td></tr>`;
    }
    html += `</table></div>`;
  });
  return html;
}

function buildAppealHTML(appeal) {
  if (!appeal || Object.keys(appeal).length === 0) {
    return `<div class="section">
      <div class="section-title teal">⚖️ الاستئناف / Appeal Court</div>
      <div class="no-data">لا توجد بيانات / No data available</div>
    </div>`;
  }

  let html = `<div class="section">
    <div class="section-title teal">⚖️ الاستئناف / Appeal Court</div>
    <table class="data-table">`;
  for (const [key, value] of Object.entries(appeal)) {
    html += `<tr><td class="lbl">${key}</td><td class="val">${value}</td></tr>`;
  }
  html += `</table></div>`;
  return html;
}

function buildHearingsHTML(hearings, caseNumber, today) {
  if (!hearings || hearings.length === 0) {
    return `<div class="section">
      <div class="section-title blue">🗓️ الجلسات / Hearings</div>
      <div class="no-data">لا توجد بيانات جلسات / No hearing data available</div>
    </div>`;
  }

  let html = '';
  hearings.forEach(h => {
    html += `<div class="section">
      <div class="section-title blue">🗓️ جلسات ${h.court} — ${h.circuit} (${h.caseNo}/${h.year})</div>
      <table class="hearing-table">
        <thead><tr>
          <th>#</th>
          <th>التاريخ</th>
          <th>قرار المحكمة</th>
          <th>الدائرة</th>
          <th>الجلسة التالية</th>
        </tr></thead>
        <tbody>`;
    
    h.sessions.forEach(s => {
      const isFuture = s.nextDate && s.nextDate >= today;
      const rowClass = isFuture ? ' class="future-row"' : '';
      const calIcon = (s.nextDate && s.nextDate >= today) ? 
        ` <a href="${buildCalendarLink(s.nextDate, caseNumber, h.court, s.decision)}" style="font-size:7px;color:#1d4ed8;">📆</a>` : '';
      
      html += `<tr${rowClass}>
        <td>${s.num}</td>
        <td class="date-cell">${s.date}</td>
        <td class="decision-cell">${s.decision}</td>
        <td>${s.circuitNum}</td>
        <td class="date-cell">${s.nextDate || '-'}${calIcon}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  });
  
  return html;
}

function buildJudgmentsHTML(judgments) {
  if (!judgments || judgments.length === 0) {
    return `<div class="section">
      <div class="section-title red">⚖️ الأحكام / Judgments</div>
      <div class="no-data">لا توجد أحكام / No judgments available</div>
    </div>`;
  }

  let html = `<div class="section">
    <div class="section-title red">⚖️ الأحكام / Judgments & Verdicts</div>
    <table class="judgment-table">
      <thead><tr>
        <th>#</th>
        <th>التاريخ</th>
        <th>الدرجة</th>
        <th>منطوق الحكم</th>
        <th>النوع</th>
        <th>المبلغ</th>
        <th>حالة السداد</th>
        <th>التنفيذ</th>
      </tr></thead>
      <tbody>`;

  judgments.forEach(j => {
    j.entries.forEach(e => {
      const amount = e.amount && e.amount !== '0.000' && e.amount !== '-' ? e.amount : '-';
      html += `<tr>
        <td>${e.num}</td>
        <td class="date-cell" style="font-family:'Inter',sans-serif;font-weight:500;color:#1e40af;white-space:nowrap;">${e.date}</td>
        <td>${e.degree}</td>
        <td class="ruling-cell">${e.ruling || '-'}</td>
        <td>${e.type}</td>
        <td class="amount-cell">${amount}</td>
        <td>${e.paymentStatus || '-'}</td>
        <td>${e.execution || '-'}</td>
      </tr>`;
    });
  });

  html += `</tbody></table></div>`;
  return html;
}

function buildPoliceHTML(police) {
  if (!police) return '';
  const hasStation = police.station && Object.keys(police.station).length > 0;
  const hasProsecution = police.prosecution && Object.keys(police.prosecution).length > 0;

  if (!hasStation && !hasProsecution) {
    return `<div class="section">
      <div class="section-title orange">🏛️ المخفر والنيابة / Police & Prosecution</div>
      <div class="no-data">لا توجد بيانات / No data available</div>
    </div>`;
  }

  let html = `<div class="section">
    <div class="section-title orange">🏛️ المخفر والنيابة / Police & Prosecution</div>`;

  if (hasStation) {
    html += `<div class="sub-header">المخفر / الجهة — Police Station</div>
      <table class="data-table">`;
    for (const [key, value] of Object.entries(police.station)) {
      html += `<tr><td class="lbl">${key}</td><td class="val">${value}</td></tr>`;
    }
    html += `</table>`;
  }

  if (hasProsecution) {
    html += `<div class="sub-header">النيابة — Prosecution</div>
      <table class="data-table">`;
    for (const [key, value] of Object.entries(police.prosecution)) {
      html += `<tr><td class="lbl">${key}</td><td class="val">${value}</td></tr>`;
    }
    html += `</table>`;
  }

  html += `</div>`;
  return html;
}

function buildExecutionHTML(execution) {
  if (!execution || Object.keys(execution).length === 0) {
    return `<div class="section">
      <div class="section-title purple">📂 التنفيذ / Execution</div>
      <div class="no-data">لا توجد بيانات / No data available</div>
    </div>`;
  }

  let html = `<div class="section">
    <div class="section-title purple">📂 التنفيذ / Execution</div>
    <table class="data-table">`;
  for (const [key, value] of Object.entries(execution)) {
    html += `<tr><td class="lbl">${key}</td><td class="val">${value}</td></tr>`;
  }
  html += `</table></div>`;
  return html;
}

function buildEventsHTML(events) {
  if (!events || events.length === 0) {
    return `<div class="section">
      <div class="section-title emerald">📅 مستجدات القضية / Case Timeline</div>
      <div class="no-data">لا توجد بيانات / No data available</div>
    </div>`;
  }

  let html = `<div class="section">
    <div class="section-title emerald">📅 مستجدات القضية / Case Timeline (${events.length} events)</div>
    <table class="events-table">
      <thead><tr>
        <th class="num-col">#</th>
        <th>التاريخ / Date</th>
        <th>الإجراء / Action</th>
      </tr></thead>
      <tbody>`;

  events.forEach((event, idx) => {
    html += `<tr>
      <td class="num-col">${event.num || idx + 1}</td>
      <td class="date-col">${event.date}</td>
      <td>${event.action}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

module.exports = { generateCasePDF };
