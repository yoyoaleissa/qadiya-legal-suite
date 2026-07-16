import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SearchClient {
  id: string;
  name: string;
  name_ar: string | null;
}

export interface SearchCase {
  id: string;
  case_number: string;
  title: string | null;
  title_ar: string | null;
  client_id: string | null;
}

export interface SearchTask {
  id: string;
  title: string;
  title_ar: string | null;
  status: string;
}

export interface GlobalSearchResults {
  clients: SearchClient[];
  cases: SearchCase[];
  tasks: SearchTask[];
}

/** Search across clients, cases, and tasks for the global Cmd+K palette. */
export const globalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ context, data }): Promise<GlobalSearchResults> => {
    const supabase = context.supabase;
    // Sanitize for PostgREST or() filters — strip characters that break the syntax.
    const term = data.q.replace(/[%,()*]/g, " ").trim();
    if (!term) return { clients: [], cases: [], tasks: [] };
    const like = `%${term}%`;

    const [{ data: clients }, { data: cases }, { data: tasks }] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, name_ar")
        .or(`name.ilike.${like},name_ar.ilike.${like}`)
        .order("name")
        .limit(6),
      supabase
        .from("cases")
        .select("id, case_number, title, title_ar, client_id")
        .or(`title.ilike.${like},title_ar.ilike.${like},case_number.ilike.${like}`)
        .limit(6),
      supabase
        .from("tasks")
        .select("id, title, title_ar, status")
        .or(`title.ilike.${like},title_ar.ilike.${like}`)
        .limit(6),
    ]);

    return {
      clients: (clients ?? []) as SearchClient[],
      cases: (cases ?? []) as SearchCase[],
      tasks: (tasks ?? []) as SearchTask[],
    };
  });
