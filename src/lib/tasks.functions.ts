import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  case_id: string | null;
  case_number: string | null;
  case_title: string | null;
  case_title_ar: string | null;
}

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaskItem[]> => {
    const supabase = context.supabase;

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
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().min(1),
        title_ar: z.string().optional(),
        description: z.string().optional(),
        description_ar: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
        status: z.enum(["open", "in_progress", "done"]).default("open"),
        assignee: z.string().optional(),
        assignee_ar: z.string().optional(),
        due_date: z.string().optional(),
        case_id: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: maxRow } = await supabase
      .from("tasks")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    const nextSort = (maxRow?.sort_order ?? 0) + 1;
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({
        title: data.title,
        title_ar: data.title_ar || null,
        description: data.description || null,
        description_ar: data.description_ar || null,
        priority: data.priority,
        status: data.status,
        assignee: data.assignee || null,
        assignee_ar: data.assignee_ar || null,
        due_date: data.due_date || null,
        case_id: data.case_id || null,
        sort_order: nextSort,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "done"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createTasksFromWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        template_id: z.string().uuid(),
        case_id: z.string().uuid().optional(),
        assignee: z.string().optional(),
        assignee_ar: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: template, error: tErr } = await supabase
      .from("workflow_templates")
      .select("steps")
      .eq("id", data.template_id)
      .single();
    if (tErr || !template) throw new Error("Workflow template not found");
    const steps = template.steps as Array<{
      title: string;
      title_ar: string;
      priority: string;
      days_offset: number;
    }>;
    const { data: maxRow } = await supabase
      .from("tasks")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    let nextSort = (maxRow?.sort_order ?? 0) + 1;
    const today = new Date();
    const tasks = steps.map((step) => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + step.days_offset);
      return {
        title: step.title,
        title_ar: step.title_ar,
        priority: step.priority,
        status: "open",
        assignee: data.assignee || null,
        assignee_ar: data.assignee_ar || null,
        due_date: dueDate.toISOString().slice(0, 10),
        case_id: data.case_id || null,
        sort_order: nextSort++,
      };
    });
    const { error } = await supabase.from("tasks").insert(tasks);
    if (error) throw new Error(error.message);
    return { created: tasks.length };
  });

export interface WorkflowTemplate {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  steps: Array<{ title: string; title_ar: string; priority: string; days_offset: number }>;
}

export const listWorkflowTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkflowTemplate[]> => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("id, name, name_ar, description, description_ar, steps")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkflowTemplate[];
  });
