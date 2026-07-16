import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { toast } from "sonner";
import { listTrustEntries, addTrustEntry, deleteTrustEntry } from "@/lib/trust.functions";
import { listClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/trust")({
  head: () => ({
    meta: [
      { title: "Trust Account — Qadiya OS" },
      {
        name: "description",
        content:
          "Track client trust/escrow deposits, drawdowns and balances in KWD — required for Kuwait Bar compliance.",
      },
    ],
  }),
  component: TrustPage,
});

type EntryType = "deposit" | "drawdown" | "refund" | "adjustment";

function TrustPage() {
  const { t, lang } = useApp();
  const { isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const runList = useServerFn(listTrustEntries);
  const runAdd = useServerFn(addTrustEntry);
  const runDelete = useServerFn(deleteTrustEntry);
  const runClients = useServerFn(listClients);

  const { data: entries } = useQuery({ queryKey: ["trust-entries"], queryFn: () => runList() });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => runClients() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    entry_type: "deposit" as EntryType,
    amount: "",
    description: "",
    reference_number: "",
    entry_date: new Date().toISOString().slice(0, 10),
  });

  const balances = useMemo(() => {
    const byClient = new Map<string, number>();
    for (const e of entries ?? []) {
      const sign = e.entry_type === "deposit" ? 1 : e.entry_type === "adjustment" ? 1 : -1;
      byClient.set(e.client_id, (byClient.get(e.client_id) ?? 0) + sign * Number(e.amount));
    }
    return byClient;
  }, [entries]);

  const total = useMemo(
    () => Array.from(balances.values()).reduce((s, v) => s + v, 0),
    [balances],
  );

  const submit = async () => {
    if (!form.client_id || !form.amount) {
      toast.error(t("Client and amount required", "الموكّل والمبلغ مطلوبان"));
      return;
    }
    try {
      await runAdd({
        data: {
          client_id: form.client_id,
          entry_type: form.entry_type,
          amount: parseFloat(form.amount),
          currency: "KWD",
          description: form.description || null,
          description_ar: null,
          reference_number: form.reference_number || null,
          entry_date: form.entry_date,
        },
      });
      toast.success(t("Entry recorded", "تم تسجيل القيد"));
      setOpen(false);
      setForm({
        client_id: "",
        entry_type: "deposit",
        amount: "",
        description: "",
        reference_number: "",
        entry_date: new Date().toISOString().slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ["trust-entries"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this trust entry?", "حذف هذا القيد؟"))) return;
    try {
      await runDelete({ data: { id } });
      qc.invalidateQueries({ queryKey: ["trust-entries"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.[lang === "ar" ? "name_ar" : "name"] ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("Compliance", "الامتثال")}
          </div>
          <h1 className="font-display text-3xl">{t("Trust Account", "حساب الأمانة")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "Kuwait Bar-compliant tracking of client deposits and drawdowns.",
              "تتبع ودائع وسحوبات الموكّلين وفق متطلبات جمعية المحامين.",
            )}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("New entry", "قيد جديد")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("Total held", "الإجمالي المحتفظ به")} value={`${total.toFixed(3)} KWD`} accent />
        <StatCard label={t("Active clients", "موكّلون نشطون")} value={String(balances.size)} />
        <StatCard label={t("Total entries", "إجمالي القيود")} value={String((entries ?? []).length)} />
      </div>

      {/* Balances per client */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-display text-lg mb-3">
            {t("Balances by client", "الأرصدة حسب الموكّل")}
          </h2>
          {balances.size === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("No trust balances yet.", "لا توجد أرصدة أمانة بعد.")}
            </p>
          ) : (
            <div className="divide-y">
              {Array.from(balances.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cid, bal]) => (
                  <div key={cid} className="flex items-center justify-between py-2.5">
                    <span className={lang === "ar" ? "font-arabic" : ""}>{clientName(cid)}</span>
                    <span className={`font-mono font-medium ${bal < 0 ? "text-destructive" : ""}`}>
                      {bal.toFixed(3)} KWD
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-display text-lg mb-3">{t("Ledger", "دفتر الأمانة")}</h2>
          {(entries ?? []).length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Wallet className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {t("No entries yet.", "لا توجد قيود بعد.")}
            </div>
          ) : (
            <div className="divide-y">
              {(entries ?? []).map((e) => {
                const isDeposit = e.entry_type === "deposit" || e.entry_type === "adjustment";
                return (
                  <div key={e.id} className="py-3 flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-md flex items-center justify-center ${
                        isDeposit ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        <span className={lang === "ar" ? "font-arabic" : ""}>{clientName(e.client_id)}</span>
                        {e.reference_number && (
                          <span className="text-xs text-muted-foreground ms-2 font-mono">
                            #{e.reference_number}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.entry_date} · <Badge variant="outline" className="text-[10px]">{e.entry_type}</Badge>
                        {e.description && ` · ${e.description}`}
                      </div>
                    </div>
                    <div className={`font-mono text-sm ${isDeposit ? "text-emerald-600" : "text-destructive"}`}>
                      {isDeposit ? "+" : "-"}
                      {Number(e.amount).toFixed(3)} {e.currency}
                    </div>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => remove(e.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("New trust entry", "قيد أمانة جديد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("Client", "الموكّل")}</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select client", "اختر الموكّل")} />
                </SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {lang === "ar" ? c.name_ar : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Type", "النوع")}</Label>
                <Select
                  value={form.entry_type}
                  onValueChange={(v) => setForm({ ...form, entry_type: v as EntryType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">{t("Deposit", "إيداع")}</SelectItem>
                    <SelectItem value="drawdown">{t("Drawdown", "سحب")}</SelectItem>
                    <SelectItem value="refund">{t("Refund", "استرداد")}</SelectItem>
                    <SelectItem value="adjustment">{t("Adjustment", "تعديل")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Amount (KWD)", "المبلغ (د.ك)")}</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Date", "التاريخ")}</Label>
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Reference #", "رقم مرجعي")}</Label>
                <Input
                  value={form.reference_number}
                  onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Description", "الوصف")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={submit}>{t("Record", "تسجيل")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`font-display text-3xl mt-2 ${accent ? "text-gold" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
