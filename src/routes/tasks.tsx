import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Qadiya OS" },
      { name: "description", content: "Workflow tasks, delegation, and escalation for your legal team." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Workflow", "سير العمل")}</div>
        <h1 className="font-display text-3xl">{tt("Tasks", "المهام")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tt("Delegate, track, and escalate work across the firm.", "فوّض المهام وتابعها وصعّدها على مستوى المكتب.")}
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={CheckSquare}
            title={tt("No tasks yet", "لا توجد مهام بعد")}
            desc={tt(
              "Connected to the live backend. Assigned tasks will appear here for your role.",
              "متصل بالخادم المباشر. ستظهر المهام المسندة هنا حسب دورك.",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
