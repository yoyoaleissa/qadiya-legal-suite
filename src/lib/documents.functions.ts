import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCaseDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("case_documents")
      .select(
        "id, case_id, client_id, uploaded_by, file_name, storage_path, mime_type, size_bytes, category, description, is_client_visible, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const recordSchema = z.object({
  case_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  file_name: z.string().min(1).max(300),
  storage_path: z.string().min(1).max(500),
  mime_type: z.string().max(200).optional().nullable(),
  size_bytes: z.number().int().min(0).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_client_visible: z.boolean().default(false),
});

export const recordUploadedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("case_documents").insert({
      ...data,
      case_id: data.case_id || null,
      client_id: data.client_id || null,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocumentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ storage_path: z.string().min(1).max(500) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("case-documents")
      .createSignedUrl(data.storage_path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const deleteCaseDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc, error: fetchErr } = await context.supabase
      .from("case_documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (doc?.storage_path) {
      await context.supabase.storage.from("case-documents").remove([doc.storage_path]);
    }
    const { error } = await context.supabase.from("case_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
