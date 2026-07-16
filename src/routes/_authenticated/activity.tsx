import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Team Activity — Qadiya OS" },
      { name: "description", content: "Firm-wide activity feed across cases, invoices, and tasks." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { t } = useApp();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("Team Activity", "نشاط الفريق")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Every privileged action in the firm, newest first.",
            "كل إجراء موثّق في المكتب، الأحدث أولاً.",
          )}
        </p>
      </div>
      <ActivityFeed limit={100} />
    </div>
  );
}
