import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Calendar,
  Receipt,
  FileText,
  ShieldCheck,
  Landmark,
  Bot,
  Check,
  Star,
  Users,
  Building2,
  Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const CANONICAL = "https://qadiya.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Qadiya OS — منظومة إدارة المكاتب القانونية في الكويت" },
      {
        name: "description",
        content:
          "منظومة كويتية لإدارة المكاتب القانونية: مزامنة قضايا العدل، تذكيرات الجلسات، الفوترة بالدينار، وبوابة موكل. Kuwait's legal practice OS.",
      },
      { property: "og:title", content: "Qadiya OS — منظومة إدارة المكاتب القانونية في الكويت" },
      {
        property: "og:description",
        content:
          "MOJ sync, hearing reminders, KWD billing, trust accounts, and a client portal — built for Kuwaiti law firms.",
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Qadiya OS" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Qadiya OS — منظومة إدارة المكاتب القانونية" },
      {
        name: "twitter:description",
        content: "Kuwait's legal practice OS. Arabic-first. MOJ integrated.",
      },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Qadiya OS",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: ["ar", "en"],
          description: "Legal practice management for Kuwaiti law firms.",
          offers: [
            { "@type": "Offer", name: "Solo", price: "19", priceCurrency: "KWD" },
            { "@type": "Offer", name: "Firm", price: "49", priceCurrency: "KWD" },
            { "@type": "Offer", name: "Partners", price: "149", priceCurrency: "KWD" },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

/* -------------------------- Page -------------------------- */

function LandingPage() {
  const { lang, setLang } = useApp();
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const dir = lang === "ar" ? "rtl" : "ltr";

  // Signed-in visitors → dashboard.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        window.location.replace("/dashboard");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground antialiased">
      <LandingHeader t={t} lang={lang} setLang={setLang} />
      <main>
        <Hero t={t} lang={lang} />
        <TrustBar t={t} />
        <Problem t={t} />
        <Pillars t={t} />
        <DeepDive t={t} lang={lang} />
        <HowItWorks t={t} />
        <PortalTeaser t={t} lang={lang} />
        <Pricing t={t} lang={lang} />
        <FAQ t={t} />
        <FounderNote t={t} />
        <FinalCTA t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}

/* -------------------------- Header -------------------------- */

type TT = (ar: string, en: string) => string;

function LandingHeader({
  t,
  lang,
  setLang,
}: {
  t: TT;
  lang: "ar" | "en";
  setLang: (l: "ar" | "en") => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">Qadiya</span>
          <span className="text-sm text-muted-foreground">قضية</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <a href="#pillars" className="text-muted-foreground hover:text-foreground">
            {t("المميزات", "Features")}
          </a>
          <a href="#how" className="text-muted-foreground hover:text-foreground">
            {t("كيف تعمل", "How it works")}
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            {t("الأسعار", "Pricing")}
          </a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground">
            {t("الأسئلة", "FAQ")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Toggle language"
          >
            {lang === "ar" ? "EN" : "ع"}
          </button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">{t("دخول", "Sign in")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/login">{t("ابدأ التجربة", "Start trial")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* -------------------------- Hero -------------------------- */

function Hero({ t, lang }: { t: TT; lang: "ar" | "en" }) {
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%)",
        }}
      />
      <div className="container relative mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col justify-center"
        >
          <Badge variant="outline" className="mb-5 w-fit gap-1 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3" />
            {t("مصنوع في الكويت", "Made in Kuwait")}
          </Badge>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            {t(
              "منظومة إدارة المكاتب القانونية في الكويت.",
              "The operating system for Kuwaiti law firms.",
            )}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t(
              "مزامنة قضايا وزارة العدل، تذكيرات الجلسات، الفوترة بالدينار، حساب الأمانة، وبوابة موكل — كل ذلك بالعربية وبالإنجليزية.",
              "MOJ case sync, hearing reminders, KWD billing, trust accounts, and a client portal — bilingual Arabic and English.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/login" className="gap-2">
                {t("ابدأ التجربة مجاناً", "Start free trial")}
                <Arrow className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pillars">{t("شاهد كيف تعمل", "See how it works")}</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-primary" />
              {t("14 يوم تجربة", "14-day trial")}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-primary" />
              {t("لا بطاقة ائتمان", "No credit card")}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-primary" />
              {t("إلغاء في أي وقت", "Cancel anytime")}
            </span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <DashboardMock t={t} />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMock({ t }: { t: TT }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-medium">{t("لوحة المكتب", "Firm dashboard")}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {t("مباشر", "Live")}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { l: t("قضايا نشطة", "Active cases"), v: "142", d: "+8" },
          { l: t("جلسات هذا الأسبوع", "Hearings this week"), v: "17", d: "3 today" },
          { l: t("فواتير معلّقة", "Outstanding"), v: "12,450 KWD", d: "9 invoices" },
          { l: t("مهام متأخرة", "Overdue tasks"), v: "4", d: "" },
        ].map((k) => (
          <div key={k.l} className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">{k.l}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-lg font-semibold">{k.v}</div>
              {k.d && <div className="text-[10px] text-primary">{k.d}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-3">
        <div className="mb-2 text-[11px] text-muted-foreground">
          {t("أهم ما اليوم", "Focus today")}
        </div>
        {[
          { i: "10:00", l: t("جلسة القضية 222486500 — التمييز", "Cassation hearing 222486500") },
          { i: "12:30", l: t("مذكرة الرد — قضية الحمود", "Reply memo — Al-Hamoud case") },
          { i: "15:00", l: t("مكالمة موكّل جديد", "New client intake call") },
        ].map((r) => (
          <div
            key={r.i}
            className="flex items-center justify-between border-b border-border/40 py-1.5 text-xs last:border-0"
          >
            <span className="font-mono text-muted-foreground">{r.i}</span>
            <span className="flex-1 px-3 text-right rtl:text-left">{r.l}</span>
            <Check className="h-3 w-3 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- Trust bar -------------------------- */

function TrustBar({ t }: { t: TT }) {
  const items = [
    t("متوافق مع نقابة المحامين", "Kuwait Bar aligned"),
    t("تكامل بوابة وزارة العدل", "MOJ portal integrated"),
    t("بيانات آمنة", "Encrypted at rest"),
    t("ثنائي اللغة AR/EN", "Bilingual AR / EN"),
    t("داكن و فاتح", "Dark & light modes"),
  ];
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-xs text-muted-foreground">
        {items.map((i, idx) => (
          <span key={idx} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}

/* -------------------------- Problem -------------------------- */

function Problem({ t }: { t: TT }) {
  const pains = [
    {
      quote: t("فاتتني جلسة الأسبوع الماضي.", "I missed a hearing last week."),
      by: t("محامٍ منفرد، الكويت", "Solo lawyer, Kuwait"),
    },
    {
      quote: t("أطارد فواتير من ستة أشهر.", "I've been chasing invoices for six months."),
      by: t("شريك في مكتب", "Partner at a firm"),
    },
    {
      quote: t("الموكّل يتصل كل يوم يسأل عن قضيته.", "The client calls daily asking for updates."),
      by: t("مساعد قانوني", "Paralegal"),
    },
  ];
  return (
    <section className="border-b border-border/60">
      <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold md:text-4xl">
            {t("عمل المكتب يبتلع اليوم.", "Firm work is eating the day.")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t(
              "المواعيد، الفواتير، والتحديثات تُدار بالورق و WhatsApp — والنتائج معروفة.",
              "Deadlines, invoices, and updates run on paper and WhatsApp — with predictable results.",
            )}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pains.map((p, i) => (
            <Card key={i} className="border-border/60 bg-muted/20">
              <CardContent className="p-6">
                <p className="font-serif text-xl leading-relaxed">"{p.quote}"</p>
                <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                  — {p.by}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Pillars -------------------------- */

function Pillars({ t }: { t: TT }) {
  const items = [
    {
      icon: FileText,
      title: t("تقارير القضايا و مزامنة العدل", "Case reports & MOJ sync"),
      body: t(
        "استخرج آخر مستجدات قضاياك من بوابة وزارة العدل بضغطة زر، مع إشعارات عند أي تغيير.",
        "Pull the latest MOJ case updates on demand, with alerts on every change.",
      ),
    },
    {
      icon: Bot,
      title: t("مساعد قانوني ذكي", "AI legal assistant"),
      body: t(
        "بحث ذكي في أرشيف الأحكام و القوانين الكويتية، بالعربية وبالإنجليزية.",
        "Semantic search over Kuwaiti case law and statutes — Arabic and English.",
      ),
    },
    {
      icon: Calendar,
      title: t("التقويم القضائي", "Court calendar"),
      body: t(
        "جلسات و مواعيد الاستئناف و الطعن، مع حاسبة مواعيد رسمية و ربط بتقويم Google.",
        "Hearings, appeal windows, and cassation deadlines — with an official calculator and Google Calendar sync.",
      ),
    },
    {
      icon: Receipt,
      title: t("الفوترة و حساب الأمانة", "Billing & trust"),
      body: t(
        "فواتير KWD، حساب أمانة موكّل، مؤقت وقت، و تقارير مديونيات متقادمة بالعربية.",
        "KWD invoices, client trust ledger, time tracker, and Arabic aged-receivables reports.",
      ),
    },
  ];
  return (
    <section id="pillars" className="border-b border-border/60 bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
            {t("ماذا تفعل قضية", "What Qadiya does")}
          </p>
          <h2 className="font-serif text-3xl font-semibold md:text-4xl">
            {t("أربعة أعمدة تُدير المكتب.", "Four pillars that run the firm.")}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="h-full border-border/60">
                <CardContent className="p-6">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <it.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Deep dive -------------------------- */

function DeepDive({ t, lang }: { t: TT; lang: "ar" | "en" }) {
  const rows: {
    title: string;
    bullets: string[];
    mock: ReactNode;
  }[] = [
    {
      title: t("تقارير القضايا الآنية", "Real-time case reports"),
      bullets: [
        t("سحب مباشر من بوابة العدل", "Direct pull from the MOJ portal"),
        t("حالة، جلسات، أحكام، طعون", "Status, hearings, judgments, appeals"),
        t("تصدير PDF عربي رسمي", "Formal Arabic PDF export"),
      ],
      mock: <MockReport t={t} />,
    },
    {
      title: t("المساعد القانوني", "The legal assistant"),
      bullets: [
        t("بحث دلالي في الأحكام", "Semantic search across judgments"),
        t("مذكرات و مسودات مقترحة", "Suggested memos and drafts"),
        t("مصادر و مراجع دقيقة", "Cited sources you can verify"),
      ],
      mock: <MockAssistant t={t} />,
    },
    {
      title: t("تقويم و مواعيد رسمية", "Court calendar & deadlines"),
      bullets: [
        t("حاسبة الاستئناف و التمييز", "Appeal and cassation calculators"),
        t("خرائط للمحاكم الكويتية", "Maps for Kuwaiti courts"),
        t("إشعارات قبل موعد الجلسة", "Alerts before each hearing"),
      ],
      mock: <MockCalendar t={t} />,
    },
    {
      title: t("فوترة و حساب أمانة", "Billing & trust"),
      bullets: [
        t("فواتير KWD و مذكّرات دفع", "KWD invoices & Arabic reminders"),
        t("حساب أمانة و مسحوبات", "Trust ledger & drawdowns"),
        t("مديونيات متقادمة و KPIs", "Aged receivables & partner KPIs"),
      ],
      mock: <MockBilling t={t} />,
    },
  ];
  return (
    <section className="border-b border-border/60">
      <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
        <div className="space-y-24">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`grid items-center gap-10 md:grid-cols-2 ${
                i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <h3 className="font-serif text-2xl font-semibold md:text-3xl">{r.title}</h3>
                <ul className="mt-5 space-y-2.5">
                  {r.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>{r.mock}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockReport({ t }: { t: TT }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="font-mono text-xs" dir="ltr">
          222486500
        </span>
        <Badge className="text-[10px]">{t("محدّث الآن", "Just synced")}</Badge>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <Row label={t("المحكمة", "Court")} value={t("محكمة التمييز — دائرة تجاري", "Cassation — Commercial")} />
        <Row label={t("الحالة", "Status")} value={t("منظورة", "Pending")} accent />
        <Row label={t("الجلسة القادمة", "Next hearing")} value="12/03/2026" />
        <Row label={t("مهلة الطعن", "Appeal window")} value={t("14 يوم متبقٍ", "14 days left")} accent />
      </div>
    </div>
  );
}
function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-medium text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
function MockAssistant({ t }: { t: TT }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-5 shadow-xl">
      <div className="rounded-md bg-muted/60 p-3 text-xs">
        {t("ما هي مهلة الطعن بالتمييز في الأحكام التجارية؟", "What's the cassation window for commercial judgments?")}
      </div>
      <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed">
        {t(
          "60 يوماً من تاريخ صدور الحكم النهائي وفقاً للمادة 152 من قانون المرافعات الكويتي.",
          "60 days from the final judgment, per Article 152 of the Kuwaiti Civil Procedure Code.",
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">
          {t("المصدر: قانون المرافعات الكويتي", "Source: Kuwaiti Civil Procedure Code")}
        </div>
      </div>
    </div>
  );
}
function MockCalendar({ t }: { t: TT }) {
  const days = [
    { d: "12", m: t("مارس", "MAR"), item: t("جلسة تمييز", "Cassation hearing"), tag: t("عاجل", "Urgent") },
    { d: "18", m: t("مارس", "MAR"), item: t("مذكرة رد", "Reply memo"), tag: "" },
    { d: "24", m: t("مارس", "MAR"), item: t("جلسة استئناف", "Appeal hearing"), tag: "" },
  ];
  return (
    <div className="rounded-xl border border-border bg-card/80 p-5 shadow-xl">
      <div className="space-y-2">
        {days.map((d) => (
          <div key={d.d} className="flex items-center gap-4 rounded-md border border-border/60 bg-background/40 p-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
              <div className="text-center">
                <div className="text-sm font-semibold leading-none">{d.d}</div>
                <div className="text-[9px] uppercase">{d.m}</div>
              </div>
            </div>
            <div className="flex-1 text-sm">{d.item}</div>
            {d.tag && (
              <Badge variant="destructive" className="text-[10px]">
                {d.tag}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function MockBilling({ t }: { t: TT }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-5 shadow-xl">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{t("مديونيات متقادمة", "Aged receivables")}</span>
        <span className="font-serif text-2xl font-semibold">12,450 KWD</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: "1–30", v: "4,200" },
          { l: "31–60", v: "3,100" },
          { l: "61–90", v: "2,800" },
          { l: "90+", v: "2,350", warn: true },
        ].map((b) => (
          <div
            key={b.l}
            className={`rounded-md border p-2 text-center ${
              b.warn ? "border-destructive/50 bg-destructive/10" : "border-border/60 bg-background/40"
            }`}
          >
            <div className="text-[10px] text-muted-foreground">{b.l}</div>
            <div className="mt-0.5 text-xs font-semibold">{b.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- How it works -------------------------- */

function HowItWorks({ t }: { t: TT }) {
  const steps = [
    {
      n: "1",
      title: t("أنشئ حساب المكتب", "Create your firm"),
      body: t("سجّل دخول بريدك في دقيقة، بدون بطاقة.", "Sign in with your email in a minute — no card required."),
    },
    {
      n: "2",
      title: t("استورد قضاياك", "Import your cases"),
      body: t("أدخل رقم القضية، وقضية تسحب البيانات من العدل.", "Enter a case number; Qadiya pulls MOJ data."),
    },
    {
      n: "3",
      title: t("استلم إحاطتك اليومية", "Get your daily briefing"),
      body: t(
        "قائمة أولوياتك، الجلسات، والفواتير — كل صباح.",
        "Your priorities, hearings, and invoices — every morning.",
      ),
    },
  ];
  return (
    <section id="how" className="border-b border-border/60 bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
        <h2 className="font-serif text-3xl font-semibold md:text-4xl">
          {t("ثلاث خطوات للانطلاق.", "Three steps to launch.")}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-border/60 bg-background p-6">
              <div className="font-serif text-4xl font-semibold text-primary/60">{s.n}</div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Client portal teaser -------------------------- */

function PortalTeaser({ t, lang }: { t: TT; lang: "ar" | "en" }) {
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <section className="border-b border-border/60">
      <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-2 md:py-32">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t("بوابة الموكل", "Client portal")}
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">
            {t("موكّلك يرى قضيته من هاتفه.", "Your client sees their case from their phone.")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t(
              "دخول برابط سحري، متابعة القضايا، الفواتير، وقناة رسائل آمنة مع المكتب.",
              "Magic-link sign-in, live case status, invoices, and a secure message thread with the firm.",
            )}
          </p>
          <Button className="mt-6 gap-2" variant="outline" asChild>
            <Link to="/portal">
              {t("جرّب البوابة", "Try the portal")}
              <Arrow className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-8 border-foreground/80 bg-background p-3 shadow-2xl">
            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">قضاياي</span>
                <Badge variant="secondary" className="text-[10px]">
                  3
                </Badge>
              </div>
              {[
                { c: "222486500", s: "منظورة" },
                { c: "331920477", s: "بانتظار الحكم" },
                { c: "108557612", s: "مغلقة" },
              ].map((c) => (
                <div
                  key={c.c}
                  className="mb-2 flex items-center justify-between rounded-md border border-border/60 bg-background p-2.5 text-xs"
                >
                  <span className="font-mono" dir="ltr">
                    {c.c}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.s}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Pricing -------------------------- */

function Pricing({ t, lang }: { t: TT; lang: "ar" | "en" }) {
  const currency = t("د.ك", "KWD");
  const perMonth = t("/ شهر", "/ month");
  const tiers = [
    {
      icon: Users,
      name: t("منفرد", "Solo"),
      price: "19",
      tag: t("للمحامي المستقل", "For solo lawyers"),
      features: [
        t("محامٍ واحد", "1 lawyer"),
        t("حتى 50 قضية", "Up to 50 cases"),
        t("تقارير العدل", "MOJ reports"),
        t("تقويم و مهام", "Calendar & tasks"),
      ],
      cta: t("ابدأ", "Start"),
    },
    {
      icon: Building2,
      name: t("مكتب", "Firm"),
      price: "49",
      tag: t("الأكثر شيوعاً", "Most popular"),
      features: [
        t("حتى 10 محامين", "Up to 10 lawyers"),
        t("قضايا غير محدودة", "Unlimited cases"),
        t("حساب أمانة", "Trust account"),
        t("بوابة موكل", "Client portal"),
        t("المساعد الذكي", "AI assistant"),
      ],
      cta: t("ابدأ", "Start"),
      highlighted: true,
    },
    {
      icon: Landmark,
      name: t("شركاء", "Partners"),
      price: "149",
      tag: t("للشركات الكبيرة", "For larger firms"),
      features: [
        t("محامون غير محدودون", "Unlimited lawyers"),
        t("لوحة شركاء و KPIs", "Partner KPIs"),
        t("تقارير مجدولة", "Scheduled reports"),
        t("سجل تدقيق كامل", "Full audit log"),
        t("دعم مخصّص", "Priority support"),
      ],
      cta: t("تواصل مع المبيعات", "Contact sales"),
    },
  ];
  return (
    <section id="pricing" className="border-b border-border/60 bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
            {t("الأسعار", "Pricing")}
          </p>
          <h2 className="font-serif text-3xl font-semibold md:text-4xl">
            {t("شفاف وبالدينار الكويتي.", "Transparent, in Kuwaiti Dinar.")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("14 يوم تجربة على كل الباقات. ألغِ في أي وقت.", "14-day trial on every plan. Cancel anytime.")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative border-border/60 ${
                tier.highlighted ? "border-primary bg-primary/5 shadow-xl" : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Star className="h-3 w-3" />
                    {tier.tag}
                  </Badge>
                </div>
              )}
              <CardContent className="p-7">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <tier.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-2xl font-semibold">{tier.name}</h3>
                {!tier.highlighted && (
                  <p className="text-xs text-muted-foreground">{tier.tag}</p>
                )}
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-serif text-4xl font-semibold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{currency}</span>
                  <span className="text-sm text-muted-foreground">{perMonth}</span>
                </div>
                <Button
                  className="mt-5 w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link to="/login">{tier.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- FAQ -------------------------- */

function FAQ({ t }: { t: TT }) {
  const items = [
    {
      q: t("أين تُخزَّن بياناتنا؟", "Where is our data stored?"),
      a: t(
        "بيانات المكتب مشفّرة و مُخزّنة في بنية سحابية موثوقة مع نسخ احتياطية يومية.",
        "Firm data is encrypted at rest in a trusted cloud with daily backups.",
      ),
    },
    {
      q: t("هل السحب من بوابة العدل قانوني؟", "Is pulling data from the MOJ portal legal?"),
      a: t(
        "نعم — نستعلم بنفس الطريقة التي يستعلم بها المحامي: باسم المستخدم و رقم القضية العلني.",
        "Yes — the same public lookup a lawyer would run manually, using their credentials and the public case number.",
      ),
    },
    {
      q: t("هل تدعمون العربية بالكامل؟", "Do you fully support Arabic?"),
      a: t(
        "التطبيق و التقارير و الفواتير و الإشعارات كلها بالعربية و بالإنجليزية، RTL كامل.",
        "The app, reports, invoices, and notifications are fully bilingual with complete RTL support.",
      ),
    },
    {
      q: t("هل يمكن استيراد قضايانا الحالية؟", "Can we import our existing cases?"),
      a: t(
        "نعم، عبر Excel أو إضافة يدوية أو مباشرة برقم القضية.",
        "Yes — via Excel, manual entry, or straight from a case number.",
      ),
    },
    {
      q: t("هل هناك تجربة مجانية؟", "Is there a free trial?"),
      a: t(
        "14 يوم على كل الباقات، بدون بطاقة ائتمان.",
        "14 days on every plan, no credit card required.",
      ),
    },
    {
      q: t("كيف نلغي الاشتراك؟", "How do we cancel?"),
      a: t(
        "من إعدادات المكتب في أي وقت — بياناتك تبقى قابلة للتصدير.",
        "From firm settings at any time — your data stays exportable.",
      ),
    },
  ];
  return (
    <section id="faq" className="border-b border-border/60">
      <div className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
        <h2 className="mb-10 font-serif text-3xl font-semibold md:text-4xl">
          {t("أسئلة شائعة", "Frequently asked")}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`i-${i}`}>
              <AccordionTrigger className="text-start">{it.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* -------------------------- Founder note -------------------------- */

function FounderNote({ t }: { t: TT }) {
  return (
    <section className="border-b border-border/60 bg-muted/20">
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "hsl(45 55% 55%)" }}
        >
          {t("رسالة", "A note")}
        </p>
        <blockquote className="mt-5 font-serif text-2xl leading-relaxed md:text-3xl">
          {t(
            "قضية صُنعت في الكويت لمكاتب المحاماة الكويتية — بأدواتها، بلغتها، وبإيقاعها.",
            "Qadiya was built in Kuwait for Kuwaiti law firms — their tools, their language, their pace.",
          )}
        </blockquote>
      </div>
    </section>
  );
}

/* -------------------------- Final CTA -------------------------- */

function FinalCTA({ t }: { t: TT }) {
  return (
    <section className="border-b border-border/60">
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center md:py-32">
        <h2 className="font-serif text-3xl font-semibold md:text-5xl">
          {t("جرّب Qadiya لمدة 14 يوماً.", "Try Qadiya for 14 days.")}
        </h2>
        <p className="mt-4 text-muted-foreground">
          {t("بدون بطاقة ائتمان. ألغِ في أي وقت.", "No credit card. Cancel anytime.")}
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link to="/login">{t("ابدأ الآن", "Get started")}</Link>
        </Button>
      </div>
    </section>
  );
}

/* -------------------------- Footer -------------------------- */

function Footer({ t }: { t: TT }) {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold">Qadiya</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              "منظومة المكاتب القانونية في الكويت.",
              "The operating system for Kuwaiti law firms.",
            )}
          </p>
        </div>
        <FooterCol
          title={t("المنتج", "Product")}
          items={[
            { l: t("المميزات", "Features"), h: "#pillars" },
            { l: t("الأسعار", "Pricing"), h: "#pricing" },
            { l: t("بوابة الموكل", "Client portal"), h: "/portal" },
          ]}
        />
        <FooterCol
          title={t("الشركة", "Company")}
          items={[
            { l: t("الأسئلة", "FAQ"), h: "#faq" },
            { l: t("دليل الاستخدام", "Help & guide"), h: "/help" },
            { l: t("الخصوصية", "Privacy"), h: "/privacy" },
            { l: t("الشروط", "Terms"), h: "/terms" },
          ]}
        />
        <FooterCol
          title={t("تواصل", "Contact")}
          items={[
            { l: "hello@qadiya.app", h: "mailto:hello@qadiya.app", icon: Phone },
          ]}
        />

      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Qadiya OS · {t("كل الحقوق محفوظة", "All rights reserved")}
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { l: string; h: string; icon?: typeof Phone }[];
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.l}>
            <a href={it.h} className="hover:text-primary">
              {it.l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
