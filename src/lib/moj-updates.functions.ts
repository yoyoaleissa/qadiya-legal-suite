import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Detected Ministry of Justice regulatory updates.
 *
 * Rows are written by the bot service (bot/src/cron/mojUpdatesCron.js) and read
 * here for human review. No embeddings and no legal_knowledge ingestion happen
 * at this stage — these are "detected, pending review" only.
 */

export type MojUpdate = {
  id: string;
  title: string | null;
  title_ar: string;
  content: string | null;
  content_ar: string | null;
  source_url: string;
  category: string;
  published_at: string | null;
  detected_at: string;
  status: string;
  reviewed_at: string | null;
  explanation_en: string | null;
  explanation_ar: string | null;
};

export const listMojUpdates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("moj_updates")
      .select(
        "id, title, title_ar, content, content_ar, source_url, category, published_at, detected_at, status, reviewed_at, explanation_en, explanation_ar",
      )
      .order("detected_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as MojUpdate[];
  });

/**
 * On-demand run of the same detection job the daily cron triggers, plus
 * plain-language explanations for anything new (and any older rows still
 * missing one). Returns aiAvailable: false when no AI provider is configured.
 */
export const refreshMojUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { detectAndStoreMojUpdates, explainMissingMojUpdates } = await import(
      "@/lib/moj-detect.sync.server"
    );

    const result = await detectAndStoreMojUpdates(supabaseAdmin);
    const backfill = await explainMissingMojUpdates(supabaseAdmin);

    return {
      checked: result.checked,
      inserted: result.inserted,
      skipped: result.skipped,
      explained: backfill.explained,
      aiAvailable: result.aiAvailable && backfill.aiAvailable,
    };
  });


export const setMojUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "reviewed"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("moj_updates")
      .update({
        status: data.status,
        reviewed_at: data.status === "reviewed" ? new Date().toISOString() : null,
        reviewed_by: data.status === "reviewed" ? context.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
