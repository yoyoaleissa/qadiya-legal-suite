/**
 * Detect → explain → store pipeline for MOJ regulatory updates.
 * Shared by the daily cron endpoint and the on-demand "Update Knowledge" button.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMojUpdates, explainUpdate } from "./moj-detect.server";

export type SyncResult = {
  checked: number;
  inserted: number;
  skipped: number;
  usedFallback: boolean;
  /** false when no AI provider is configured — raw text is stored unexplained. */
  aiAvailable: boolean;
};

export async function detectAndStoreMojUpdates(
  client: SupabaseClient<any, any, any>,
): Promise<SyncResult> {
  const { items, usedFallback } = await fetchMojUpdates();

  const { data: existing, error: readError } = await client
    .from("moj_updates")
    .select("source_url, content_hash")
    .limit(5000);
  if (readError) throw new Error(readError.message);

  const urls = new Set((existing ?? []).map((r: { source_url: string }) => r.source_url));
  const hashes = new Set((existing ?? []).map((r: { content_hash: string }) => r.content_hash));

  const fresh: Record<string, unknown>[] = [];
  let skipped = 0;
  let aiAvailable = true;

  for (const item of items) {
    if (urls.has(item.source_url) || hashes.has(item.content_hash)) {
      skipped++;
      continue;
    }
    urls.add(item.source_url);
    hashes.add(item.content_hash);

    let explanation: { explanation_en: string; explanation_ar: string } | null = null;
    if (aiAvailable) {
      explanation = await explainUpdate(item);
      if (!explanation) aiAvailable = false;
    }

    fresh.push({
      ...item,
      status: "new",
      explanation_en: explanation?.explanation_en ?? null,
      explanation_ar: explanation?.explanation_ar ?? null,
    });
  }

  let inserted = 0;
  if (fresh.length > 0) {
    const { data, error } = await client
      .from("moj_updates")
      .upsert(fresh, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    inserted = (data ?? []).length;
  }

  return { checked: items.length, inserted, skipped, usedFallback, aiAvailable };
}

/** Backfill explanations for already-stored rows that don't have one yet. */
export async function explainMissingMojUpdates(
  client: SupabaseClient<any, any, any>,
  limit = 10,
): Promise<{ explained: number; aiAvailable: boolean }> {
  const { data, error } = await client
    .from("moj_updates")
    .select("id, title, title_ar, content, content_ar, category")
    .is("explanation_ar", null)
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  let explained = 0;
  let aiAvailable = true;
  for (const row of data ?? []) {
    const explanation = await explainUpdate(row);
    if (!explanation) {
      aiAvailable = false;
      break;
    }
    const { error: updateError } = await client
      .from("moj_updates")
      .update({
        explanation_en: explanation.explanation_en,
        explanation_ar: explanation.explanation_ar,
      })
      .eq("id", row.id);
    if (!updateError) explained++;
  }

  return { explained, aiAvailable };
}
