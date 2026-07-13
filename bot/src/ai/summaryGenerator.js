/**
 * AI Summary Generator for Case Dossiers
 * Uses the built-in LLM proxy (gpt-5-mini) to generate:
 * 1. Arabic case summary (3-4 sentences)
 * 2. Smart next-action recommendations for lawyers
 */

const logger = require('../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const SUMMARY_MODEL = 'gpt-5-mini';

/**
 * Generate AI summary and recommendations for a case
 * @param {Object} caseData - The full scraped case result
 * @returns {Object} { summaryAr, summaryEn, recommendations }
 */
async function generateCaseSummary(caseData) {
  try {
    const caseContext = buildCaseContext(caseData);
    
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a senior Kuwaiti legal assistant. Analyze case data and provide:
1. A concise Arabic summary (3-4 sentences) of the case status, key events, and outcome
2. A concise English summary (2-3 sentences)
3. 2-3 actionable recommendations for the lawyer handling this case

Format your response as JSON:
{
  "summaryAr": "...",
  "summaryEn": "...",
  "recommendations": ["...", "...", "..."]
}

Be specific, professional, and reference actual dates/decisions from the data. Use formal Arabic (فصحى).`
          },
          {
            role: 'user',
            content: `Analyze this Kuwait court case:\n\n${caseContext}`
          }
        ],
        max_completion_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const parsed = JSON.parse(data.choices[0].message.content);
      logger.info('AI summary generated successfully');
      return {
        summaryAr: parsed.summaryAr || '',
        summaryEn: parsed.summaryEn || '',
        recommendations: parsed.recommendations || []
      };
    }
    
    logger.warn('AI summary: no content returned');
    return getDefaultSummary(caseData);
    
  } catch (error) {
    logger.error(`AI summary generation failed: ${error.message}`);
    return getDefaultSummary(caseData);
  }
}

/**
 * Build a text context from case data for the LLM
 */
function buildCaseContext(data) {
  const parts = [];
  
  parts.push(`Case Number: ${data.caseNumber}`);
  
  // First instance info
  if (data.firstInstance && data.firstInstance.length > 0) {
    data.firstInstance.forEach((entry, i) => {
      parts.push(`\nFirst Instance Court (Entry ${i+1}):`);
      for (const [k, v] of Object.entries(entry)) {
        parts.push(`  ${k}: ${v}`);
      }
    });
  }
  
  // Appeal info
  if (data.appeal && Object.keys(data.appeal).length > 0) {
    parts.push('\nAppeal Court:');
    for (const [k, v] of Object.entries(data.appeal)) {
      parts.push(`  ${k}: ${v}`);
    }
  }
  
  // Execution info
  if (data.execution && Object.keys(data.execution).length > 0) {
    parts.push('\nExecution:');
    for (const [k, v] of Object.entries(data.execution)) {
      parts.push(`  ${k}: ${v}`);
    }
  }
  
  // Hearings
  if (data.hearings && data.hearings.length > 0) {
    data.hearings.forEach(h => {
      parts.push(`\nHearings (${h.court} - ${h.circuit}, Case ${h.caseNo}/${h.year}):`);
      h.sessions.forEach(s => {
        parts.push(`  ${s.date}: ${s.decision}${s.nextDate ? ' → Next: ' + s.nextDate : ''}`);
      });
    });
  }
  
  // Judgments
  if (data.judgments && data.judgments.length > 0) {
    data.judgments.forEach(j => {
      parts.push(`\nJudgments:`);
      j.entries.forEach(e => {
        parts.push(`  ${e.date} (${e.degree}): ${e.ruling} [${e.type}] Amount: ${e.amount}`);
      });
    });
  }
  
  // Events (last 5)
  if (data.events && data.events.length > 0) {
    parts.push('\nRecent Events:');
    data.events.slice(0, 5).forEach(e => {
      parts.push(`  ${e.date}: ${e.action}`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Fallback summary when AI is unavailable
 */
function getDefaultSummary(data) {
  let statusAr = 'قضية مسجلة في وزارة العدل الكويتية';
  let statusEn = 'Case registered in Kuwait Ministry of Justice';
  
  // Try to determine status from events
  if (data.events && data.events.length > 0) {
    const latest = data.events[0];
    if (latest.action.includes('حكم')) {
      statusAr = `صدر حكم بتاريخ ${latest.date}`;
      statusEn = `Judgment issued on ${latest.date}`;
    }
  }
  
  // Check hearings for next date
  const recommendations = [];
  if (data.hearings && data.hearings.length > 0) {
    const allSessions = data.hearings.flatMap(h => h.sessions);
    const today = new Date().toISOString().split('T')[0];
    const future = allSessions.filter(s => s.nextDate && s.nextDate > today);
    if (future.length > 0) {
      recommendations.push(`الجلسة القادمة: ${future[0].nextDate}`);
    }
  }
  
  return {
    summaryAr: statusAr,
    summaryEn: statusEn,
    recommendations
  };
}

module.exports = { generateCaseSummary };
