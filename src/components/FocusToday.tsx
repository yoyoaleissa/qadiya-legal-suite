import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarClock, Gavel, Receipt, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { listNotifications, type NotificationItem } from "@/lib/notifications.functions";

const ICONS: Record<string, typeof AlertTriangle> = {
  task_overdue: AlertTriangle,
  task_due_today: CalendarClock,
  hearing_today: Gavel,
  hearing_tomorrow: Gavel,
  invoice_overdue: Receipt,
  appeal_window: AlertTriangle,
};

function tone(sev: NotificationItem["severity"]) {
  if (sev === "danger") return "border-destructive/40 bg-destructive/5 text-destructive";
  if (sev === "warn") return "border-gold/40 bg-gold/5 text-gold";
  return "border-primary/30 bg-primary/5 text-primary";
}

export function FocusToday() {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const run = useServerFn(listNotifications);
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => run(),
    refetchInterval: 60_000,
  });

  const items = (data ?? []).slice(0, 5);
  const danger = (data ?? []).filter((i) => i.severity === "danger").length;

  return (
    <Card className="border-gold/30">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gold/15 text-gold flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("Focus today", "أولويات اليوم")}
              </div>
              <h2 className="font-display text-xl">
                {danger > 0
                  ? t(`${danger} urgent item${danger === 1 ? "" : "s"}`, `${danger} بند عاجل`)
                  : t("You're on track", "أنت في المسار الصحيح")}
              </h2>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "No overdue tasks, hearings, or overdue invoices right now.",
              "لا توجد مهام متأخرة أو جلسات أو فواتير متأخرة الآن.",
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = ICONS[n.kind] ?? AlertTriangle;
              const title = lang === "ar" ? n.title_ar : n.title_en;
              const sub = lang === "ar" ? n.subtitle_ar : n.subtitle_en;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => navigate({ to: n.href })}
                  className={cn(
                    "w-full text-start flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent/40",
                    tone(n.severity),
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium truncate text-foreground", lang === "ar" && "font-arabic")}>
                      {title}
                    </div>
                    {sub && (
                      <div className="text-xs text-muted-foreground truncate">{sub}</div>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-60 rtl:rotate-180" />
                </button>
              );
            })}
            {(data ?? []).length > items.length && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1"
                onClick={() => navigate({ to: "/tasks" })}
              >
                {t(`View all ${(data ?? []).length}`, `عرض الكل ${(data ?? []).length}`)}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
