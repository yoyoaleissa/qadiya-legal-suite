import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DeadlineItem {
  id: string;
  title: string;
  title_ar: string | null;
  due_date: string;
  case_id: string | null;
  case_title: string | null;
  case_title_ar: string | null;
  case_number: string | null;
  days_remaining: number;
  kind: "appeal" | "cassation" | "other";
}

function daysBetween(a: Date, b: Date) {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
    - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return Math.round(ms / 86400000);
}

export const countUrgentDeadlines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("tasks")
      .select("id")
      .neq("status", "done")
      .not("due_date", "is", null)
      .gte("due_date", iso(now))
      .lte("due_date", iso(in7));
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  });

export const listDeadlines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeadlineItem[]> => {
    const [{ data: tasks, error }, { data: cases }] = await Promise.all([
      context.supabase
        .from("tasks")
        .select("id, title, title_ar, due_date, case_id, status")
        .neq("status", "done")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true }),
      context.supabase.from("cases").select("id, case_number, title, title_ar"),
    ]);
    if (error) throw new Error(error.message);
    const caseMap = new Map((cases ?? []).map((c) => [c.id, c] as const));
    const today = new Date();
    return (tasks ?? []).map((t) => {
      const cs = t.case_id ? caseMap.get(t.case_id) : null;
      const title = t.title ?? "";
      const titleAr = t.title_ar ?? "";
      const kind: DeadlineItem["kind"] = /استئناف|Appeal/i.test(title + titleAr)
        ? "appeal"
        : /تمييز|Cassation/i.test(title + titleAr)
          ? "cassation"
          : "other";
      return {
        id: t.id,
        title,
        title_ar: t.title_ar,
        due_date: t.due_date as string,
        case_id: t.case_id,
        case_title: cs?.title ?? null,
        case_title_ar: cs?.title_ar ?? null,
        case_number: cs?.case_number ?? null,
        days_remaining: daysBetween(today, new Date(t.due_date as string)),
        kind,
      };
    });
  });
