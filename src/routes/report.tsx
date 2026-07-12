import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
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
  const { lang, t } = useApp();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 no-print">
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("report_bot")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {lang === "ar"
              ? "أدخل رقم القضية للحصول على تقرير مبسّط بحالتها. (نسخة تجريبية للبوت — ستنتقل لاحقاً إلى تيليجرام.)"
              : "Enter a case number to get a plain-language status report. (Web preview of the bot — will move to Telegram later.)"}
          </p>
        </div>
        <ReportBot />
      </main>
    </div>
  );
}
