import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Gavel, ChevronRight } from "lucide-react";
import { listCalendarEvents } from "@/lib/calendar.functions";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

/**
 * Compact "Today's Hearings" card. Renders only on mobile widths
 * and stays visible while scrolling the dashboard.
 */
export function TodayHearingsSticky() {
  const { t, lang } = useApp();
  const run = useServerFn(listCalendarEvents);
  const { data: events } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => run(),
  });

  const today = new Date().toISOString().slice(0, 10);
  const hearingsToday = (events ?? []).filter(
    (e) => e.type === "hearing" && e.date === today,
  );

  return (
    <div className="md:hidden sticky top-16 z-30 -mx-4 mb-4 px-4">
      <Link
        to="/calendar"
        className={cn(
          "block rounded-lg border shadow-sm px-3 py-2.5 transition-colors",
          hearingsToday.length > 0
            ? "bg-destructive/10 border-destructive/40 text-destructive"
            : "bg-card border-border text-muted-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className={cn("text-xs font-semibold", lang === "ar" && "font-arabic")}>
              {hearingsToday.length > 0
                ? t(
                    `${hearingsToday.length} hearing(s) today`,
                    `${hearingsToday.length} جلسة اليوم`,
                  )
                : t("No hearings today", "لا توجد جلسات اليوم")}
            </div>
            {hearingsToday.length > 0 && (
              <div className="text-[11px] truncate opacity-90">
                {hearingsToday
                  .slice(0, 2)
                  .map((h) => h.title)
                  .join(" · ")}
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </div>
      </Link>
    </div>
  );
}
