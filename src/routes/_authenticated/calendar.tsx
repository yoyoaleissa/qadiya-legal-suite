import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Clock,
  Loader2,
  ListChecks,
  CalendarRange,
  Download,
  ExternalLink,
  CheckCircle2,
  Check,
  Undo2,
  Calculator,
  ChevronDown,
  AlarmClock,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import {
  listCalendarEvents,
  updateHearingStatus,
  addHearing,
  listCasesLite,
  type CalendarEvent,
  type EventPriority,
} from "@/lib/calendar.functions";
import { updateTaskStatus } from "@/lib/tasks.functions";
import { listDeadlines } from "@/lib/deadlines.functions";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { exportMonthlyOverviewPdf } from "@/lib/calendar-export";
import { buildIcs, downloadIcs } from "@/lib/ics-export";
import { EmptyState } from "@/components/EmptyState";
import { StatuteCalculator } from "@/components/StatuteCalculator";

function priorityClasses(priority: EventPriority) {
  if (!priority) return null;
  if (priority === "high")
    return {
      border: "border-s-destructive",
      chip: "bg-destructive/10 text-destructive",
      dot: "bg-destructive",
    };
  if (priority === "medium")
    return {
      border: "border-s-gold",
      chip: "bg-gold/15 text-gold",
      dot: "bg-gold",
    };
  return {
    border: "border-s-success",
    chip: "bg-success/10 text-success",
    dot: "bg-success",
  };
}



export const Route = createFileRoute("/_authenticated/calendar")({
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Court Calendar — Qadiya OS" },
      {
        name: "description",
        content: "Hearings, deadlines, and limitation tracking for Kuwaiti court matters.",
      },
    ],
  }),
  component: CalendarPage,
});

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

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
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [showStatute, setShowStatute] = useState(false);
  const [exporting, setExporting] = useState(false);
  const runDeadlines = useServerFn(listDeadlines);
  const { data: deadlines = [], isLoading: loadingDeadlines } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => runDeadlines(),
  });

  useEffect(() => {
    if (date) {
      const [y, m] = date.split("-").map(Number);
      setView({ year: y, month: m - 1 });
      setSelected(date);
    }
  }, [date]);

  const runEvents = useServerFn(listCalendarEvents);
  const runHearingStatus = useServerFn(updateHearingStatus);
  const runTaskStatus = useServerFn(updateTaskStatus);
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => runEvents(),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ e, action }: { e: CalendarEvent; action: "done" | "undo" }) => {
      const [kind, id] = e.id.split(/-(.+)/);
      if (kind === "hearing") {
        return runHearingStatus({
          data: { id, status: action === "done" ? "completed" : "scheduled" },
        });
      }
      if (kind === "task") {
        return runTaskStatus({ data: { id, status: action === "done" ? "done" : "open" } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
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
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {tt("Scheduling", "الجدولة")}
          </div>
          <h1 className="font-display text-3xl">{tt("Court Calendar", "التقويم القضائي")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt(
              "Hearings, appeal windows, and limitation deadlines.",
              "الجلسات ومواعيد الاستئناف والتقادم.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddEventDialog defaultDate={selected} onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] })
          } />

          <Button
            variant={!showMonth && !showDeadlines ? "default" : "outline"}
            onClick={() => { setShowMonth(false); setShowDeadlines(false); }}
            className={cn(
              "gap-2",
              !showMonth && !showDeadlines &&
                "bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            {tt("Daily Agenda", "أجندة اليوم")}
          </Button>
          <Button
            variant={showMonth ? "default" : "outline"}
            onClick={() => { setShowMonth(true); setShowDeadlines(false); }}
            className={cn(
              "gap-2",
              showMonth &&
                "bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90",
            )}
          >
            <ListChecks className="h-4 w-4" />
            {tt("Monthly Overview", "ملخص الشهر")}
          </Button>
          <Button
            variant={showDeadlines ? "default" : "outline"}
            onClick={() => { setShowDeadlines(true); setShowMonth(false); }}
            className={cn(
              "gap-2",
              showDeadlines &&
                "bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90",
            )}
          >
            <AlarmClock className="h-4 w-4" />
            {tt("Deadlines", "المواعيد النهائية")}
            {deadlines.filter((d) => d.days_remaining <= 7 && d.days_remaining >= 0).length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                {deadlines.filter((d) => d.days_remaining <= 7 && d.days_remaining >= 0).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Statute of Limitations Calculator */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStatute((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4 text-gold" />
            {tt("Statute of Limitations Calculator", "حاسبة التقادم")}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", showStatute && "rotate-180")} />
        </button>
        {showStatute && (
          <div className="p-4 border-t border-border">
            <StatuteCalculator />
          </div>
        )}
      </div>


      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">
              {lang === "ar" ? MONTHS_AR[view.month] : MONTHS_EN[view.month]} {view.year}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftMonth(-1)}
                aria-label={tt("Previous month", "الشهر السابق")}
              >
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftMonth(1)}
                aria-label={tt("Next month", "الشهر التالي")}
              >
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
                  {dayEvents.length > 0 &&
                    (() => {
                      const allDone = dayEvents.every(
                        (e) => e.status === "completed" || e.status === "done",
                      );
                      if (allDone) {
                        return (
                          <span className="mt-auto flex items-center justify-center">
                            <span
                              className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-success/30"
                              title={tt("All completed", "تم الإنجاز")}
                            />
                          </span>
                        );
                      }
                      return (
                        <span className="flex flex-wrap justify-center gap-1 mt-auto">
                          {dayEvents.slice(0, 3).map((e, i) => {
                            const done = e.status === "completed" || e.status === "done";
                            const pc = priorityClasses(e.priority);
                            return (
                              <span
                                key={i}
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  done
                                    ? "bg-success"
                                    : pc
                                      ? pc.dot
                                      : e.type === "hearing"
                                        ? "bg-navy dark:bg-gold"
                                        : "bg-destructive",
                                )}
                              />
                            );
                          })}

                        </span>
                      );
                    })()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-navy dark:bg-gold" /> {tt("Hearing", "جلسة")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" />{" "}
              {tt("Deadline", "ميعاد نهائي")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> {tt("Completed", "تم الإنجاز")}
            </span>
          </div>
        </CardContent>
      </Card>

      {showDeadlines ? (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
            <h2 className="font-display text-xl">
              {tt("Appeal & Cassation Deadlines", "مواعيد الاستئناف والتمييز")}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                {tt("≤ 3 days", "≤ 3 أيام")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {tt("≤ 7 days", "≤ 7 أيام")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                {tt("> 7 days", "> 7 أيام")}
              </span>
            </div>
          </div>

          {loadingDeadlines ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tt("Loading…", "جارٍ التحميل…")}
              </CardContent>
            </Card>
          ) : deadlines.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={AlarmClock}
                  title={tt("No open deadlines", "لا توجد مواعيد نهائية")}
                  desc={tt(
                    "Appeal and cassation deadlines will appear here after judgments are recorded.",
                    "ستظهر مواعيد الاستئناف والتمييز هنا بعد تسجيل الأحكام.",
                  )}
                />
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-2">
              {deadlines.map((d) => {
                const urgency =
                  d.days_remaining < 0
                    ? "expired"
                    : d.days_remaining <= 3
                      ? "red"
                      : d.days_remaining <= 7
                        ? "yellow"
                        : "green";
                const border =
                  urgency === "red" || urgency === "expired"
                    ? "border-s-destructive"
                    : urgency === "yellow"
                      ? "border-s-yellow-500"
                      : "border-s-success";
                const chip =
                  urgency === "red" || urgency === "expired"
                    ? "bg-destructive/10 text-destructive"
                    : urgency === "yellow"
                      ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                      : "bg-success/10 text-success";
                const title = lang === "ar" ? d.title_ar ?? d.title : d.title;
                const caseTitle = lang === "ar" ? d.case_title_ar ?? d.case_title : d.case_title;
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border bg-card p-3 border-s-4",
                      border,
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            chip,
                          )}
                        >
                          <AlarmClock className="h-3 w-3" />
                          {urgency === "expired"
                            ? tt("Expired", "منتهي")
                            : `${d.days_remaining} ${tt("days", "يوم")}`}
                        </span>
                        {d.case_number && (
                          <span className="text-xs text-muted-foreground">#{d.case_number}</span>
                        )}
                        {d.kind !== "other" && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {d.kind === "appeal"
                              ? tt("Appeal", "استئناف")
                              : tt("Cassation", "تمييز")}
                          </span>
                        )}
                      </div>
                      <div className="font-medium mt-1">
                        <span className={lang === "ar" ? "font-arabic" : ""}>{title}</span>
                      </div>
                      {caseTitle && (
                        <div className="text-xs text-muted-foreground mt-0.5">{caseTitle}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {tt("Due:", "الاستحقاق:")} {d.due_date}
                      </div>
                      <a
                        href={buildGoogleCalendarUrl({
                          title: `⏰ ${title}${d.case_number ? ` #${d.case_number}` : ""}`,
                          date: d.due_date,
                          description: `${caseTitle ?? ""}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-gold transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {tt("📅 Add to Calendar", "📅 أضف للتقويم")}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : showMonth ? (
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isLoading || monthEvents.length === 0}
                onClick={() => {
                  const ics = buildIcs(
                    `Qadiya · ${monthName} ${view.year}`,
                    monthEvents.map((e) => ({
                      uid: `${e.type}-${e.id}`,
                      date: e.date,
                      title: (lang === "ar" ? e.title_ar : e.title) || (lang === "ar" ? e.title : e.title_ar) || "",
                      description: lang === "ar" ? e.sub_ar : e.sub,
                      location: e.case_number ?? null,
                    })),
                  );
                  downloadIcs(`qadiya-calendar-${monthName.replace(/\s+/g, "-")}-${view.year}.ics`, ics);
                }}
              >
                <CalendarDays className="h-4 w-4" />
                {tt("Export .ics", "تصدير .ics")}
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
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={CalendarRange}
                  title={tt("Nothing scheduled this month", "لا يوجد مواعيد هذا الشهر")}
                  desc={tt(
                    "Hearings and deadlines for this month will appear here as they are added.",
                    "ستظهر هنا الجلسات والمواعيد النهائية لهذا الشهر بمجرد إضافتها.",
                  )}
                />
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-2">
              {monthEvents.map((e) => {
                const day = Number(e.date.slice(8, 10));
                const pc = priorityClasses(e.priority);
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border bg-card p-3 border-s-4 transition-colors cursor-pointer hover:border-gold/50 hover:bg-accent/40",
                      pc
                        ? pc.border
                        : e.type === "hearing"
                          ? "border-s-navy dark:border-s-gold"
                          : "border-s-destructive",
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
                            pc
                              ? pc.chip
                              : e.type === "hearing"
                                ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                                : "bg-destructive/10 text-destructive",
                          )}
                        >

                          {e.type === "hearing" ? (
                            <Gavel className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {e.type === "hearing"
                            ? tt("Hearing", "جلسة")
                            : tt("Deadline", "ميعاد نهائي")}
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
                      <a
                        href={buildGoogleCalendarUrl({
                          title: `${e.type === "hearing" ? "⚖️" : "⏰"} ${lang === "ar" ? e.title_ar : e.title}${e.case_number ? ` #${e.case_number}` : ""}`,
                          date: e.date,
                          description: `${e.type === "hearing" ? "Court Hearing" : "Deadline"}${e.case_number ? ` — Case #${e.case_number}` : ""}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-gold transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {tt("📅 Add to Calendar", "📅 أضف للتقويم")}
                      </a>
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
            {tt("Agenda for", "جدول أعمال يوم")} <span className="text-gold">{selected}</span>
          </h2>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tt("Loading…", "جارٍ التحميل…")}
              </CardContent>
            </Card>
          ) : selectedEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={CalendarDays}
                  title={tt("Nothing scheduled", "لا يوجد مواعيد")}
                  desc={tt(
                    "Select a highlighted day to see its hearings and deadlines.",
                    "اختر يوماً مميزاً لعرض جلساته ومواعيده.",
                  )}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEvents.map((e) => {
                const isDone = e.status === "completed" || e.status === "done";
                const pc = priorityClasses(e.priority);
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "rounded-lg border bg-card p-4 border-s-4",
                      isDone
                        ? "border-s-success opacity-70"
                        : pc
                          ? pc.border
                          : e.type === "hearing"
                            ? "border-s-navy dark:border-s-gold"
                            : "border-s-destructive",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isDone
                            ? "bg-success/15 text-success"
                            : pc
                              ? pc.chip
                              : e.type === "hearing"
                                ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                                : "bg-destructive/10 text-destructive",
                        )}
                      >

                        {isDone ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : e.type === "hearing" ? (
                          <Gavel className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {isDone
                          ? tt("Completed", "تم الإنجاز")
                          : e.type === "hearing"
                            ? tt("Hearing", "جلسة")
                            : tt("Deadline", "ميعاد نهائي")}
                      </span>
                      {e.case_number && (
                        <span className="text-xs text-muted-foreground">#{e.case_number}</span>
                      )}
                    </div>
                    <div className={cn("font-medium", isDone && "line-through")}>
                      <span className={lang === "ar" ? "font-arabic" : ""}>
                        {lang === "ar" ? e.title_ar : e.title}
                      </span>
                    </div>
                    {(lang === "ar" ? e.sub_ar : e.sub) && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {lang === "ar" ? e.sub_ar : e.sub}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <a
                        href={buildGoogleCalendarUrl({
                          title: `${e.type === "hearing" ? "⚖️" : "⏰"} ${lang === "ar" ? e.title_ar : e.title}${e.case_number ? ` #${e.case_number}` : ""}`,
                          date: e.date,
                          description: `${e.type === "hearing" ? "Court Hearing" : "Deadline"}${e.case_number ? ` — Case #${e.case_number}` : ""}\n${(lang === "ar" ? e.sub_ar : e.sub) ?? ""}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {tt("📅 Add to Calendar", "📅 أضف للتقويم")}
                      </a>
                      {!isDone ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-success/50 text-success hover:bg-success/10"
                          disabled={toggleStatus.isPending}
                          onClick={() => toggleStatus.mutate({ e, action: "done" })}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {tt("Mark done", "تم الإنجاز")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={toggleStatus.isPending}
                          onClick={() => toggleStatus.mutate({ e, action: "undo" })}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {tt("Undo", "تراجع")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddEventDialog({
  defaultDate,
  onCreated,
}: {
  defaultDate: string;
  onCreated: () => void;
}) {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [caseId, setCaseId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setDate(defaultDate);
  }, [open, defaultDate]);

  const runListCases = useServerFn(listCasesLite);
  const { data: cases = [] } = useQuery({
    queryKey: ["cases-lite"],
    queryFn: () => runListCases(),
    enabled: open,
  });

  const runAdd = useServerFn(addHearing);
  const create = useMutation({
    mutationFn: () =>
      runAdd({
        data: {
          title,
          title_ar: titleAr || undefined,
          session_date: date,
          priority,
          notes: notes || undefined,
          case_id: caseId,
        },
      }),
    onSuccess: () => {
      toast.success(tt("Event added", "تمت إضافة الموعد"));
      setOpen(false);
      setTitle("");
      setTitleAr("");
      setNotes("");
      setCaseId("");
      setPriority("medium");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = title.trim() && date && caseId && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90">
          <Plus className="h-4 w-4" />
          {tt("Add Event", "إضافة موعد")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tt("New calendar event", "موعد جديد")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{tt("Title (English)", "العنوان (إنجليزي)")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hearing / Meeting…" />
          </div>
          <div className="grid gap-1.5">
            <Label>{tt("Title (Arabic)", "العنوان (عربي)")}</Label>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" placeholder="جلسة / اجتماع…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{tt("Date", "التاريخ")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{tt("Priority", "الأولوية")}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "medium" | "low")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 {tt("High", "عالية")}</SelectItem>
                  <SelectItem value="medium">🟡 {tt("Medium", "متوسطة")}</SelectItem>
                  <SelectItem value="low">🟢 {tt("Low", "منخفضة")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{tt("Case", "القضية")}</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger>
                <SelectValue placeholder={tt("Select a case…", "اختر قضية…")} />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number ? `#${c.case_number} — ` : ""}
                    {(lang === "ar" ? c.title_ar : c.title) || c.title || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{tt("Notes", "ملاحظات")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tt("Cancel", "إلغاء")}
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("Create", "إنشاء")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

