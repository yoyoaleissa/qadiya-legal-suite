import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  CalendarClock,
  ListTodo,
  Receipt,
  FileText,
  BrainCircuit,
  Bot,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Staff Portal — Qadiya OS" },
      { name: "description", content: "Practice command center for Kuwaiti law firms: cases, calendar, tasks, billing and documents." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { lang, t } = useApp();

  const modules = [
    {
      icon: Bot,
      title: lang === "ar" ? "روبوت التقارير" : "Report Bot",
      desc: lang === "ar" ? "تقارير قضايا فورية للعملاء — جاهز الآن." : "Instant client case reports — live now.",
      status: "live" as const,
      to: "/report" as const,
    },
    {
      icon: Users,
      title: lang === "ar" ? "إدارة القضايا والعملاء" : "Cases & Clients (CRM)",
      desc: lang === "ar" ? "ملفات العملاء، دورة حياة القضية، المذكرات وخزينة المستندات." : "Client profiles, case lifecycle, memos and document vault.",
      status: "next" as const,
    },
    {
      icon: CalendarClock,
      title: lang === "ar" ? "التقويم والمواعيد" : "Court Calendar & Deadlines",
      desc: lang === "ar" ? "تتبّع التقادم والإحاطة اليومية والإدخال اليدوي." : "Limitation tracking, daily briefing and manual entry.",
      status: "next" as const,
    },
    {
      icon: ListTodo,
      title: lang === "ar" ? "المهام وسير العمل" : "Tasks & Workflow",
      desc: lang === "ar" ? "قوالب العمل، التفويض والتصعيد." : "Workflow templates, delegation and escalation.",
      status: "planned" as const,
    },
    {
      icon: Receipt,
      title: lang === "ar" ? "الإدارة المالية" : "Financial Management",
      desc: lang === "ar" ? "تتبّع الوقت، الفوترة وتسجيل المصروفات." : "Time tracking, invoicing and expense logging.",
      status: "planned" as const,
    },
    {
      icon: FileText,
      title: lang === "ar" ? "إنشاء المستندات" : "Document Generation",
      desc: lang === "ar" ? "قوالب بتعبئة تلقائية من بيانات القضية والعميل." : "Templates auto-filled from case and client data.",
      status: "planned" as const,
    },
    {
      icon: BrainCircuit,
      title: lang === "ar" ? "المساعد القانوني (RAG)" : "AI Legal Assistant (RAG)",
      desc: lang === "ar" ? "بحث قانوني على قاعدة معرفة — قريباً." : "Legal research over a knowledge base — coming soon.",
      status: "soon" as const,
    },
  ];

  const badge = {
    live: { en: "Live", ar: "مباشر", cls: "bg-success/15 text-success" },
    next: { en: "Building next", ar: "قيد التطوير", cls: "bg-accent/15 text-accent-foreground" },
    planned: { en: "Planned", ar: "مُخطّط", cls: "bg-secondary text-secondary-foreground" },
    soon: { en: "Coming soon", ar: "قريباً", cls: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("staff_portal")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {lang === "ar"
              ? "مركز قيادة الممارسة. روبوت التقارير جاهز، وباقي الوحدات قيد البناء تباعاً."
              : "Your practice command center. The Report Bot is live; the remaining modules roll out next."}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const b = badge[m.status];
            const isLive = m.status === "live";
            const card = (
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-elevate transition-transform",
                  isLive && "hover:-translate-y-1",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", b.cls)}>
                    {lang === "ar" ? b.ar : b.en}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{m.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                {isLive && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground">
                    {lang === "ar" ? "افتح" : "Open"} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </span>
                )}
              </div>
            );
            return m.to ? (
              <Link key={m.title} to={m.to} className="block">
                {card}
              </Link>
            ) : (
              <div key={m.title}>{card}</div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          {lang === "ar"
            ? "المرحلة الأولى (روبوت التقارير) مكتملة بقاعدة بيانات حقيقية وقضية 222486500 التجريبية."
            : "Phase 1 (Report Bot) is complete with a live database and the seeded demo case 222486500."}
          <Button asChild variant="link" size="sm" className="ms-auto">
            <Link to="/report">{t("open_report_bot")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
