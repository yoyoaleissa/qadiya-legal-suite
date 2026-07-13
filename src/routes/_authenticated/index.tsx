import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Calendar,
  CalendarClock,
  CheckSquare,
  FileText,
  Gavel,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { listClients } from "@/lib/clients.functions";
import { listTasks } from "@/lib/tasks.functions";
import { listCalendarEvents } from "@/lib/calendar.functions";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function roleLabel(role: string, lang: "en" | "ar") {
  const map = {
    partner: { en: "Partner", ar: "شريك" },
    associate: { en: "Associate", ar: "محامٍ" },
    paralegal: { en: "Paralegal", ar: "مساعد قانوني" },
  } as const;
  return map[role as keyof typeof map][lang];
}

function Dashboard() {
  const { t, lang, role } = useApp();

  const runClients = useServerFn(listClients);
  const runTasks = useServerFn(listTasks);
  const runEvents = useServerFn(listCalendarEvents);

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => runClients() });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => runTasks() });
  const { data: events } = useQuery({ queryKey: ["calendar-events"], queryFn: () => runEvents() });

  const activeClients = clients?.length ?? null;
  const openMatters = clients ? clients.reduce((sum, c) => sum + c.case_count, 0) : null;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const hearingsThisWeek = events
    ? events.filter((e) => e.type === "hearing" && e.date >= todayStr && e.date <= weekEndStr).length
    : null;

  const upcoming = (events ?? [])
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const openTasks = (tasks ?? []).filter((t) => t.status !== "done").slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("Overview", "نظرة عامة")}
          </div>
          <h1 className="font-display text-4xl mt-1">
            {t("Good morning, ", "صباح الخير، ")}
            <span className="text-gold">{t(roleLabel(role, "en"), roleLabel(role, "ar"))}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "Here's what needs your attention today.",
              "إليك أهم ما يحتاج انتباهك اليوم.",
            )}
          </p>
        </div>
        <Link
          to="/report-bot"
          className="rounded-lg bg-navy text-white dark:bg-gold dark:text-navy px-5 py-3 flex items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <Bot className="h-5 w-5" />
          <div>
            <div className="text-xs opacity-80 uppercase tracking-wider">{t("Try the demo", "جرّب العرض")}</div>
            <div className="font-medium">{t("Open Report Bot", "افتح روبوت التقارير")}</div>
          </div>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatLink to="/clients" icon={Users} label={t("Active clients", "الموكّلون النشطون")} value={activeClients} sub={t("View directory", "عرض السجل")} />
        <StatLink to="/clients" icon={FileText} label={t("Open matters", "قضايا مفتوحة")} value={openMatters} sub={t("across firm", "على مستوى المكتب")} />
        <StatLink to="/calendar" icon={Calendar} label={t("Hearings this week", "جلسات هذا الأسبوع")} value={hearingsThisWeek} sub={t("Court calendar", "التقويم القضائي")} accent />
        <StatLink to="/billing" icon={Receipt} label={t("Outstanding", "مستحقات")} value="— KWD" sub={t("Billing", "الفوترة")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("Upcoming", "قادم")}</div>
                <h2 className="font-display text-xl">{t("Hearings & deadlines", "الجلسات والمواعيد")}</h2>
              </div>
              <Link to="/calendar" className="text-xs text-gold hover:underline">{t("View calendar →", "عرض التقويم ←")}</Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyRow
                icon={Calendar}
                title={t("No hearings synced yet", "لا توجد جلسات متزامنة بعد")}
                desc={t(
                  "Connected to the live backend — hearings appear here once cases are added.",
                  "متصل بالخادم المباشر — تظهر الجلسات هنا بمجرد إضافة القضايا.",
                )}
              />
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => (
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
                      {e.type === "hearing" ? <Gavel className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
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
                    <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180 group-hover:text-gold transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("Your queue", "قائمتك")}</div>
                <h2 className="font-display text-xl">{t("Tasks", "المهام")}</h2>
              </div>
              <Link to="/tasks" className="text-xs text-gold hover:underline">{t("View all →", "عرض الكل ←")}</Link>
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
                          {lang === "ar" ? task.title_ar ?? task.title : task.title}
                        </span>
                      </div>
                      {task.due_date && (
                        <div className="text-xs text-muted-foreground">{task.due_date}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
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
      <Card className={cn("h-full transition-shadow hover:shadow-lg", accent && "border-gold/50 bg-gold/5")}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="font-display text-2xl mt-1">{value ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">{sub}</div>
            </div>
            <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", accent ? "bg-gold text-navy" : "bg-muted text-muted-foreground")}>
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
