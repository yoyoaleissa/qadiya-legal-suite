import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type NotificationKind =
  | "task_overdue"
  | "task_due_today"
  | "hearing_today"
  | "hearing_tomorrow"
  | "invoice_overdue"
  | "appeal_window"
  | "portal_message"
  | "case_update"
  | "system"
  | string;

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  severity: "danger" | "warn" | "info" | "success";
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  href: string;
  date?: string;
  read?: boolean;
  persistent?: boolean; // true = stored row, false = computed
  created_at?: string;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Live notifications feed = persisted rows (unread first) + computed deadline items.
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

    const [storedRes, tasksRes, hearingsRes, invoicesRes, judgmentsRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, kind, severity, title_en, title_ar, subtitle_en, subtitle_ar, href, read_at, clicked_at, dismissed_at, delivered_at, created_at")
        .eq("user_id", context.userId)
        .is("dismissed_at", null)
        .order("read_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(50),
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

    for (const n of storedRes.data ?? []) {
      out.push({
        id: n.id as string,
        kind: n.kind as NotificationKind,
        severity: n.severity as NotificationItem["severity"],
        title_en: n.title_en as string,
        title_ar: n.title_ar as string,
        subtitle_en: (n.subtitle_en as string | null) ?? undefined,
        subtitle_ar: (n.subtitle_ar as string | null) ?? undefined,
        href: (n.href as string | null) ?? "/",
        read: !!n.read_at,
        persistent: true,
        created_at: n.created_at as string,
      });
    }

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
        read: false,
        persistent: false,
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
        read: false,
        persistent: false,
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
        read: false,
        persistent: false,
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
        read: false,
        persistent: false,
      });
    }

    const rank = { danger: 0, warn: 1, info: 2, success: 3 } as const;
    out.sort((a, b) => {
      // Unread first
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      const r = rank[a.severity] - rank[b.severity];
      if (r !== 0) return r;
      return (a.date ?? "").localeCompare(b.date ?? "");
    });

    return out.slice(0, 80);
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw error;
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw error;
    return { ok: true };
  });

export const logNotificationClicked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    // Log first click; also mark as read if not already.
    const { error } = await context.supabase
      .from("notifications")
      .update({ clicked_at: now, read_at: now })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("clicked_at", null);
    if (error) throw error;
    // Ensure read_at is set even if clicked_at was already logged.
    await context.supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });

export const logNotificationDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { ok: true, count: 0 };
    // delivered_at defaults to insert time; this only backfills if somehow null.
    const { error, count } = await context.supabase
      .from("notifications")
      .update({ delivered_at: new Date().toISOString() }, { count: "exact" })
      .in("id", data.ids)
      .eq("user_id", context.userId)
      .is("delivered_at", null);
    if (error) throw error;
    return { ok: true, count: count ?? 0 };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Soft-dismiss: keep the row for audit; hide from feed.
    const { error } = await context.supabase
      .from("notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("dismissed_at", null);
    if (error) throw error;
    return { ok: true };
  });

export interface NotificationEngagementRow {
  id: string;
  kind: string;
  severity: string;
  title_en: string;
  title_ar: string;
  href: string | null;
  delivered_at: string;
  read_at: string | null;
  clicked_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

/**
 * Full engagement log for the signed-in user (accountability view).
 * Returns delivered/read/clicked/dismissed timestamps for every notification.
 */
export const listNotificationEngagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationEngagementRow[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select(
        "id, kind, severity, title_en, title_ar, href, delivered_at, read_at, clicked_at, dismissed_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("delivered_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as NotificationEngagementRow[];
  });
