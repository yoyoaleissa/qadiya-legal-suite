import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients & Cases — Qadiya OS" },
      { name: "description", content: "Client profiles, matters, and case lifecycle for your Kuwaiti law firm." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [q, setQ] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("CRM", "إدارة العملاء")}</div>
          <h1 className="font-display text-3xl">{tt("Clients & Cases", "العملاء والقضايا")}</h1>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt("Search clients…", "بحث…")} className="ps-9" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Users}
            title={tt("No clients yet", "لا يوجد عملاء بعد")}
            desc={tt(
              "Connected to the live backend. Client and case records will appear here as your firm adds them.",
              "متصل بالخادم المباشر. ستظهر سجلات العملاء والقضايا هنا بمجرد إضافتها من قِبل مكتبك.",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
