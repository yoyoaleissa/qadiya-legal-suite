import { createFileRoute } from "@tanstack/react-router";
import { ReportBot } from "@/components/report/ReportBot";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report Bot — Qadiya OS" },
      {
        name: "description",
        content:
          "Enter a Kuwaiti case number and receive an instant, plain-language status report in Arabic and English, with deadlines and a full case timeline.",
      },
      { property: "og:title", content: "Report Bot — Qadiya OS" },
      {
        property: "og:description",
        content: "Instant bilingual case status reports for Kuwaiti law firm clients.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <div className="space-y-6">
      <div className="no-print">
        <div className="text-xs uppercase tracking-widest text-gold">
          {tt("Priority Feature", "الميزة الأساسية")}
        </div>
        <h1 className="font-display text-3xl md:text-4xl mt-1">
          {tt("Report Bot", "بوت التقارير")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {tt(
            "Clients send a case number and receive a polished bilingual status report in seconds — with the timeline, deadlines, and a branded PDF. Connected to the live backend.",
            "يرسل العميل رقم القضية ليتلقى تقريراً ثنائي اللغة خلال ثوانٍ — مع الجدول الزمني والمواعيد وتقرير PDF بهوية المكتب. متصل بالخادم المباشر.",
          )}
        </p>
      </div>
      <ReportBot />
    </div>
  );
}
