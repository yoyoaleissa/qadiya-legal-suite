import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Court Calendar — Qadiya OS" },
      { name: "description", content: "Hearings, deadlines, and limitation tracking for Kuwaiti court matters." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Scheduling", "الجدولة")}</div>
        <h1 className="font-display text-3xl">{tt("Court Calendar", "التقويم القضائي")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tt("Hearings, appeal windows, and limitation deadlines.", "الجلسات ومواعيد الاستئناف والتقادم.")}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={CalendarDays}
            title={tt("No hearings scheduled", "لا توجد جلسات مجدولة")}
            desc={tt(
              "Connected to the live backend. Hearings and deadlines will populate the calendar automatically as cases are added.",
              "متصل بالخادم المباشر. ستظهر الجلسات والمواعيد في التقويم تلقائياً بمجرد إضافة القضايا.",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
