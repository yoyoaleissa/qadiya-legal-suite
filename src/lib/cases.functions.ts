import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      name: z.string().min(1),
      name_ar: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      national_id: z.string().optional(),
      notes: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("clients")
      .insert({
        name: data.name,
        name_ar: data.name_ar || null,
        email: data.email || null,
        phone: data.phone || null,
        national_id: data.national_id || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      case_number: z.string().min(1),
      title: z.string().min(1),
      title_ar: z.string().optional(),
      client_id: z.string().uuid().optional(),
      case_type: z.string().optional(),
      case_type_ar: z.string().optional(),
      court: z.string().optional(),
      overall_status: z.enum(["open", "active", "appeal", "execution", "closed"]).default("open"),
      filed_date: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("cases")
      .insert({
        case_number: data.case_number,
        title: data.title,
        title_ar: data.title_ar || null,
        client_id: data.client_id || null,
        case_type: data.case_type || null,
        case_type_ar: data.case_type_ar || null,
        overall_status: data.overall_status,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Create initial court level entry if court is provided
    if (data.court || data.filed_date) {
      await supabase.from("court_levels").insert({
        case_id: row.id,
        level: "first_instance",
        court_name: data.court || null,
        registered_date: data.filed_date || null,
      });
    }

    return row;
  });

/** Add a manual timeline event to a case, optionally updating the case's overall status. */
export const addTimelineEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        case_id: z.string().uuid(),
        title: z.string().trim().min(1),
        title_ar: z.string().optional(),
        description: z.string().optional(),
        description_ar: z.string().optional(),
        event_date: z.string().optional(),
        event_type: z.string().optional(),
        new_status: z
          .enum(["open", "active", "appeal", "execution", "closed"])
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;

    const { data: maxRow } = await supabase
      .from("case_timeline")
      .select("sort_order")
      .eq("case_id", data.case_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = (maxRow?.sort_order ?? 0) + 1;

    const { error } = await supabase.from("case_timeline").insert({
      case_id: data.case_id,
      title: data.title,
      title_ar: data.title_ar || null,
      description: data.description || null,
      description_ar: data.description_ar || null,
      event_date: data.event_date || null,
      event_type: data.event_type || "manual",
      sort_order: nextSort,
    });
    if (error) throw new Error(error.message);

    if (data.new_status) {
      const { error: upErr } = await supabase
        .from("cases")
        .update({ overall_status: data.new_status })
        .eq("id", data.case_id);
      if (upErr) throw new Error(upErr.message);
    }

    return { success: true };
  });

