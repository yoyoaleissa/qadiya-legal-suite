import { AlertTriangle, CalendarClock } from "lucide-react";
import type { DeadlineInfo } from "@/lib/report-types";
import { useApp } from "@/lib/app-context";
import { formatDate } from "./format";
import { cn } from "@/lib/utils";

export function DeadlineCard({ deadline }: { deadline: DeadlineInfo | null }) {
  const { lang, t } = useApp();

  if (!deadline) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("no_deadline")}</p>
      </div>
    );
  }

  const urgent = deadline.days_remaining <= 7;
  const overdue = deadline.days_remaining < 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        urgent
          ? "border-destructive/40 bg-destructive/10"
          : "border-accent/40 bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {urgent ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <CalendarClock className="h-5 w-5 text-accent-foreground" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {lang === "ar" ? deadline.label_ar : deadline.label_en}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(deadline.date, lang)}</p>
          </div>
        </div>
        <div className="text-end">
          <p
            className={cn(
              "font-display text-3xl font-bold leading-none",
              urgent ? "text-destructive" : "text-accent-foreground",
            )}
          >
            {Math.abs(deadline.days_remaining)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {overdue ? (lang === "ar" ? "يوماً متأخراً" : "days overdue") : t("days_remaining")}
          </p>
        </div>
      </div>
    </div>
  );
}
