import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  description: string | null;
  description_ar: string | null;
  client_name: string | null;
  client_name_ar: string | null;
  case_number: string | null;
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvoiceItem[]> => {
    const supabase = context.supabase;
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, currency, status, issue_date, due_date, paid_date, description, description_ar, client_id, case_id")
      .order("issue_date", { ascending: false });
    if (error) throw new Error(error.message);

    const [{ data: clients }, { data: cases }] = await Promise.all([
      supabase.from("clients").select("id, name, name_ar"),
      supabase.from("cases").select("id, case_number"),
    ]);

    const clientMap = new Map((clients ?? []).map((c) => [c.id, c] as const));
    const caseMap = new Map((cases ?? []).map((c) => [c.id, c] as const));

    return (invoices ?? []).map((inv) => {
      const client = inv.client_id ? clientMap.get(inv.client_id) : null;
      const cs = inv.case_id ? caseMap.get(inv.case_id) : null;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: Number(inv.amount),
        currency: inv.currency,
        status: inv.status,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        paid_date: inv.paid_date,
        description: inv.description,
        description_ar: inv.description_ar,
        client_name: client?.name ?? null,
        client_name_ar: client?.name_ar ?? null,
        case_number: cs?.case_number ?? null,
      };
    });
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      client_id: z.string().uuid().optional(),
      case_id: z.string().uuid().optional(),
      amount: z.number().positive(),
      currency: z.string().default("KWD"),
      description: z.string().optional(),
      description_ar: z.string().optional(),
      due_date: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    // Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const invoice_number = `INV-${dateStr}-${rand}`;

    const { data: row, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number,
        client_id: data.client_id || null,
        case_id: data.case_id || null,
        amount: data.amount,
        currency: data.currency,
        description: data.description || null,
        description_ar: data.description_ar || null,
        due_date: data.due_date || null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    }).parse(data)
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const updates: { status: string; paid_date?: string } = { status: data.status };
    if (data.status === "paid") {
      updates.paid_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
