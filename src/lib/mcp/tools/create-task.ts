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
    "Create a task in the signed-in user's firm. Optionally link to a case and set a due date, assignee, and priority.",
  inputSchema: {
    title: z.string().min(1).describe("Task title."),
    description: z.string().optional(),
    due_date: z.string().optional().describe("ISO date YYYY-MM-DD or full ISO timestamp."),
    case_id: z.string().uuid().optional(),
    assignee: z.string().optional().describe("Assignee display name."),
    priority: z.string().optional().describe("e.g. 'low', 'medium', 'high'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const token = ctx.getToken();
    if (!ctx.isAuthenticated() || !token) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(token)
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        case_id: input.case_id,
        assignee: input.assignee,
        priority: input.priority ?? "medium",
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
