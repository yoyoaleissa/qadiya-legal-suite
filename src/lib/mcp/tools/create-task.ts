import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supabaseForUser(token: string) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a task for the signed-in user (or a specified assignee). Optionally link to a case. Written under the caller's RLS.",
  inputSchema: {
    title: z.string().min(1).describe("Task title."),
    description: z.string().optional(),
    due_date: z.string().optional().describe("ISO date (YYYY-MM-DD or full ISO timestamp)."),
    case_id: z.string().uuid().optional(),
    assigned_to: z.string().uuid().optional().describe("Defaults to caller."),
    priority: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx.getToken());
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description ?? null,
        due_date: input.due_date ?? null,
        case_id: input.case_id ?? null,
        assigned_to: input.assigned_to ?? ctx.getUserId(),
        priority: input.priority ?? null,
        created_by: ctx.getUserId(),
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { task: data },
    };
  },
});
