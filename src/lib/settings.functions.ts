import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFirmSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("firm_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const upsertSchema = z.object({
  firm_name: z.string().min(1).max(200),
  firm_name_ar: z.string().min(1).max(200),
  vat_number: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  address_ar: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  logo_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  invoice_prefix: z.string().min(1).max(20),
  invoice_next_seq: z.number().int().min(1),
  working_hours_start: z.string().regex(/^\d{2}:\d{2}$/),
  working_hours_end: z.string().regex(/^\d{2}:\d{2}$/),
  holidays: z.array(z.object({ date: z.string(), label: z.string() })).default([]),
  default_currency: z.string().min(3).max(3),
  bank_name: z.string().max(200).optional().nullable(),
  bank_iban: z.string().max(50).optional().nullable(),
  knet_merchant_link: z.string().max(500).optional().nullable(),
});

export const upsertFirmSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const payload = {
      ...data,
      owner_id: userId,
      email: data.email || null,
      logo_url: data.logo_url || null,
    };
    const { data: existing } = await supabase
      .from("firm_settings")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("firm_settings")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id };
    }
    const { data: inserted, error } = await supabase
      .from("firm_settings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

// Kuwait 2026 public holidays as a helpful default seed
export const KUWAIT_HOLIDAYS_2026 = [
  { date: "2026-01-01", label: "New Year's Day" },
  { date: "2026-02-25", label: "Kuwait National Day" },
  { date: "2026-02-26", label: "Liberation Day" },
  { date: "2026-03-20", label: "Isra & Miraj" },
  { date: "2026-03-20", label: "First day of Ramadan" },
  { date: "2026-04-19", label: "Eid al-Fitr" },
  { date: "2026-04-20", label: "Eid al-Fitr" },
  { date: "2026-04-21", label: "Eid al-Fitr" },
  { date: "2026-06-26", label: "Arafat Day" },
  { date: "2026-06-27", label: "Eid al-Adha" },
  { date: "2026-06-28", label: "Eid al-Adha" },
  { date: "2026-06-29", label: "Eid al-Adha" },
  { date: "2026-07-17", label: "Islamic New Year" },
  { date: "2026-09-25", label: "Prophet's Birthday" },
];
