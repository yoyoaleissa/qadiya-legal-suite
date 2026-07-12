// Shared report types used by both the server function and the client UI.
export type CourtLevelKey =
  | "police_prosecution"
  | "first_instance"
  | "appeal"
  | "cassation"
  | "execution";

export interface CourtLevelRow {
  level: CourtLevelKey;
  court_name: string | null;
  case_ref: string | null;
  registered_date: string | null;
  status: string | null;
  ruling_summary: string | null;
  sort_order: number;
}

export interface JudgmentRow {
  level: CourtLevelKey;
  judgment_date: string | null;
  ruling_text: string | null;
  judgment_type: string | null;
  amount: number | null;
  payment_status: string | null;
}

export interface HearingRow {
  level: CourtLevelKey | null;
  session_date: string | null;
  notes: string | null;
  status: string | null;
}

export interface ReceiptRow {
  amount: number | null;
  receipt_date: string | null;
  description: string | null;
}

export interface ExecutionRow {
  file_number: string | null;
  jurisdiction: string | null;
  opened_date: string | null;
  status: string | null;
  notes: string | null;
  receipts: ReceiptRow[];
}

export interface TimelineRow {
  event_date: string | null;
  level: CourtLevelKey | null;
  event_type: string | null;
  title: string | null;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
}

export interface DeadlineInfo {
  label_en: string;
  label_ar: string;
  date: string;
  days_remaining: number;
}

export interface CaseReport {
  found: boolean;
  case_number: string;
  case_type: string | null;
  case_type_ar: string | null;
  overall_status: string;
  current_stage: CourtLevelKey | null;
  status_headline_en: string;
  status_headline_ar: string;
  summary_en: string;
  summary_ar: string;
  recommendation_en: string;
  recommendation_ar: string;
  deadline: DeadlineInfo | null;
  court_levels: CourtLevelRow[];
  judgments: JudgmentRow[];
  hearings: HearingRow[];
  executions: ExecutionRow[];
  timeline: TimelineRow[];
}
