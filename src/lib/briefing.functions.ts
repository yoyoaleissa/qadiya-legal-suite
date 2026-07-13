import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DailyBriefing {
  hearingsToday: number;
  hearingsTomorrow: number;
  tasksOverdue: number;
  tasksDueToday: number;
  appealWindow: number;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Aggregate the logged-in user's day: hearings, task pressure, and appeal deadlines. */
export const getDailyBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyBriefing> => {
    const supabase = context.supabase;

    const today = new Date();
    const todayStr = isoDate(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = isoDate(tomorrow);
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowStartStr = isoDate(windowStart);

    const [{ data: hearings }, { data: tasks }, { data: judgments }] = await Promise.all([
      supabase.from("hearings").select("session_date, status"),
      supabase.from("tasks").select("due_date, status"),
      supabase.from("judgments").select("judgment_date"),
    ]);

    const activeHearings = (hearings ?? []).filter(
      (h) => h.session_date && h.status !== "cancelled",
    );
    const hearingsToday = activeHearings.filter((h) => h.session_date === todayStr).length;
    const hearingsTomorrow = activeHearings.filter((h) => h.session_date === tomorrowStr).length;

    const openTasks = (tasks ?? []).filter((t) => t.status !== "done" && t.due_date);
    const tasksOverdue = openTasks.filter((t) => (t.due_date as string) < todayStr).length;
    const tasksDueToday = openTasks.filter((t) => t.due_date === todayStr).length;

    // Appeal window: judgment issued in the last 30 days (30-day appeal/cassation deadline).
    const appealWindow = (judgments ?? []).filter(
      (j) => j.judgment_date && j.judgment_date >= windowStartStr && j.judgment_date <= todayStr,
    ).length;

    return { hearingsToday, hearingsTomorrow, tasksOverdue, tasksDueToday, appealWindow };
  });
