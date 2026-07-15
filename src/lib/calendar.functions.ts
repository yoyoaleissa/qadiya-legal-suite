import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateHearingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.string().min(1) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("hearings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });


export type CalendarEventType = "hearing" | "deadline";

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  title_ar: string;
  sub: string | null;
  sub_ar: string | null;
  status: string | null;
  case_number: string | null;
}

export const listCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CalendarEvent[]> => {
    const supabase = context.supabase;


    const [{ data: cases }, { data: hearings }, { data: tasks }] = await Promise.all([
      supabase.from("cases").select("id, case_number, title, title_ar"),
      supabase.from("hearings").select("id, case_id, session_date, notes, status, level"),
      supabase
        .from("tasks")
        .select("id, title, title_ar, due_date, status, priority, case_id")
        .not("due_date", "is", null),
    ]);

    const caseMap = new Map(
      (cases ?? []).map((c) => [c.id, c] as const),
    );

    const events: CalendarEvent[] = [];

    for (const h of hearings ?? []) {
      if (!h.session_date) continue;
      const cs = h.case_id ? caseMap.get(h.case_id) : null;
      events.push({
        id: `hearing-${h.id}`,
        date: h.session_date,
        type: "hearing",
        title: cs?.title ?? "Court hearing",
        title_ar: cs?.title_ar ?? "جلسة قضائية",
        sub: h.notes,
        sub_ar: h.notes,
        status: h.status,
        case_number: cs?.case_number ?? null,
      });
    }

    for (const tk of tasks ?? []) {
      if (!tk.due_date || tk.status === "done") continue;
      const cs = tk.case_id ? caseMap.get(tk.case_id) : null;
      events.push({
        id: `task-${tk.id}`,
        date: tk.due_date,
        type: "deadline",
        title: tk.title,
        title_ar: tk.title_ar ?? tk.title,
        sub: cs?.title ?? null,
        sub_ar: cs?.title_ar ?? null,
        status: tk.priority,
        case_number: cs?.case_number ?? null,
      });
    }

    return events;
  });

