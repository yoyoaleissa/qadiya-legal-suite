import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAgedReceivables, buildArabicReminder } from "@/lib/collaboration.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy, Mail, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BUCKET_LABEL: Record<string, [string, string]> = {
  current: ["Current", "قائمة"],
  "1-30": ["1–30d", "1–30 يوماً"],
  "31-60": ["31–60d", "31–60 يوماً"],
  "61-90": ["61–90d", "61–90 يوماً"],
  "90+": ["90d+", "أكثر من 90"],
};

const BUCKET_COLOR: Record<string, string> = {
  current: "bg-muted text-foreground",
  "1-30": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  "31-60": "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
  "61-90": "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  "90+": "bg-red-200 text-red-950 dark:bg-red-800 dark:text-red-50",
};

export function AgedReceivables() {
  const { t, lang } = useApp();
  const fetchAged = useServerFn(listAgedReceivables);
  const buildReminder = useServerFn(buildArabicReminder);
  const { data, isLoading } = useQuery({
    queryKey: ["aged-receivables"],
    queryFn: () => fetchAged(),
  });
  const [reminder, setReminder] = useState<{
    subject: string;
    body: string;
    email: string | null;
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const buckets: Record<string, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    "1-30": { count: 0, total: 0 },
    "31-60": { count: 0, total: 0 },
    "61-90": { count: 0, total: 0 },
    "90+": { count: 0, total: 0 },
  };
  (data ?? []).forEach((i) => {
    buckets[i.bucket].count += 1;
    buckets[i.bucket].total += i.amount;
  });

  const overdue = (data ?? []).filter((i) => i.days_overdue > 0);

  const handleReminder = async (id: string) => {
    setLoadingId(id);
    try {
      const r = await buildReminder({ data: { invoice_id: id } });
      setReminder(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className={lang === "ar" ? "font-arabic" : ""}>
            {t("Aged receivables", "الذمم المدينة المتأخرة")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(buckets).map(([k, v]) => (
            <div key={k} className={`rounded-md p-3 text-center ${BUCKET_COLOR[k]}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                {t(BUCKET_LABEL[k][0], BUCKET_LABEL[k][1])}
              </div>
              <div className="text-lg font-semibold mt-1">{v.total.toFixed(3)}</div>
              <div className="text-[10px] opacity-70">
                {v.count} {t("inv.", "فاتورة")}
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("Loading…", "جارٍ التحميل…")}
          </p>
        ) : overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("No overdue invoices. Nice work.", "لا توجد فواتير متأخرة. عمل رائع.")}
          </p>
        ) : (
          <div className="divide-y">
            {overdue.map((inv) => (
              <div key={inv.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {inv.invoice_number}
                    <span className="text-muted-foreground ms-2">
                      {(lang === "ar" ? inv.client_name_ar : inv.client_name) ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="outline">{inv.days_overdue}d</Badge>
                    <span>
                      {inv.amount.toFixed(3)} {inv.currency}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingId === inv.id}
                  onClick={() => handleReminder(inv.id)}
                >
                  <Mail className="h-3.5 w-3.5 me-1" />
                  {t("Remind (AR)", "تذكير (AR)")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!reminder} onOpenChange={(o) => !o && setReminder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Arabic reminder", "تذكير بالعربية")}</DialogTitle>
          </DialogHeader>
          {reminder && (
            <div className="space-y-3" dir="rtl">
              <div>
                <label className="text-xs text-muted-foreground">الموضوع</label>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm font-arabic">
                  {reminder.subject}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">النص</label>
                <Textarea
                  value={reminder.body}
                  readOnly
                  rows={12}
                  className="font-arabic text-sm"
                />
              </div>
              {reminder.email ? (
                <div className="text-xs text-muted-foreground text-start" dir="ltr">
                  Client email: {reminder.email}
                </div>
              ) : (
                <div className="text-xs text-amber-600 text-start" dir="ltr">
                  No client email on file — copy the text and send manually.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!reminder) return;
                navigator.clipboard.writeText(`${reminder.subject}\n\n${reminder.body}`);
                toast.success(t("Copied", "تم النسخ"));
              }}
            >
              <Copy className="h-4 w-4 me-1" />
              {t("Copy", "نسخ")}
            </Button>
            {reminder?.email && (
              <Button
                onClick={() => {
                  const url = `mailto:${reminder.email}?subject=${encodeURIComponent(reminder.subject)}&body=${encodeURIComponent(reminder.body)}`;
                  window.open(url, "_blank");
                }}
              >
                <Send className="h-4 w-4 me-1" />
                {t("Open in mail", "فتح في البريد")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
