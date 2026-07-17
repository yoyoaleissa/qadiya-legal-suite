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
  name: "list_my_cases",
  title: "List my cases",
  description:
    "List cases in the signed-in user's firm. Returns id, case_number, title (EN/AR), type, and status. Scoped by RLS.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max cases (default 25)."),
    status: z.string().optional().describe("Filter by overall_status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    const token = ctx.getToken();
    if (!ctx.isAuthenticated() || !token) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(token)
      .from("cases")
      .select("id, case_number, title, title_ar, case_type, overall_status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("overall_status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { cases: data ?? [] },
    };
  },
});
