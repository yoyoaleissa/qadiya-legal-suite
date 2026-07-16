import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ Partner KPIs ============

export interface PartnerKPIs {
  revenue_mtd: number;
  revenue_ytd: number;
  outstanding: number;
  collections_rate: number; // 0-100
  wip_hours: number;
  wip_value_estimate: number; // KWD at 30/hour default rate
  active_cases: number;
  hearings_this_week: number;
  currency: string;
}

export const getPartnerKPIs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerKPIs> => {
    const supabase = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [{ data: invoices }, { data: entries }, { data: cases }, { data: hearings }] =
      await Promise.all([
        supabase.from("invoices").select("amount, currency, status, paid_date, issue_date"),
        supabase.from("time_entries").select("duration_minutes, case_id, entry_date"),
        supabase.from("cases").select("id, overall_status"),
        supabase
          .from("hearings")
          .select("id, session_date")
          .gte("session_date", today)
          .lte("session_date", weekAhead),
      ]);

    let revenue_mtd = 0;
    let revenue_ytd = 0;
    let outstanding = 0;
    let paid_total = 0;
    let all_invoiced_total = 0;
    let currency = "KWD";
    for (const inv of invoices ?? []) {
      const amt = Number(inv.amount);
      currency = inv.currency || currency;
      if (inv.status === "paid" && inv.paid_date) {
        paid_total += amt;
        if (inv.paid_date >= monthStart) revenue_mtd += amt;
        if (inv.paid_date >= yearStart) revenue_ytd += amt;
      }
      if (inv.status === "sent" || inv.status === "overdue") outstanding += amt;
      if (inv.status !== "draft" && inv.status !== "cancelled") all_invoiced_total += amt;
    }
    const collections_rate =
      all_invoiced_total > 0 ? Math.round((paid_total / all_invoiced_total) * 100) : 0;

    // WIP: time entries not tied to a paid invoice (approximation: all entries in last 90d)
    const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const wip_minutes = (entries ?? [])
      .filter((e) => e.entry_date >= cutoff)
      .reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const wip_hours = Math.round((wip_minutes / 60) * 10) / 10;
    const wip_value_estimate = Math.round(wip_hours * 30 * 1000) / 1000;

    const active_cases = (cases ?? []).filter(
      (c) => c.overall_status && !["closed", "archived"].includes(c.overall_status.toLowerCase()),
    ).length;

    return {
      revenue_mtd: Math.round(revenue_mtd * 1000) / 1000,
      revenue_ytd: Math.round(revenue_ytd * 1000) / 1000,
      outstanding: Math.round(outstanding * 1000) / 1000,
      collections_rate,
      wip_hours,
      wip_value_estimate,
      active_cases,
      hearings_this_week: (hearings ?? []).length,
      currency,
    };
  });

// ============ Conflict of Interest Check ============

export interface ConflictMatch {
  client_id: string;
  name: string;
  name_ar: string | null;
  national_id: string | null;
  match_type: "national_id" | "name_exact" | "name_similar";
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[ةه]/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const checkConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().min(1),
        name_ar: z.string().optional(),
        national_id: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ConflictMatch[]> => {
    const supabase = context.supabase;
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, name_ar, national_id");
    if (error) throw new Error(error.message);
    const matches: ConflictMatch[] = [];
    const nEn = normalizeName(data.name);
    const nAr = data.name_ar ? normalizeName(data.name_ar) : "";
    const nId = data.national_id?.replace(/\s/g, "") || "";
    for (const c of clients ?? []) {
      if (nId && c.national_id && c.national_id.replace(/\s/g, "") === nId) {
        matches.push({ ...c, match_type: "national_id" });
        continue;
      }
      const cEn = normalizeName(c.name);
      const cAr = c.name_ar ? normalizeName(c.name_ar) : "";
      if ((nEn && cEn === nEn) || (nAr && cAr === nAr)) {
        matches.push({ ...c, match_type: "name_exact" });
        continue;
      }
      // Loose token overlap for similarity
      const tokensA = new Set(nEn.split(" ").filter((t) => t.length > 2));
      const tokensB = new Set(cEn.split(" ").filter((t) => t.length > 2));
      let overlap = 0;
      tokensA.forEach((t) => tokensB.has(t) && overlap++);
      if (overlap >= 2) {
        matches.push({ ...c, match_type: "name_similar" });
      }
    }
    return matches;
  });

// ============ Case Freshness (MOJ sync ages) ============

export interface CaseFreshness {
  case_number: string;
  last_synced: string;
  minutes_since: number;
  status_hint: string | null;
}

export const listCaseFreshness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaseFreshness[]> => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("case_reports")
      .select("case_number, updated_at, json_data")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return (data ?? []).map((r) => {
      const jd = r.json_data as { status?: string } | null;
      return {
        case_number: r.case_number,
        last_synced: r.updated_at,
        minutes_since: Math.floor((now - new Date(r.updated_at).getTime()) / 60000),
        status_hint: (jd && typeof jd === "object" && jd.status) || null,
      };
    });
  });

// ============ Time Entries ============

export const createTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        case_id: z.string().uuid().optional(),
        duration_minutes: z.number().int().positive().max(24 * 60),
        description: z.string().max(500).optional(),
        entry_date: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("time_entries")
      .insert({
        user_id: context.userId,
        case_id: data.case_id || null,
        duration_minutes: data.duration_minutes,
        description: data.description || null,
        entry_date: data.entry_date || new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
