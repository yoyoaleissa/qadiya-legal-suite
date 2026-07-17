import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface KnowledgeSource {
  title: string;
  chunks: number;
  created_at: string;
}

/** Ingest a document: chunk the text, embed each chunk, and store it for retrieval. */
export const ingestKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(300),
        content: z.string().trim().min(1),
        scope: z.enum(["global", "firm"]).default("firm"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ chunks: number }> => {
    const supabase = context.supabase;
    const { embedTexts, chunkText } = await import("@/lib/embeddings.server");

    const chunks = chunkText(data.content);
    if (chunks.length === 0) throw new Error("No text content to ingest");

    const embeddings = await embedTexts(chunks);

    const rows = chunks.map((content, index) => ({
      title: data.title,
      content,
      embedding: JSON.stringify(embeddings[index]),
      scope: data.scope,
      metadata: { source: data.title, chunk_index: index, total_chunks: chunks.length },
    }));

    const { error } = await supabase.from("legal_knowledge").insert(rows);
    if (error) throw new Error(error.message);

    return { chunks: chunks.length };
  });

/** List uploaded knowledge grouped by source title. */
export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KnowledgeSource[]> => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("legal_knowledge")
      .select("title, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const map = new Map<string, KnowledgeSource>();
    for (const row of data ?? []) {
      const existing = map.get(row.title);
      if (existing) {
        existing.chunks += 1;
      } else {
        map.set(row.title, { title: row.title, chunks: 1, created_at: row.created_at });
      }
    }
    return Array.from(map.values());
  });

/** Delete all chunks belonging to a source title. */
export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ title: z.string().min(1) }).parse(data))
  .handler(async ({ context, data }): Promise<{ success: boolean }> => {
    const supabase = context.supabase;
    const { error } = await supabase.from("legal_knowledge").delete().eq("title", data.title);
    if (error) throw new Error(error.message);
    return { success: true };
  });
