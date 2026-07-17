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
  name: "list_tasks",
  title: "List tasks",
  description:
    "List tasks in the signed-in user's firm. Returns id, title, status, due_date, priority, case_id, assignee.",
  inputSchema: {
    status: z.string().optional().describe("Filter by status (e.g. 'todo', 'done')."),
    assignee: z.string().optional().describe("Filter by assignee name (partial match)."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, assignee, limit }, ctx) => {
    const token = ctx.getToken();
    if (!ctx.isAuthenticated() || !token) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(token)
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (assignee) q = q.ilike("assignee", `%${assignee}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});
