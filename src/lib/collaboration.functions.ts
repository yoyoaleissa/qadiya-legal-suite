import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ Case Notes ============

export interface CaseNote {
  id: string;
  case_id: string;
  case_number: string | null;
  author_id: string;
  author_email: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export const listMyCaseNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaseNote[]> => {
    const supabase = context.supabase;
    const { data: notes, error } = await supabase
      .from("case_notes")
      .select("id, case_id, author_id, body, is_internal, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const caseIds = Array.from(new Set((notes ?? []).map((n) => n.case_id)));
    const authorIds = Array.from(new Set((notes ?? []).map((n) => n.author_id)));
    const [{ data: cases }, { data: profiles }] = await Promise.all([
      caseIds.length
        ? supabase.from("cases").select("id, case_number").in("id", caseIds)
        : Promise.resolve({ data: [] as { id: string; case_number: string }[] }),
      authorIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);
    const caseMap = new Map((cases ?? []).map((c) => [c.id, c.case_number]));
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (notes ?? []).map((n) => ({
      id: n.id,
      case_id: n.case_id,
      case_number: caseMap.get(n.case_id) ?? null,
      author_id: n.author_id,
      author_email: profMap.get(n.author_id) ?? null,
      body: n.body,
      is_internal: n.is_internal,
      created_at: n.created_at,
    }));
  });

export const listCaseNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ case_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<CaseNote[]> => {
    const supabase = context.supabase;
    const { data: notes, error } = await supabase
      .from("case_notes")
      .select("id, case_id, author_id, body, is_internal, created_at")
      .eq("case_id", data.case_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const authorIds = Array.from(new Set((notes ?? []).map((n) => n.author_id)));
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (notes ?? []).map((n) => ({
      id: n.id,
      case_id: n.case_id,
      case_number: null,
      author_id: n.author_id,
      author_email: profMap.get(n.author_id) ?? null,
      body: n.body,
      is_internal: n.is_internal,
      created_at: n.created_at,
    }));
  });

export const createCaseNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        case_id: z.string().uuid(),
        body: z.string().min(1).max(4000),
        is_internal: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: row, error } = await supabase
      .from("case_notes")
      .insert({
        case_id: data.case_id,
        author_id: context.userId,
        body: data.body,
        is_internal: data.is_internal,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Fire-and-forget audit
    await supabase.from("audit_log").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "case_note.create",
      resource_type: "case_note",
      resource_id: row.id,
      metadata: { case_id: data.case_id, internal: data.is_internal },
    });
    return row;
  });

// ============ Audit Log ============

export interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().min(1).max(500).default(100) }).parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<AuditEntry[]> => {
    const supabase = context.supabase;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, actor_email, action, resource_type, resource_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as AuditEntry[];
  });

// ============ Aged Receivables + Reminder ============

export interface AgedInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  days_overdue: number;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  client_id: string | null;
  client_name: string | null;
  client_name_ar: string | null;
  client_email: string | null;
}

function bucketFor(days: number): AgedInvoice["bucket"] {
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export const listAgedReceivables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgedInvoice[]> => {
    const supabase = context.supabase;
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, status, due_date, client_id")
      .in("status", ["sent", "overdue", "draft"]);
    if (error) throw new Error(error.message);
    const clientIds = Array.from(
      new Set((invoices ?? []).map((i) => i.client_id).filter(Boolean) as string[]),
    );
    const { data: clients } = clientIds.length
      ? await supabase.from("clients").select("id, name, name_ar, email").in("id", clientIds)
      : { data: [] as { id: string; name: string; name_ar: string | null; email: string | null }[] };
    const cmap = new Map((clients ?? []).map((c) => [c.id, c]));
    const today = new Date();
    return (invoices ?? []).map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : null;
      const days = due
        ? Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const client = inv.client_id ? cmap.get(inv.client_id) : null;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        due_date: inv.due_date,
        days_overdue: Math.max(0, days),
        bucket: bucketFor(days),
        client_id: inv.client_id,
        client_name: client?.name ?? null,
        client_name_ar: client?.name_ar ?? null,
        client_email: client?.email ?? null,
      };
    });
  });

export const buildArabicReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ invoice_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ subject: string; body: string; email: string | null }> => {
    const supabase = context.supabase;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("invoice_number, amount, currency, due_date, client_id")
      .eq("id", data.invoice_id)
      .single();
    if (error) throw new Error(error.message);
    const { data: settings } = await supabase
      .from("firm_settings")
      .select("firm_name_ar, firm_name")
      .limit(1)
      .maybeSingle();
    const firmName =
      settings?.firm_name_ar || settings?.firm_name || "مكتب المحاماة";
    let clientName = "عزيزي الموكّل";
    let email: string | null = null;
    if (inv.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("name_ar, name, email")
        .eq("id", inv.client_id)
        .single();
      clientName = c?.name_ar || c?.name || clientName;
      email = c?.email ?? null;
    }
    const due = inv.due_date ? new Date(inv.due_date) : null;
    const days = due
      ? Math.max(0, Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const dueStr = due ? due.toLocaleDateString("ar-KW") : "—";
    const subject = `تذكير بسداد الفاتورة رقم ${inv.invoice_number}`;
    const body = `السلام عليكم ${clientName}،

نتمنى لكم دوام الصحة والتوفيق.

نود تذكيركم بأن الفاتورة رقم ${inv.invoice_number} بمبلغ ${Number(inv.amount).toFixed(3)} ${inv.currency} كانت مستحقة السداد بتاريخ ${dueStr}${days > 0 ? ` (متأخرة منذ ${days} يوماً)` : ""}.

نرجو التكرم بسدادها في أقرب فرصة ممكنة. في حال تم السداد، يرجى تجاهل هذا التذكير مع الشكر.

لأي استفسار، لا تترددوا في التواصل معنا.

مع خالص التقدير،
${firmName}`;
    await supabase.from("audit_log").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "invoice.reminder_generated",
      resource_type: "invoice",
      resource_id: data.invoice_id,
    });
    return { subject, body, email };
  });
