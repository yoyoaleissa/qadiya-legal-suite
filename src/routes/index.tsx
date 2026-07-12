import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, CalendarClock, Bot, ShieldCheck, Scale, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { lang, t } = useApp();

  const features = [
    {
      icon: Bot,
      title: lang === "ar" ? "روبوت التقارير" : "Report Bot",
      desc: t("report_bot_desc"),
    },
    {
      icon: CalendarClock,
      title: lang === "ar" ? "ذكاء المواعيد" : "Deadline intelligence",
      desc:
        lang === "ar"
          ? "تتبّع مواعيد الاستئناف والتقادم مع تنبيهات عاجلة قبل فوات الأوان."
          : "Track appeal windows and limitation periods with urgent alerts before they lapse.",
    },
    {
      icon: FileText,
      title: lang === "ar" ? "ملف قضية موحّد" : "Unified case dossier",
      desc:
        lang === "ar"
          ? "بيانات كل درجة تقاضٍ، الأحكام، الجلسات والتنفيذ في مكان واحد."
          : "Every court level, judgment, hearing and execution record in one place.",
    },
    {
      icon: ShieldCheck,
      title: lang === "ar" ? "صلاحيات حسب الدور" : "Role-based access",
      desc:
        lang === "ar"
          ? "صلاحيات مخصّصة للشريك والمحامي والمساعد القانوني."
          : "Tailored permissions for Partner, Associate and Paralegal.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-accent">
              <Scale className="h-3.5 w-3.5" /> {t("tagline")}
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-primary-foreground sm:text-6xl">
              {t("hero_title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
              {t("hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2 bg-gradient-gold text-gold-foreground shadow-gold hover:opacity-90">
                <Link to="/report">
                  {t("open_report_bot")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <Link to="/dashboard">{t("staff_portal")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-elevate transition-transform hover:-translate-y-1">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Report bot CTA band */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-card p-8 shadow-elevate sm:flex-row sm:items-center sm:p-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-accent-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">{t("report_bot")}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
              {lang === "ar" ? "تقرير قضية فوري بلغة واضحة" : "Instant, plain-language case reports"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("report_bot_desc")}</p>
          </div>
          <Button asChild size="lg" className="shrink-0 gap-2">
            <Link to="/report">
              {t("generate_report")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <BrandMark />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Qadiya OS · {t("tagline")}</p>
        </div>
      </footer>
    </div>
  );
}
