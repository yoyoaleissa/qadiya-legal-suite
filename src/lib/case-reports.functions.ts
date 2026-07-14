import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CaseReport } from "./report-types";

export const saveCaseReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { caseNumber: string; report: CaseReport }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("case_reports")
      .insert({
        user_id: userId,
        case_number: data.caseNumber,
        json_data: data.report as never,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export interface RecentReportRow {
  id: string;
  case_number: string;
  created_at: string;
  status_headline_en: string | null;
  status_headline_ar: string | null;
  next_hearing_date: string | null;
  deadline_date: string | null;
  deadline_days: number | null;
}

export const listRecentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecentReportRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("case_reports")
      .select("id, case_number, created_at, json_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    return (data ?? []).map((r) => {
      const rep = r.json_data as unknown as CaseReport;
      const nextHearing = (rep?.hearings ?? [])
        .filter((h) => h.session_date && h.session_date >= today)
        .sort((a, b) => (a.session_date! > b.session_date! ? 1 : -1))[0];
      return {
        id: r.id,
        case_number: r.case_number,
        created_at: r.created_at,
        status_headline_en: rep?.status_headline_en ?? null,
        status_headline_ar: rep?.status_headline_ar ?? null,
        next_hearing_date: nextHearing?.session_date ?? null,
        deadline_date: rep?.deadline?.date ?? null,
        deadline_days: rep?.deadline?.days_remaining ?? null,
      };
    });
  });

export const getCaseReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<CaseReport | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("case_reports")
      .select("json_data")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row?.json_data as unknown as CaseReport) ?? null;
  });
