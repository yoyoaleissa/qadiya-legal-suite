import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ClientListItem {
  id: string;
  name: string;
  name_ar: string | null;
  notes: string | null;
  case_count: number;
}

export interface ClientTimelineEvent {
  event_date: string | null;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  event_type: string | null;
}

export interface ClientCase {
  id: string;
  case_number: string;
  title: string | null;
  title_ar: string | null;
  case_type: string | null;
  case_type_ar: string | null;
  overall_status: string;
  timeline: ClientTimelineEvent[];
}

export interface ClientDetail {
  id: string;
  name: string;
  name_ar: string | null;
  notes: string | null;
  cases: ClientCase[];
}

export const listClients = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientListItem[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, name, name_ar, notes")
      .order("name");
    if (error) throw new Error(error.message);

    const { data: cases } = await supabase.from("cases").select("client_id");
    const counts = new Map<string, number>();
    for (const c of cases ?? []) {
      if (c.client_id) counts.set(c.client_id, (counts.get(c.client_id) ?? 0) + 1);
    }

    return (clients ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      name_ar: c.name_ar,
      notes: c.notes,
      case_count: counts.get(c.id) ?? 0,
    }));
  },
);

export const getClientDetail = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ clientId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<ClientDetail | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: client } = await supabase
      .from("clients")
      .select("id, name, name_ar, notes")
      .eq("id", data.clientId)
      .maybeSingle();
    if (!client) return null;

    const { data: cases } = await supabase
      .from("cases")
      .select("id, case_number, title, title_ar, case_type, case_type_ar, overall_status")
      .eq("client_id", data.clientId)
      .order("created_at");

    const result: ClientCase[] = [];
    for (const cs of cases ?? []) {
      const { data: timeline } = await supabase
        .from("case_timeline")
        .select("event_date, title, title_ar, description, description_ar, event_type, sort_order")
        .eq("case_id", cs.id)
        .order("sort_order");
      result.push({
        id: cs.id,
        case_number: cs.case_number,
        title: cs.title,
        title_ar: cs.title_ar,
        case_type: cs.case_type,
        case_type_ar: cs.case_type_ar,
        overall_status: cs.overall_status,
        timeline: (timeline ?? []).map((t) => ({
          event_date: t.event_date,
          title: t.title,
          title_ar: t.title_ar,
          description: t.description,
          description_ar: t.description_ar,
          event_type: t.event_type,
        })),
      });
    }

    return {
      id: client.id,
      name: client.name,
      name_ar: client.name_ar,
      notes: client.notes,
      cases: result,
    };
  });
