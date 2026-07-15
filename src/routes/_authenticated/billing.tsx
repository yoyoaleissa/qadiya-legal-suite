import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Loader2, DollarSign, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { listInvoices, createInvoice, updateInvoiceStatus, type InvoiceItem } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Qadiya OS" },
      { name: "description", content: "Time tracking, invoicing, and expense logging for Kuwaiti law firms." },
    ],
  }),
  component: BillingPage,
});

function statusColor(s: string) {
  switch (s) {
    case "paid": return "bg-success/15 text-success";
    case "sent": return "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold";
    case "overdue": return "bg-destructive/10 text-destructive";
    case "cancelled": return "bg-muted text-muted-foreground line-through";
    default: return "bg-muted text-muted-foreground";
  }
}

function statusLabelFn(s: string, tt: (en: string, ar: string) => string) {
  switch (s) {
    case "paid": return tt("Paid", "مدفوعة");
    case "sent": return tt("Sent", "مُرسلة");
    case "overdue": return tt("Overdue", "متأخرة");
    case "cancelled": return tt("Cancelled", "ملغاة");
    default: return tt("Draft", "مسودة");
  }
}

type FilterKey = "all" | "outstanding" | "collected" | "overdue";

function BillingPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [showCreate, setShowCreate] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();

  const runInvoices = useServerFn(listInvoices);
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => runInvoices(),
    enabled: isAdmin,
  });

  const isOverdue = (i: InvoiceItem) => i.status === "overdue";
  const filtered = (invoices ?? []).filter((i) => {
    if (activeFilter === "outstanding") return i.status === "sent" || i.status === "overdue";
    if (activeFilter === "collected") return i.status === "paid";
    if (activeFilter === "overdue") return i.status === "overdue";
    return true;
  });

  const toggleFilter = (key: Exclude<FilterKey, "all">) =>
    setActiveFilter((prev) => (prev === key ? "all" : key));

  if (rolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tt("Loading…", "جارٍ التحميل…")}
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={ShieldAlert}
            title={tt("Admins only", "للمسؤولين فقط")}
            desc={tt(
              "Billing and financial data are restricted to firm administrators.",
              "الفوترة والبيانات المالية مقصورة على مسؤولي المكتب.",
            )}
          />
        </CardContent>
      </Card>
    );
  }


  const totalOutstanding = (invoices ?? []).filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const totalPaid = (invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueCount = (invoices ?? []).filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Finance", "المالية")}</div>
          <h1 className="font-display text-3xl">{tt("Billing", "الفوترة")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tt("Invoices, payments, and outstanding balances.", "الفواتير والمدفوعات والأرصدة المستحقة.")}</p>
        </div>
        <Button className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {tt("New Invoice", "فاتورة جديدة")}
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{tt("Loading…", "جارٍ التحميل…")}</CardContent></Card>
      ) : (invoices ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Receipt}
              title={tt("No invoices yet", "لا توجد فواتير بعد")}
              desc={tt("Create your first invoice to start tracking payments and outstanding balances.", "أنشئ أول فاتورة لبدء تتبع المدفوعات والأرصدة المستحقة.")}
              action={
                <Button className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" />
                  {tt("New Invoice", "فاتورة جديدة")}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards — click to filter */}
          <div className="grid gap-4 sm:grid-cols-3" role="tablist" aria-label={tt("Invoice filters", "تصفية الفواتير")}>
            <FilterCard
              active={activeFilter === "outstanding"}
              onClick={() => toggleFilter("outstanding")}
              accent="gold"
              icon={<DollarSign className="h-5 w-5 text-gold" />}
              iconBg="bg-gold/15"
              label={tt("Outstanding", "مستحقة")}
              value={<>{totalOutstanding.toFixed(3)} <span className="text-xs text-muted-foreground">KWD</span></>}
              ariaLabel={tt("Filter by outstanding invoices", "تصفية الفواتير المستحقة")}
            />
            <FilterCard
              active={activeFilter === "collected"}
              onClick={() => toggleFilter("collected")}
              accent="success"
              icon={<CheckCircle2 className="h-5 w-5 text-success" />}
              iconBg="bg-success/15"
              label={tt("Collected", "محصّلة")}
              value={<>{totalPaid.toFixed(3)} <span className="text-xs text-muted-foreground">KWD</span></>}
              ariaLabel={tt("Filter by collected invoices", "تصفية الفواتير المحصّلة")}
            />
            <FilterCard
              active={activeFilter === "overdue"}
              onClick={() => toggleFilter("overdue")}
              accent="destructive"
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              iconBg="bg-destructive/15"
              label={tt("Overdue", "متأخرة")}
              value={<>{overdueCount} <span className="text-xs text-muted-foreground">{tt("invoices", "فواتير")}</span></>}
              ariaLabel={tt("Filter by overdue invoices", "تصفية الفواتير المتأخرة")}
            />
          </div>


          {/* Invoice List */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">{tt("Invoice", "الفاتورة")}</th>
                    <th className="px-4 py-3 text-start">{tt("Client", "العميل")}</th>
                    <th className="px-4 py-3 text-start">{tt("Amount", "المبلغ")}</th>
                    <th className="px-4 py-3 text-start">{tt("Status", "الحالة")}</th>
                    <th className="px-4 py-3 text-start">{tt("Issue Date", "تاريخ الإصدار")}</th>
                    <th className="px-4 py-3 text-start">{tt("Due Date", "تاريخ الاستحقاق")}</th>
                    <th className="px-4 py-3 text-start">{tt("Actions", "إجراءات")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{tt("No invoices match this filter.", "لا توجد فواتير مطابقة لهذا التصفية.")}</td></tr>
                  ) : filtered.map((inv) => (
                    <InvoiceRow key={inv.id} inv={inv} tt={tt} lang={lang} isOverdue={isOverdue(inv)} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <CreateInvoiceDialog open={showCreate} onClose={() => setShowCreate(false)} tt={tt} lang={lang} onCreated={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })} />
    </div>
  );
}

function FilterCard({ active, onClick, accent, icon, iconBg, label, value, ariaLabel }: {
  active: boolean;
  onClick: () => void;
  accent: "gold" | "success" | "destructive";
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  ariaLabel: string;
}) {
  const ring =
    accent === "gold" ? "ring-gold border-gold"
    : accent === "success" ? "ring-success border-success"
    : "ring-destructive border-destructive";
  const activeBg =
    accent === "gold" ? "bg-gold/5"
    : accent === "success" ? "bg-success/5"
    : "bg-destructive/5";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "text-start rounded-xl border bg-card transition-all outline-none",
        "hover:border-foreground/20 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
        active ? cn("ring-2 shadow-sm", ring, activeBg) : "border-border",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconBg)}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-display">{value}</div>
        </div>
      </div>
    </button>
  );
}



function InvoiceRow({ inv, tt, lang, isOverdue, onUpdate }: { inv: InvoiceItem; tt: (en: string, ar: string) => string; lang: string; isOverdue: boolean; onUpdate: () => void }) {
  const runUpdateStatus = useServerFn(updateInvoiceStatus);
  const [loading, setLoading] = useState(false);

  const markAs = async (status: "sent" | "paid" | "cancelled") => {
    setLoading(true);
    try {
      await runUpdateStatus({ data: { id: inv.id, status } });
      onUpdate();
    } finally { setLoading(false); }
  };

  const displayStatus = isOverdue && inv.status !== "paid" && inv.status !== "cancelled" ? "overdue" : inv.status;

  return (
    <tr className="hover:bg-accent/30 transition-colors">
      <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
      <td className="px-4 py-3">
        <span className={lang === "ar" ? "font-arabic" : ""}>{lang === "ar" ? inv.client_name_ar ?? inv.client_name : inv.client_name ?? "—"}</span>
        {inv.case_number && <span className="block text-xs text-muted-foreground">#{inv.case_number}</span>}
      </td>
      <td className="px-4 py-3 font-medium">{inv.amount.toFixed(3)} <span className="text-xs text-muted-foreground">{inv.currency}</span></td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(displayStatus))}>
          {displayStatus === "paid" && <CheckCircle2 className="h-3 w-3" />}
          {displayStatus === "overdue" && <AlertTriangle className="h-3 w-3" />}
          {statusLabelFn(displayStatus, tt)}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{inv.issue_date}</td>
      <td className={cn("px-4 py-3", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>{inv.due_date ?? "—"}</td>
      <td className="px-4 py-3">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="flex gap-1">
            {inv.status === "draft" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markAs("sent")}>{tt("Send", "إرسال")}</Button>}
            {(inv.status === "sent" || inv.status === "overdue" || isOverdue) && inv.status !== "paid" && <Button size="sm" variant="ghost" className="h-7 text-xs text-success" onClick={() => markAs("paid")}>{tt("Mark Paid", "تم الدفع")}</Button>}
            {inv.status !== "cancelled" && inv.status !== "paid" && <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => markAs("cancelled")}>{tt("Cancel", "إلغاء")}</Button>}
          </div>
        )}
      </td>
    </tr>
  );
}

function CreateInvoiceDialog({ open, onClose, tt, lang, onCreated }: { open: boolean; onClose: () => void; tt: (en: string, ar: string) => string; lang: string; onCreated: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const runCreate = useServerFn(createInvoice);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setLoading(true);
    try {
      await runCreate({ data: { amount: numAmount, description: description || undefined, due_date: dueDate || undefined } });
      onCreated();
      onClose();
      setAmount(""); setDescription(""); setDueDate("");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tt("New Invoice", "فاتورة جديدة")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground">{tt("Amount (KWD)", "المبلغ (د.ك)")}</label>
            <Input type="number" step="0.001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{tt("Description", "الوصف")}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={tt("e.g. Legal consultation fees", "مثال: أتعاب استشارة قانونية")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{tt("Due Date", "تاريخ الاستحقاق")}</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tt("Cancel", "إلغاء")}</Button>
          <Button onClick={handleSubmit} disabled={!amount || loading} className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("Create Invoice", "إنشاء الفاتورة")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
