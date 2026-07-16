import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationKind =
  | "task_overdue"
  | "task_due_today"
  | "hearing_today"
  | "hearing_tomorrow"
  | "invoice_overdue"
  | "appeal_window";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  severity: "danger" | "warn" | "info";
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  href: string;
  date?: string;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Compute a live notifications feed for the signed-in user by aggregating
 * overdue tasks, hearings today/tomorrow, overdue invoices, and open appeal
 * windows. No storage — always fresh on read.
 */
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    const supabase = context.supabase;
    const today = new Date();
    const todayStr = iso(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = iso(tomorrow);
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowStartStr = iso(windowStart);

    const [tasksRes, hearingsRes, invoicesRes, judgmentsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, title_ar, due_date, status, priority")
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(25),
      supabase
        .from("hearings")
        .select("id, case_id, session_date, status, notes")
        .in("session_date", [todayStr, tomorrowStr])
        .limit(25),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, due_date, status")
        .eq("status", "overdue")
        .order("due_date", { ascending: true })
        .limit(25),
      supabase
        .from("judgments")
        .select("id, case_id, judgment_date, ruling_text")
        .gte("judgment_date", windowStartStr)
        .lte("judgment_date", todayStr)
        .order("judgment_date", { ascending: false })
        .limit(25),
    ]);

    const out: NotificationItem[] = [];

    for (const t of tasksRes.data ?? []) {
      const overdue = (t.due_date as string) < todayStr;
      out.push({
        id: `task-${t.id}`,
        kind: overdue ? "task_overdue" : "task_due_today",
        severity: overdue ? "danger" : "warn",
        title_en: overdue ? `Overdue: ${t.title}` : `Due today: ${t.title}`,
        title_ar: overdue
          ? `متأخر: ${t.title_ar ?? t.title}`
          : `مستحق اليوم: ${t.title_ar ?? t.title}`,
        subtitle_en: t.due_date ?? undefined,
        subtitle_ar: t.due_date ?? undefined,
        href: "/tasks",
        date: t.due_date ?? undefined,
      });
    }

    for (const h of hearingsRes.data ?? []) {
      if (h.status === "cancelled") continue;
      const isToday = h.session_date === todayStr;
      out.push({
        id: `hearing-${h.id}`,
        kind: isToday ? "hearing_today" : "hearing_tomorrow",
        severity: isToday ? "danger" : "warn",
        title_en: isToday ? "Hearing today" : "Hearing tomorrow",
        title_ar: isToday ? "جلسة اليوم" : "جلسة الغد",
        subtitle_en: h.notes ?? undefined,
        subtitle_ar: h.notes ?? undefined,
        href: "/calendar",
        date: h.session_date ?? undefined,
      });
    }

    for (const inv of invoicesRes.data ?? []) {
      out.push({
        id: `invoice-${inv.id}`,
        kind: "invoice_overdue",
        severity: "danger",
        title_en: `Overdue invoice ${inv.invoice_number}`,
        title_ar: `فاتورة متأخرة ${inv.invoice_number}`,
        subtitle_en: `${inv.amount} ${inv.currency}`,
        subtitle_ar: `${inv.amount} ${inv.currency}`,
        href: "/billing",
        date: inv.due_date ?? undefined,
      });
    }

    for (const j of judgmentsRes.data ?? []) {
      if (!j.judgment_date) continue;
      const jd = new Date(j.judgment_date as string);
      const deadline = new Date(jd);
      deadline.setDate(deadline.getDate() + 30);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
      if (daysLeft <= 0 || daysLeft > 30) continue;
      out.push({
        id: `judgment-${j.id}`,
        kind: "appeal_window",
        severity: daysLeft <= 7 ? "danger" : "info",
        title_en: `Appeal window: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
        title_ar: `نافذة الاستئناف: ${daysLeft} يوماً متبقياً`,
        subtitle_en: j.ruling_text ?? undefined,
        subtitle_ar: j.ruling_text ?? undefined,
        href: "/reports",
        date: j.judgment_date ?? undefined,
      });
    }

    // Sort: danger > warn > info, then by date ascending
    const rank = { danger: 0, warn: 1, info: 2 } as const;
    out.sort((a, b) => {
      const r = rank[a.severity] - rank[b.severity];
      if (r !== 0) return r;
      return (a.date ?? "").localeCompare(b.date ?? "");
    });

    return out.slice(0, 50);
  });
