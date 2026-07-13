import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckSquare,
  FileText,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";

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
  const { t, role } = useApp();

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
            <div className="font-medium">{t("Open Report Bot", "افتح بوت التقارير")}</div>
          </div>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label={t("Active clients", "العملاء الفعّالون")} value="—" sub={t("Connect data source", "اربط مصدر البيانات")} />
        <Stat icon={FileText} label={t("Open matters", "قضايا مفتوحة")} value="—" sub={t("across firm", "على مستوى المكتب")} />
        <Stat icon={Calendar} label={t("Hearings this week", "جلسات هذا الأسبوع")} value="—" sub={t("Court calendar", "التقويم القضائي")} accent />
        <Stat icon={Receipt} label={t("Outstanding", "مستحقات")} value="— KWD" sub={t("Billing", "الفوترة")} />
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
            <EmptyRow
              icon={Calendar}
              title={t("No hearings synced yet", "لا توجد جلسات متزامنة بعد")}
              desc={t(
                "Connected to the live backend — hearings appear here once cases are added.",
                "متصل بالخادم المباشر — تظهر الجلسات هنا بمجرد إضافة القضايا.",
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("Your queue", "قائمتك")}</div>
                <h2 className="font-display text-xl">{t("Tasks", "المهام")}</h2>
              </div>
              <Link to="/tasks" className="text-xs text-gold hover:underline">{t("All →", "الكل ←")}</Link>
            </div>
            <EmptyRow
              icon={CheckSquare}
              title={t("Your queue is clear", "قائمتك فارغة")}
              desc={t("New tasks will show up here.", "ستظهر المهام الجديدة هنا.")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-gold/50 bg-gold/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="font-display text-2xl mt-1">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${accent ? "bg-gold text-navy" : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
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
