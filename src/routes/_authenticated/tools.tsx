import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { ConflictChecker } from "@/components/ConflictChecker";
import { StatuteCalculator } from "@/components/StatuteCalculator";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/_authenticated/tools")({
  head: () => ({
    meta: [
      { title: "Legal Tools — Qadiya OS" },
      {
        name: "description",
        content: "Conflict of interest checker and statute of limitations calculator.",
      },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          {tt("Utilities", "أدوات")}
        </div>
        <h1 className="font-display text-3xl mt-1">
          {tt("Legal Tools", "الأدوات القانونية")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tt(
            "Conflict-of-interest checks and Kuwaiti statute-of-limitations calculator.",
            "فحص تعارض المصالح وحاسبة التقادم الكويتية.",
          )}
        </p>
      </div>
      <ConflictChecker />
      <StatuteCalculator />
    </div>
  );
}
