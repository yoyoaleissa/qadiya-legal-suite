import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  CaseReport,
  CourtLevelKey,
  CourtLevelRow,
  DeadlineInfo,
  ExecutionRow,
  HearingRow,
  JudgmentRow,
  TimelineRow,
} from "./report-types";

const Input = z.object({ caseNumber: z.string().min(1).max(40) });

const STAGE_ORDER: CourtLevelKey[] = [
  "police_prosecution",
  "first_instance",
  "appeal",
  "cassation",
  "execution",
];

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function computeDeadline(
  overallStatus: string,
  judgments: JudgmentRow[],
): DeadlineInfo | null {
  if (overallStatus === "closed") return null;
  const dated = judgments
    .filter((j) => j.judgment_date && (j.level === "first_instance" || j.level === "appeal"))
    .sort((a, b) => (a.judgment_date! < b.judgment_date! ? 1 : -1));
  const latest = dated[0];
  if (!latest?.judgment_date) return null;
  const base = new Date(latest.judgment_date + "T00:00:00Z");
  const deadline = new Date(base);
  deadline.setUTCDate(deadline.getUTCDate() + 30);
  const isAppeal = latest.level === "first_instance";
  return {
    label_en: isAppeal ? "Appeal deadline (30 days)" : "Cassation deadline (30 days)",
    label_ar: isAppeal ? "موعد الاستئناف (30 يوماً)" : "موعد الطعن بالتمييز (30 يوماً)",
    date: deadline.toISOString().slice(0, 10),
    days_remaining: daysBetween(new Date(), deadline),
  };
}

async function generateNarrative(payload: {
  caseNumber: string;
  caseType: string | null;
  overallStatus: string;
  currentStage: CourtLevelKey | null;
  courtLevels: CourtLevelRow[];
  judgments: JudgmentRow[];
  timeline: TimelineRow[];
  deadline: DeadlineInfo | null;
}): Promise<{
  status_headline_en: string;
  status_headline_ar: string;
  summary_en: string;
  summary_ar: string;
  recommendation_en: string;
  recommendation_ar: string;
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const system = `You are a Kuwaiti legal case-status reporter for a law firm's client-facing report bot.
You produce clear, factual, plain-language status reports from structured court records.
Rules:
- NEVER give legal advice, predictions, or verdicts. Provide only procedural next-step guidance.
- Kuwaiti court hierarchy: النيابة (Prosecution) -> الكلية/أول درجة (First Instance) -> الاستئناف (Appeal) -> التمييز (Cassation). Execution (التنفيذ) is a parallel enforcement track.
- "عدم قبول الطعن بغرفة المشورة" means the Cassation court rejected the appeal in chambers = the judgment is final at that level.
- Reply ONLY with strict minified JSON, no markdown, matching exactly these keys:
  status_headline_en, status_headline_ar, summary_en, summary_ar, recommendation_en, recommendation_ar
- Headlines: one short line each, e.g. "Status: Closed — Cassation rejected the appeal (2026-03-09)".
- Summaries: ONE paragraph plain-language each (English and Arabic) describing what happened and where the case stands.
- Recommendation: ONE plain sentence of procedural next-step guidance (never advice/verdict).`;

  const user = `Case data (JSON):\n${JSON.stringify(payload)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("NO_CREDITS");
  if (!res.ok) {
    const text = await res.text();
    console.error("[report] gateway error", res.status, text);
    throw new Error("AI_ERROR");
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  return {
    status_headline_en: parsed.status_headline_en ?? "Status update",
    status_headline_ar: parsed.status_headline_ar ?? "تحديث الحالة",
    summary_en: parsed.summary_en ?? "",
    summary_ar: parsed.summary_ar ?? "",
    recommendation_en: parsed.recommendation_en ?? "",
    recommendation_ar: parsed.recommendation_ar ?? "",
  };
}

export const generateCaseReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<CaseReport> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const caseNumber = data.caseNumber.trim();

    const { data: caseRow } = await supabase
      .from("cases")
      .select("id, case_number, case_type, case_type_ar, overall_status")
      .eq("case_number", caseNumber)
      .maybeSingle();

    const empty = (): CaseReport => ({
      found: false,
      case_number: caseNumber,
      case_type: null,
      case_type_ar: null,
      overall_status: "unknown",
      current_stage: null,
      status_headline_en: "",
      status_headline_ar: "",
      summary_en: "",
      summary_ar: "",
      recommendation_en: "",
      recommendation_ar: "",
      deadline: null,
      court_levels: [],
      judgments: [],
      hearings: [],
      executions: [],
      timeline: [],
    });

    if (!caseRow) return empty();

    const caseId = caseRow.id;
    const [levelsRes, judgmentsRes, hearingsRes, execRes, timelineRes] = await Promise.all([
      supabase.from("court_levels").select("level, court_name, case_ref, registered_date, status, ruling_summary, sort_order").eq("case_id", caseId).order("sort_order"),
      supabase.from("judgments").select("level, judgment_date, ruling_text, judgment_type, amount, payment_status, sort_order").eq("case_id", caseId).order("sort_order"),
      supabase.from("hearings").select("level, session_date, notes, status, sort_order").eq("case_id", caseId).order("sort_order"),
      supabase.from("execution_procedures").select("id, file_number, jurisdiction, opened_date, status, notes").eq("case_id", caseId),
      supabase.from("case_timeline").select("event_date, level, event_type, title, title_ar, description, description_ar, sort_order").eq("case_id", caseId).order("sort_order"),
    ]);

    const court_levels = (levelsRes.data ?? []) as CourtLevelRow[];
    const judgments = (judgmentsRes.data ?? []) as JudgmentRow[];
    const hearings = (hearingsRes.data ?? []) as HearingRow[];
    const timeline = (timelineRes.data ?? []) as TimelineRow[];

    const executions: ExecutionRow[] = [];
    for (const ex of execRes.data ?? []) {
      const { data: receipts } = await supabase
        .from("execution_receipts")
        .select("amount, receipt_date, description")
        .eq("execution_id", ex.id)
        .order("receipt_date");
      executions.push({
        file_number: ex.file_number,
        jurisdiction: ex.jurisdiction,
        opened_date: ex.opened_date,
        status: ex.status,
        notes: ex.notes,
        receipts: receipts ?? [],
      });
    }

    // Current stage = furthest-progressed litigation stage with a status.
    const litigationLevels = court_levels.filter((l) => l.level !== "execution");
    const current_stage =
      litigationLevels
        .slice()
        .sort((a, b) => STAGE_ORDER.indexOf(b.level) - STAGE_ORDER.indexOf(a.level))[0]?.level ??
      null;

    const deadline = computeDeadline(caseRow.overall_status, judgments);

    const narrative = await generateNarrative({
      caseNumber,
      caseType: caseRow.case_type,
      overallStatus: caseRow.overall_status,
      currentStage: current_stage,
      courtLevels: court_levels,
      judgments,
      timeline,
      deadline,
    });

    return {
      found: true,
      case_number: caseNumber,
      case_type: caseRow.case_type,
      case_type_ar: caseRow.case_type_ar,
      overall_status: caseRow.overall_status,
      current_stage,
      ...narrative,
      deadline,
      court_levels,
      judgments,
      hearings,
      executions,
      timeline,
    };
  });
