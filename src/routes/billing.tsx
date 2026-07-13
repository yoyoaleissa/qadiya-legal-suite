import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Qadiya OS" },
      { name: "description", content: "Time tracking, invoicing, and expense logging for Kuwaiti law firms." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Finance", "المالية")}</div>
        <h1 className="font-display text-3xl">{tt("Billing", "الفوترة")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tt("Time tracking, invoices, and outstanding balances.", "تتبّع الوقت والفواتير والأرصدة المستحقة.")}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Receipt}
            title={tt("No invoices yet", "لا توجد فواتير بعد")}
            desc={tt(
              "Connected to the live backend. Invoices and time entries will appear here once billing begins.",
              "متصل بالخادم المباشر. ستظهر الفواتير وسجلات الوقت هنا بمجرد بدء الفوترة.",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
