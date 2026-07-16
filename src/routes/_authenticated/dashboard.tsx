import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  Gavel,
  Loader2,
  Scale,
  TrendingUp,
  Users,
  UserPlus,
  FolderPlus,
  ClipboardPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";
import { listClients } from "@/lib/clients.functions";
import { listTasks } from "@/lib/tasks.functions";
import { listCalendarEvents } from "@/lib/calendar.functions";
import { getDailyBriefing, type DailyBriefing } from "@/lib/briefing.functions";
import { listInvoices } from "@/lib/billing.functions";
import { createCase } from "@/lib/cases.functions";
import { FocusToday } from "@/components/FocusToday";
import { PartnerKPIs } from "@/components/PartnerKPIs";
import { TimeTracker } from "@/components/TimeTracker";
import { CaseFreshness } from "@/components/CaseFreshness";
import { ActivityFeed } from "@/components/ActivityFeed";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function roleLabel(role: string, lang: "en" | "ar") {
  const map = {
    partner: { en: "Partner", ar: "شريك" },
    associate: { en: "Associate", ar: "محامٍ" },
    paralegal: { en: "Paralegal", ar: "مساعد قانوني" },
  } as const;
  return map[role as keyof typeof map]?.[lang] ?? role;
}

function getGreeting(lang: "en" | "ar") {
  const hour = new Date().getHours();
  if (hour < 12) return lang === "ar" ? "صباح الخير" : "Good morning";
  if (hour < 17) return lang === "ar" ? "مساء الخير" : "Good afternoon";
  return lang === "ar" ? "مساء الخير" : "Good evening";
}

function Dashboard() {
  const { t, lang, role } = useApp();
  const { isAdmin } = useIsAdmin();
  const [showNewCase, setShowNewCase] = useState(false);

  const runClients = useServerFn(listClients);
  const runTasks = useServerFn(listTasks);
  const runEvents = useServerFn(listCalendarEvents);
  const runBriefing = useServerFn(getDailyBriefing);
  const runInvoices = useServerFn(listInvoices);

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => runClients() });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => runTasks() });
  const { data: events } = useQuery({ queryKey: ["calendar-events"], queryFn: () => runEvents() });
  const { data: briefing } = useQuery({
    queryKey: ["daily-briefing"],
    queryFn: () => runBriefing(),
  });
  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => runInvoices(),
    enabled: isAdmin,
  });

  const outstanding = (invoices ?? [])
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);

  const activeClients = clients?.length ?? null;
  const openMatters = clients ? clients.reduce((sum, c) => sum + c.case_count, 0) : null;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const hearingsThisWeek = events
    ? events.filter((e) => e.type === "hearing" && e.date >= todayStr && e.date <= weekEndStr)
        .length
    : null;

  const overdueTasks = (tasks ?? []).filter(
    (t) => t.status !== "done" && t.due_date && t.due_date < todayStr,
  ).length;

  const upcoming = (events ?? [])
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const openTasks = (tasks ?? []).filter((t) => t.status !== "done").slice(0, 5);

  // Urgent deadlines (within 3 days)
  const threeDaysOut = new Date(today);
  threeDaysOut.setDate(threeDaysOut.getDate() + 3);
  const threeDaysStr = threeDaysOut.toISOString().slice(0, 10);
  const urgentDeadlines = (events ?? []).filter(
    (e) => e.type === "deadline" && e.date >= todayStr && e.date <= threeDaysStr,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("Overview", "نظرة عامة")}
          </div>
          <h1 className="font-display text-4xl mt-1">
            {t("Firm Dashboard", "لوحة تحكم المكتب")}
          </h1>
          <p className="text-base text-foreground/80 mt-1">
            {getGreeting(lang)},{" "}
            <span className="text-gold">{t(roleLabel(role, "en"), roleLabel(role, "ar"))}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Here's what needs your attention today.", "إليك أهم ما يحتاج انتباهك اليوم.")}
          </p>
        </div>
        <Link
          to="/reports"
          className="rounded-lg bg-navy text-white dark:bg-gold dark:text-navy px-5 py-3 flex items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <Scale className="h-5 w-5" />
          <div>
            <div className="text-xs opacity-80 uppercase tracking-wider">
              {t("Case Intelligence", "استعلام القضايا")}
            </div>
            <div className="font-medium">{t("Case Reports", "تقارير القضايا")}</div>
          </div>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      {/* Focus Today — highest-priority actionable items */}
      <FocusToday />

      {/* Partner KPIs — admin-only, hidden for other roles */}
      <PartnerKPIs />

      {/* Time tracker + MOJ freshness side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <TimeTracker />
        <CaseFreshness />
      </div>

      {/* Team activity feed */}
      <ActivityFeed limit={12} />




      {/* Daily Briefing */}
      <DailyBriefingCard
        briefing={briefing}
        outstanding={isAdmin ? outstanding : null}
        t={t}
        lang={lang}
        todayStr={todayStr}
      />

      {/* Urgent Alert Banner */}
      {(urgentDeadlines.length > 0 || overdueTasks > 0) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 text-sm">
            {urgentDeadlines.length > 0 && (
              <span className="font-medium text-destructive">
                {t(
                  `${urgentDeadlines.length} deadline(s) within 3 days`,
                  `${urgentDeadlines.length} موعد/مواعيد خلال 3 أيام`,
                )}
              </span>
            )}
            {urgentDeadlines.length > 0 && overdueTasks > 0 && " · "}
            {overdueTasks > 0 && (
              <span className="font-medium text-destructive">
                {t(`${overdueTasks} overdue task(s)`, `${overdueTasks} مهمة متأخرة`)}
              </span>
            )}
          </div>
          <Link to="/calendar" className="text-xs text-destructive hover:underline font-medium">
            {t("View →", "عرض ←")}
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/clients">
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            {t("New Client", "موكّل جديد")}
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowNewCase(true)}>
          <FolderPlus className="h-3.5 w-3.5" />
          {t("New Case", "قضية جديدة")}
        </Button>
        <Link to="/tasks">
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardPlus className="h-3.5 w-3.5" />
            {t("Quick Task", "مهمة سريعة")}
          </Button>
        </Link>
        <Link to="/documents">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-3.5 w-3.5" />
            {t("New Document", "مستند جديد")}
          </Button>
        </Link>
      </div>

      {/* Quick-action tiles */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <a
          href="/portal"
          className="group rounded-xl border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-gold/50 hover:bg-accent/40 transition-colors"
        >
          <span className="text-2xl">📋</span>
          <span className="text-sm font-medium">{t("Case Lookup", "بحث قضية")}</span>
        </a>
        <Link
          to="/calendar"
          className="group rounded-xl border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-gold/50 hover:bg-accent/40 transition-colors"
        >
          <span className="text-2xl">📅</span>
          <span className="text-sm font-medium">{t("Calendar", "التقويم")}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            const summary =
              lang === "ar"
                ? `📋 موجز اليوم — Qadiya\nجلسات اليوم: ${briefing?.hearingsToday ?? 0}\nمهام متأخرة: ${briefing?.tasksOverdue ?? 0}\nمستحقة اليوم: ${briefing?.tasksDueToday ?? 0}\n\n— Qadiya AI`
                : `📋 Today's brief — Qadiya\nHearings today: ${briefing?.hearingsToday ?? 0}\nOverdue tasks: ${briefing?.tasksOverdue ?? 0}\nDue today: ${briefing?.tasksDueToday ?? 0}\n\n— Qadiya AI`;
            window.open(
              `https://wa.me/?text=${encodeURIComponent(summary)}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
          className="group rounded-xl border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-gold/50 hover:bg-accent/40 transition-colors"
        >
          <span className="text-2xl">📤</span>
          <span className="text-sm font-medium">{t("WhatsApp", "واتساب")}</span>
        </button>
        <Link
          to="/ai-assistant"
          className="group rounded-xl border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-gold/50 hover:bg-accent/40 transition-colors"
        >
          <span className="text-2xl">🤖</span>
          <span className="text-sm font-medium">{t("AI Assistant", "المساعد")}</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatLink
          to="/clients"
          icon={Users}
          label={t("Active clients", "الموكّلون النشطون")}
          value={activeClients}
          sub={t("View directory", "عرض السجل")}
        />
        <StatLink
          to="/clients"
          icon={FileText}
          label={t("Open matters", "قضايا مفتوحة")}
          value={openMatters}
          sub={t("across firm", "على مستوى المكتب")}
        />
        <StatLink
          to="/calendar"
          icon={Calendar}
          label={t("Hearings this week", "جلسات هذا الأسبوع")}
          value={hearingsThisWeek}
          sub={t("Court calendar", "التقويم القضائي")}
          accent
        />
        {isAdmin ? (
          <StatLink
            to="/billing"
            icon={DollarSign}
            label={t("Outstanding", "مستحقة")}
            value={`${outstanding.toFixed(3)}`}
            sub={t("KWD receivable", "د.ك مستحقة")}
          />
        ) : (
          <StatLink
            to="/tasks"
            icon={CheckSquare}
            label={t("Open tasks", "مهام مفتوحة")}
            value={openTasks.length || null}
            sub={t("Your queue", "قائمتك")}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Hearings & Deadlines */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("Upcoming", "قادم")}
                </div>
                <h2 className="font-display text-xl">
                  {t("Hearings & deadlines", "الجلسات والمواعيد")}
                </h2>
              </div>
              <Link to="/calendar" className="text-xs text-gold hover:underline">
                {t("View calendar →", "عرض التقويم ←")}
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyRow
                icon={Calendar}
                title={t("No upcoming events", "لا توجد أحداث قادمة")}
                desc={t(
                  "Hearings and deadlines will appear here once cases are synced from MOJ.",
                  "ستظهر الجلسات والمواعيد هنا بمجرد مزامنة القضايا من وزارة العدل.",
                )}
              />
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => {
                  const daysUntil = Math.ceil(
                    (new Date(e.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <Link
                      key={e.id}
                      to="/calendar"
                      search={{ date: e.date }}
                      className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-gold/50 hover:bg-accent/40"
                    >
                      <div
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-md flex items-center justify-center",
                          e.type === "hearing"
                            ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {e.type === "hearing" ? (
                          <Gavel className="h-4 w-4" />
                        ) : (
                          <CalendarClock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate group-hover:text-gold transition-colors">
                          <span className={lang === "ar" ? "font-arabic" : ""}>
                            {lang === "ar" ? e.title_ar : e.title}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {e.date}
                          {e.case_number ? ` · #${e.case_number}` : ""}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          daysUntil <= 3 && "border-destructive/50 text-destructive",
                        )}
                      >
                        {daysUntil === 0
                          ? t("Today", "اليوم")
                          : daysUntil === 1
                            ? t("Tomorrow", "غداً")
                            : t(`${daysUntil} days`, `${daysUntil} يوم`)}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Queue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("Your queue", "قائمتك")}
                </div>
                <h2 className="font-display text-xl">{t("Tasks", "المهام")}</h2>
              </div>
              <Link to="/tasks" className="text-xs text-gold hover:underline">
                {t("View all →", "عرض الكل ←")}
              </Link>
            </div>
            {openTasks.length === 0 ? (
              <EmptyRow
                icon={CheckSquare}
                title={t("Your queue is clear", "قائمتك فارغة")}
                desc={t("New tasks will show up here.", "ستظهر المهام الجديدة هنا.")}
              />
            ) : (
              <div className="space-y-2">
                {openTasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/tasks"
                    search={{ taskId: task.id }}
                    className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-gold/50 hover:bg-accent/40"
                  >
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate group-hover:text-gold transition-colors">
                        <span className={lang === "ar" ? "font-arabic" : ""}>
                          {lang === "ar" ? (task.title_ar ?? task.title) : task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.due_date && (
                          <span
                            className={cn(
                              "text-xs",
                              task.due_date < todayStr
                                ? "text-destructive font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {task.due_date < todayStr ? "⚠ " : ""}
                            {task.due_date}
                          </span>
                        )}
                        {task.priority === "high" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-destructive/50 text-destructive"
                          >
                            {t("High", "عالية")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewCaseDialog
        open={showNewCase}
        onClose={() => setShowNewCase(false)}
        clients={clients ?? []}
        t={t}
        lang={lang}
      />
    </div>
  );
}

function DailyBriefingCard({
  briefing,
  outstanding,
  t,
  lang,
  todayStr,
}: {
  briefing: DailyBriefing | undefined;
  outstanding: number | null;
  t: (en: string, ar: string) => string;
  lang: "en" | "ar";
  todayStr: string;
}) {
  const navigate = useNavigate();
  const tomorrow = new Date(todayStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  type Badge = {
    icon: typeof Scale;
    en: string;
    ar: string;
    tone: "navy" | "warn" | "danger" | "gold" | "good";
    onClick: () => void;
  };
  const badges: Badge[] = briefing
    ? [
        {
          icon: Scale,
          en: `${briefing.hearingsToday} Hearings Today`,
          ar: `${briefing.hearingsToday} جلسات اليوم`,
          tone: "navy",
          onClick: () => navigate({ to: "/calendar", search: { date: todayStr } }),
        },
        {
          icon: Calendar,
          en: `${briefing.hearingsTomorrow} Tomorrow`,
          ar: `${briefing.hearingsTomorrow} غداً`,
          tone: "navy",
          onClick: () => navigate({ to: "/calendar", search: { date: tomorrowStr } }),
        },
        {
          icon: AlertTriangle,
          en: `${briefing.tasksOverdue} Overdue Tasks`,
          ar: `${briefing.tasksOverdue} مهام متأخرة`,
          tone: briefing.tasksOverdue > 0 ? "danger" : "good",
          onClick: () => navigate({ to: "/tasks", search: { filter: "overdue" } }),
        },
        {
          icon: CheckSquare,
          en: `${briefing.tasksDueToday} Due Today`,
          ar: `${briefing.tasksDueToday} مستحقة اليوم`,
          tone: briefing.tasksDueToday > 0 ? "warn" : "good",
          onClick: () => navigate({ to: "/tasks", search: { filter: "today" } }),
        },
        {
          icon: Clock,
          en: `${briefing.appealWindow} In Appeal Window`,
          ar: `${briefing.appealWindow} في ميعاد الطعن`,
          tone: briefing.appealWindow > 0 ? "gold" : "good",
          onClick: () => navigate({ to: "/reports" }),
        },
      ]
    : [];

  const toneClass = (tone: string) => {
    switch (tone) {
      case "danger":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "warn":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "gold":
        return "bg-gold/15 text-gold border-gold/40";
      case "good":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      default:
        return "bg-navy/10 text-navy dark:bg-gold/10 dark:text-gold border-navy/20 dark:border-gold/20";
    }
  };

  return (
    <Card className="border-gold/40 bg-gradient-to-br from-navy to-navy/85 text-white overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold mb-3">
          <Scale className="h-3.5 w-3.5" />
          <span className={lang === "ar" ? "font-arabic" : ""}>
            {t("Daily Briefing", "الموجز اليومي")}
          </span>
        </div>
        {!briefing ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Preparing your briefing…", "جارٍ إعداد موجزك…")}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => {
              const Icon = b.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={b.onClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    toneClass(b.tone),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className={lang === "ar" ? "font-arabic" : ""}>{t(b.en, b.ar)}</span>
                </button>
              );
            })}
            {outstanding !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-medium",
                  toneClass("gold"),
                )}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span className={lang === "ar" ? "font-arabic" : ""}>
                  {t(
                    `${outstanding.toFixed(3)} KWD Outstanding`,
                    `${outstanding.toFixed(3)} د.ك مستحقة`,
                  )}
                </span>
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewCaseDialog({
  open,
  onClose,
  clients,
  t,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  clients: { id: string; name: string; name_ar: string | null }[];
  t: (en: string, ar: string) => string;
  lang: "en" | "ar";
}) {
  const [caseNumber, setCaseNumber] = useState("");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [caseType, setCaseType] = useState("");
  const [status, setStatus] = useState<"open" | "active" | "appeal" | "execution" | "closed">(
    "open",
  );
  const [loading, setLoading] = useState(false);
  const runCreate = useServerFn(createCase);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!caseNumber.trim() || !title.trim()) return;
    setLoading(true);
    try {
      await runCreate({
        data: {
          case_number: caseNumber,
          title,
          title_ar: titleAr || undefined,
          client_id: clientId || undefined,
          case_type: caseType || undefined,
          overall_status: status,
        },
      });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onClose();
      setCaseNumber("");
      setTitle("");
      setTitleAr("");
      setClientId("");
      setCaseType("");
      setStatus("open");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("New Case", "قضية جديدة")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground">
              {t("Case number", "رقم القضية")}
            </label>
            <Input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. 2026/123"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {t("Title (English)", "العنوان (إنجليزي)")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Contract dispute"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {t("Title (Arabic)", "العنوان (عربي)")}
            </label>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              placeholder="نزاع عقدي"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("Client", "الموكّل")}</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t("Unassigned", "غير مُسند")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className={lang === "ar" ? "font-arabic" : ""}>
                      {lang === "ar" ? (c.name_ar ?? c.name) : c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                {t("Case type", "نوع القضية")}
              </label>
              <Input
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                placeholder={t("Civil", "مدني")}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("Status", "الحالة")}</label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("Open", "مفتوحة")}</SelectItem>
                  <SelectItem value="active">{t("Active", "نشطة")}</SelectItem>
                  <SelectItem value="appeal">{t("Appeal", "استئناف")}</SelectItem>
                  <SelectItem value="execution">{t("Execution", "تنفيذ")}</SelectItem>
                  <SelectItem value="closed">{t("Closed", "مغلقة")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!caseNumber.trim() || !title.trim() || loading}
            className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("Create Case", "إنشاء القضية")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatLink({
  to,
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  to: string;
  icon: typeof TrendingUp;
  label: string;
  value: string | number | null;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Link to={to} className="block">
      <Card
        className={cn(
          "h-full transition-shadow hover:shadow-lg",
          accent && "border-gold/50 bg-gold/5",
        )}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="font-display text-2xl mt-1">{value ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">{sub}</div>
            </div>
            <div
              className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center",
                accent ? "bg-gold text-navy" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyRow({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground max-w-xs">{desc}</div>
    </div>
  );
}
