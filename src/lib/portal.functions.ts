import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Client portal server functions.
 *
 * Portal users sign in with Supabase Auth (magic link). Their session email
 * must match a row in `public.clients.email` — that mapping is how we resolve
 * "which client am I." All portal reads are done through the service-role
 * client for that scoped client_id only, so RLS on internal tables can stay
 * strict without giving clients broad SELECT rights.
 */

type ResolvedClient = { id: string; name: string; name_ar: string | null; email: string };

async function resolveClientForCaller(email: string | undefined): Promise<ResolvedClient | null> {
  if (!email) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, name_ar, email")
    .ilike("email", email)
    .maybeSingle();
  if (error || !data) return null;
  return data as ResolvedClient;
}

export const getPortalProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const client = await resolveClientForCaller(email);
    return { email: email ?? null, client };
  });

export const listPortalCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const client = await resolveClientForCaller(email);
    if (!client) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cases")
      .select("id, case_number, title, title_ar, case_type, case_type_ar, overall_status, updated_at")
      .eq("client_id", client.id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPortalInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const client = await resolveClientForCaller(email);
    if (!client) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, invoice_number, amount, currency, status, issue_date, due_date, paid_date, description, description_ar",
      )
      .eq("client_id", client.id)
      .order("issue_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPortalMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const client = await resolveClientForCaller(email);
    if (!client) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("client_messages")
      .select("id, body, sender, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendPortalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ body: z.string().min(1).max(4000) }).parse(data))
  .handler(async ({ context, data }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const client = await resolveClientForCaller(email);
    if (!client) throw new Error("Not a portal client");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("client_messages")
      .insert({ client_id: client.id, body: data.body, sender: "client" })
      .select("id, body, sender, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Team-wide activity feed (audit log surfaced with friendly labels). */
export const listActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[]));
    const { data: profiles } = actorIds.length
      ? await supabase.from("profiles").select("id, full_name, full_name_ar").in("id", actorIds)
      : { data: [] as { id: string; full_name: string | null; full_name_ar: string | null }[] };
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      ...r,
      actor_name: r.actor_id ? profMap.get(r.actor_id)?.full_name ?? null : null,
      actor_name_ar: r.actor_id ? profMap.get(r.actor_id)?.full_name_ar ?? null : null,
    }));
  });
