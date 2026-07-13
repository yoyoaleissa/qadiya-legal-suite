import { createServerFn } from "@tanstack/react-start";

export interface TaskItem {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  priority: string;
  status: string;
  assignee: string | null;
  assignee_ar: string | null;
  due_date: string | null;
  case_number: string | null;
  case_title: string | null;
  case_title_ar: string | null;
}

export const listTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaskItem[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const [{ data: tasks, error }, { data: cases }] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, title_ar, description, description_ar, priority, status, assignee, assignee_ar, due_date, case_id, sort_order",
        )
        .order("sort_order"),
      supabase.from("cases").select("id, case_number, title, title_ar"),
    ]);
    if (error) throw new Error(error.message);

    const caseMap = new Map((cases ?? []).map((c) => [c.id, c] as const));

    return (tasks ?? []).map((t) => {
      const cs = t.case_id ? caseMap.get(t.case_id) : null;
      return {
        id: t.id,
        title: t.title,
        title_ar: t.title_ar,
        description: t.description,
        description_ar: t.description_ar,
        priority: t.priority,
        status: t.status,
        assignee: t.assignee,
        assignee_ar: t.assignee_ar,
        due_date: t.due_date,
        case_number: cs?.case_number ?? null,
        case_title: cs?.title ?? null,
        case_title_ar: cs?.title_ar ?? null,
      };
    });
  },
);
