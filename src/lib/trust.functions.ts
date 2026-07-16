import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTrustEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trust_ledger")
      .select(
        "id, client_id, case_id, entry_type, amount, currency, description, description_ar, reference_number, entry_date, recorded_by, created_at",
      )
      .order("entry_date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addSchema = z.object({
  client_id: z.string().uuid(),
  case_id: z.string().uuid().optional().nullable(),
  entry_type: z.enum(["deposit", "drawdown", "refund", "adjustment"]),
  amount: z.number().positive().max(10_000_000),
  currency: z.string().min(3).max(3).default("KWD"),
  description: z.string().max(500).optional().nullable(),
  description_ar: z.string().max(500).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const addTrustEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("trust_ledger").insert({
      ...data,
      case_id: data.case_id || null,
      recorded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTrustEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("trust_ledger")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
