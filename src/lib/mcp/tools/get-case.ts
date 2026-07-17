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
  name: "get_case",
  title: "Get case details",
  description:
    "Return a case with its hearings, tasks, and timeline events. Scoped by RLS to the signed-in user's firm.",
  inputSchema: {
    case_id: z.string().uuid().describe("Case UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ case_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx.getToken());
    const [caseRes, hearings, tasks, timeline] = await Promise.all([
      supabase.from("cases").select("*").eq("id", case_id).maybeSingle(),
      supabase.from("hearings").select("*").eq("case_id", case_id).order("hearing_date"),
      supabase.from("tasks").select("*").eq("case_id", case_id).order("due_date"),
      supabase.from("case_timeline").select("*").eq("case_id", case_id).order("event_date"),
    ]);
    if (caseRes.error) return { content: [{ type: "text", text: caseRes.error.message }], isError: true };
    if (!caseRes.data) return { content: [{ type: "text", text: "Case not found" }], isError: true };
    const payload = {
      case: caseRes.data,
      hearings: hearings.data ?? [],
      tasks: tasks.data ?? [],
      timeline: timeline.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
