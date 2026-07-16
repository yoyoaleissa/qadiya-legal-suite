import type { CourtLevelKey, TimelineRow } from "@/lib/report-types";
import { COURT_LEVEL_LABELS, useApp } from "@/lib/app-context";
import { formatDate } from "./format";
import { cn } from "@/lib/utils";

export function CaseTimeline({
  timeline,
  currentStage,
}: {
  timeline: TimelineRow[];
  currentStage: CourtLevelKey | null;
}) {
  const { lang } = useApp();
  const items = timeline.slice().reverse(); // most recent first

  return (
    <ol className="relative space-y-6 ps-6">
      <span className="absolute inset-y-1 start-[7px] w-px bg-border" aria-hidden />
      {items.map((ev, i) => {
        const isCurrent = i === 0;
        const highlight =
          isCurrent || (currentStage && ev.level === currentStage && ev.event_type === "judgment");
        return (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -start-6 top-1 h-3.5 w-3.5 rounded-full border-2",
                highlight ? "border-accent bg-accent shadow-gold" : "border-border bg-background",
              )}
              aria-hidden
            />
            <div
              className={cn(
                "rounded-lg border p-3 transition-colors",
                highlight ? "border-accent/40 bg-accent/5" : "border-transparent",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatDate(ev.event_date, lang)}
                </span>
                {ev.level && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {COURT_LEVEL_LABELS[ev.level]?.[lang] ?? ev.level}
                  </span>
                )}
                {isCurrent && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    {lang === "ar" ? "المرحلة الحالية" : "Current"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {(lang === "ar" ? ev.title_ar : ev.title) || ev.title}
              </p>
              {(lang === "ar" ? ev.description_ar : ev.description) && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {lang === "ar" ? ev.description_ar : ev.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
