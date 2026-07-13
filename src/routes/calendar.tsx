import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Gavel, Clock, Loader2, ListChecks, CalendarRange, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { listCalendarEvents, type CalendarEvent } from "@/lib/calendar.functions";
import { exportMonthlyOverviewPdf } from "@/lib/calendar-export";

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Court Calendar — Qadiya OS" },
      { name: "description", content: "Hearings, deadlines, and limitation tracking for Kuwaiti court matters." },
    ],
  }),
  component: CalendarPage,
});

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const WEEK_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WEEK_AR = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function CalendarPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { date } = Route.useSearch();

  const today = new Date();
  const todayStr = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const initial = date ?? todayStr;
  const [iy, im] = initial.split("-").map(Number);
  const [view, setView] = useState({ year: iy, month: im - 1 });
  const [selected, setSelected] = useState(initial);
  const [showMonth, setShowMonth] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (date) {
      const [y, m] = date.split("-").map(Number);
      setView({ year: y, month: m - 1 });
      setSelected(date);
    }
  }, [date]);

  const runEvents = useServerFn(listCalendarEvents);
  const { data: events, isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => runEvents(),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events ?? []) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = byDate.get(selected) ?? [];
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
  const monthEvents = useMemo(
    () =>
      (events ?? [])
        .filter((e) => e.date.startsWith(monthPrefix))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, monthPrefix],
  );
  const monthHearings = monthEvents.filter((e) => e.type === "hearing").length;
  const monthDeadlines = monthEvents.filter((e) => e.type === "deadline").length;
  const monthName = lang === "ar" ? MONTHS_AR[view.month] : MONTHS_EN[view.month];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  const weekdays = lang === "ar" ? WEEK_AR : WEEK_EN;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Scheduling", "الجدولة")}</div>
          <h1 className="font-display text-3xl">{tt("Court Calendar", "التقويم القضائي")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt("Hearings, appeal windows, and limitation deadlines.", "الجلسات ومواعيد الاستئناف والتقادم.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMonth ? "outline" : "default"}
            onClick={() => setShowMonth(false)}
            className={cn(
              "gap-2",
              !showMonth && "bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            {tt("Daily Agenda", "أجندة اليوم")}
          </Button>
          <Button
            variant={showMonth ? "default" : "outline"}
            onClick={() => setShowMonth(true)}
            className={cn(
              "gap-2",
              showMonth && "bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90",
            )}
          >
            <ListChecks className="h-4 w-4" />
            {tt("Monthly Overview", "ملخص الشهر")}
          </Button>
        </div>
      </div>



      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">
              {lang === "ar" ? MONTHS_AR[view.month] : MONTHS_EN[view.month]} {view.year}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setView({ year: today.getFullYear(), month: today.getMonth() });
                  setSelected(todayIso);
                }}
              >
                {tt("Today", "اليوم")}
              </Button>
              <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekdays.map((w) => (
              <div key={w} className="text-center text-xs font-medium text-muted-foreground py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
              const dateStr = iso(view.year, view.month, day);
              const dayEvents = byDate.get(dateStr) ?? [];
              const isSelected = dateStr === selected;
              const isToday = dateStr === todayIso;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelected(dateStr)}
                  className={cn(
                    "aspect-square rounded-md border p-1.5 flex flex-col items-center justify-start gap-1 transition-colors relative",
                    isSelected
                      ? "border-gold bg-gold/10"
                      : "border-border hover:border-gold/50 hover:bg-accent/40",
                    isToday && !isSelected && "border-navy/40 dark:border-gold/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm",
                      isSelected && "font-semibold text-gold",
                      isToday && !isSelected && "font-semibold",
                    )}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="flex flex-wrap justify-center gap-0.5 mt-auto">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            e.type === "hearing" ? "bg-navy dark:bg-gold" : "bg-destructive",
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-navy dark:bg-gold" /> {tt("Hearing", "جلسة")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" /> {tt("Deadline", "ميعاد نهائي")}
            </span>
          </div>
        </CardContent>
      </Card>

      {showMonth ? (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
            <h2 className="font-display text-xl">
              {tt("All appointments —", "كل المواعيد —")}{" "}
              <span className="text-gold">
                {monthName} {view.year}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">
                {tt(
                  `${monthHearings} hearings · ${monthDeadlines} deadlines`,
                  `${monthHearings} جلسة · ${monthDeadlines} ميعاد نهائي`,
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={exporting || isLoading}
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportMonthlyOverviewPdf({
                      monthName,
                      year: view.year,
                      lang,
                      hearings: monthHearings,
                      deadlines: monthDeadlines,
                      events: monthEvents.map((e) => ({
                        date: e.date,
                        type: e.type,
                        title: lang === "ar" ? e.title_ar : e.title,
                        sub: lang === "ar" ? e.sub_ar : e.sub,
                        case_number: e.case_number,
                      })),
                    });
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {tt("Export PDF", "تصدير PDF")}
              </Button>
            </div>
          </div>


          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tt("Loading…", "جارٍ التحميل…")}
              </CardContent>
            </Card>
          ) : monthEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <CalendarRange className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">{tt("Nothing scheduled this month", "لا يوجد مواعيد هذا الشهر")}</div>
            </div>
          ) : (
            <ol className="space-y-2">
              {monthEvents.map((e) => {
                const day = Number(e.date.slice(8, 10));
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border bg-card p-3 border-s-4 transition-colors cursor-pointer hover:border-gold/50 hover:bg-accent/40",
                      e.type === "hearing" ? "border-s-navy dark:border-s-gold" : "border-s-destructive",
                    )}
                    onClick={() => {
                      setSelected(e.date);
                      setShowMonth(false);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center w-11 shrink-0">
                      <span className="font-display text-lg leading-none">{day}</span>
                      <span className="text-[10px] uppercase text-muted-foreground mt-0.5">
                        {(lang === "ar" ? WEEK_AR : WEEK_EN)[new Date(e.date).getDay()]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            e.type === "hearing"
                              ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {e.type === "hearing" ? <Gavel className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {e.type === "hearing" ? tt("Hearing", "جلسة") : tt("Deadline", "ميعاد نهائي")}
                        </span>
                        {e.case_number && (
                          <span className="text-xs text-muted-foreground">#{e.case_number}</span>
                        )}
                      </div>
                      <div className="font-medium mt-1">
                        <span className={lang === "ar" ? "font-arabic" : ""}>
                          {lang === "ar" ? e.title_ar : e.title}
                        </span>
                      </div>
                      {(lang === "ar" ? e.sub_ar : e.sub) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lang === "ar" ? e.sub_ar : e.sub}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : (
        <div>
          <h2 className="font-display text-xl mb-3">
            {tt("Agenda for", "جدول أعمال يوم")}{" "}
            <span className="text-gold">{selected}</span>
          </h2>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tt("Loading…", "جارٍ التحميل…")}
              </CardContent>
            </Card>
          ) : selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">{tt("Nothing scheduled", "لا يوجد مواعيد")}</div>
              <div className="text-xs text-muted-foreground">
                {tt("Select a highlighted day to see its hearings and deadlines.", "اختر يوماً مميزاً لعرض جلساته ومواعيده.")}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-lg border bg-card p-4 border-s-4",
                    e.type === "hearing" ? "border-s-navy dark:border-s-gold" : "border-s-destructive",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        e.type === "hearing"
                          ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {e.type === "hearing" ? <Gavel className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {e.type === "hearing" ? tt("Hearing", "جلسة") : tt("Deadline", "ميعاد نهائي")}
                    </span>
                    {e.case_number && (
                      <span className="text-xs text-muted-foreground">#{e.case_number}</span>
                    )}
                  </div>
                  <div className="font-medium">
                    <span className={lang === "ar" ? "font-arabic" : ""}>
                      {lang === "ar" ? e.title_ar : e.title}
                    </span>
                  </div>
                  {(lang === "ar" ? e.sub_ar : e.sub) && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {lang === "ar" ? e.sub_ar : e.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
