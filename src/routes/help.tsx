import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import {
  Scale,
  ArrowLeft,
  Users,
  FolderKanban,
  Calendar,
  Receipt,
  Landmark,
  Bot,
  FileText,
  ShieldCheck,
  BookOpen,
  Keyboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & User Guide — Qadiya OS" },
      {
        name: "description",
        content:
          "How to use Qadiya OS: cases, hearings, billing in KWD, trust accounts, client portal, AI drafting, and more.",
      },
      { property: "og:title", content: "Help & User Guide — Qadiya OS" },
      {
        property: "og:description",
        content: "Step-by-step guide to Qadiya OS for Kuwaiti law firms.",
      },
    ],
    links: [{ rel: "canonical", href: "https://qadiya.lovable.app/help" }],
  }),
  component: HelpPage,
});

type Section = {
  icon: LucideIcon;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const SECTIONS: Section[] = [
  {
    icon: FolderKanban,
    titleAr: "القضايا",
    titleEn: "Cases",
    bodyAr:
      "أنشئ قضية من زر ‹قضية جديدة›، اربطها بموكل، وسجّل رقم الدعوى ومحكمة الاختصاص. تُظهر شاشة القضية الجلسات، المستندات، الملاحظات، الوقت المسجَّل، والتذكيرات في مكان واحد.",
    bodyEn:
      "Create a matter from ‘New case’, link a client, and record the case number and court. The case screen shows hearings, documents, notes, time entries, and reminders in one place.",
  },
  {
    icon: Calendar,
    titleAr: "التقويم والجلسات",
    titleEn: "Calendar & hearings",
    bodyAr:
      "أضف جلسات ومواعيد إجرائية من التقويم؛ يحسب النظام مواعيد الطعن والاعتراض تلقائيًا وفق درجة المحكمة. صدِّر التقويم لـ Apple / Google / Outlook من زر ‹Export .ics›.",
    bodyEn:
      "Add hearings and procedural deadlines from the calendar. The system computes appeal and objection deadlines by court level. Export to Apple / Google / Outlook via ‘Export .ics’.",
  },
  {
    icon: Users,
    titleAr: "الموكلون وبوابة العميل",
    titleEn: "Clients & portal",
    bodyAr:
      "من صفحة الموكل، فعّل بوابة العميل وأرسل رابط دخول برمز مؤقت. يرى الموكل قضاياه وفواتيره ورسائلك — دون الاطلاع على ملاحظاتك الداخلية.",
    bodyEn:
      "From a client's page, enable portal access and send a magic-link login. Clients see only their own cases, invoices, and messages — never your internal notes.",
  },
  {
    icon: Receipt,
    titleAr: "الفوترة بالدينار",
    titleEn: "Billing (KWD)",
    bodyAr:
      "أنشئ فاتورة من بند وقت مسجَّل أو أضف بنودًا يدويًا. اطبع نسخة PDF ثنائية اللغة من زر ‹PDF› لكل فاتورة، مع دعم كامل للنص العربي وتخطيط RTL.",
    bodyEn:
      "Generate an invoice from tracked time or add line items manually. Export bilingual PDFs from the ‘PDF’ button with correct Arabic shaping and RTL layout.",
  },
  {
    icon: Landmark,
    titleAr: "حسابات الأمانة",
    titleEn: "Trust ledger",
    bodyAr:
      "سجِّل الإيداعات والصرف من سجل الأمانة؛ لا يمكن إلا للشركاء إضافة قيود. صدِّر تقرير التسوية الشهري (PDF) لأغراض جمعية المحامين من زر ‹Reconciliation PDF›.",
    bodyEn:
      "Record deposits and disbursements in the trust ledger; only partners can post entries. Export the monthly reconciliation PDF for Bar filing via ‘Reconciliation PDF’.",
  },
  {
    icon: Bot,
    titleAr: "مساعد الصياغة الذكي",
    titleEn: "AI drafting assistant",
    bodyAr:
      "من صفحة ‹Drafting›، اختر نوع المستند (مذكرة، لائحة، إعذار…) ولغته، وأدخل الوقائع. يستشهد المساعد بالمعرفة القانونية المُدخلة في مكتبك وبالمرجع العام المشترك.",
    bodyEn:
      "On the Drafting page, pick a document type (memo, statement of claim, notice…) and language, then paste the facts. The assistant cites both your firm's private knowledge and the shared Kuwaiti legal reference corpus.",
  },
  {
    icon: BookOpen,
    titleAr: "المعرفة القانونية",
    titleEn: "Legal knowledge",
    bodyAr:
      "أضف نصوصًا قانونية أو أحكامًا مرجعية من لوحة المعرفة. يمكن حفظها كـ ‹مشتركة› ليراها الجميع، أو ‹خاصة بالمكتب› فيراها موظفوك فقط.",
    bodyEn:
      "Add statutes or reference judgments from the Knowledge panel. Save entries as ‘Shared’ (visible to all firms) or ‘Firm-private’ (visible only to your staff).",
  },
  {
    icon: FileText,
    titleAr: "التقارير",
    titleEn: "Reports",
    bodyAr:
      "يولّد بوت التقارير ملخصًا ثنائي اللغة لأي موكل بضغطة واحدة، مع طباعة أو تصدير PDF، أو حفظه كملاحظة داخلية بالقضية.",
    bodyEn:
      "The report bot produces a bilingual client summary in one click; print, export PDF, or save as an internal case note.",
  },
  {
    icon: ShieldCheck,
    titleAr: "الأمان والفِرَق",
    titleEn: "Security & team",
    bodyAr:
      "كل مكتب معزول بيانيًا. تدير الأدوار (شريك، محامٍ، مساعد قانوني) من ‹الإعدادات ← الفريق›، وتُدعى الأعضاء الجدد برابط دعوة برمز صلاحية.",
    bodyEn:
      "Each firm is fully isolated. Manage roles (Partner, Associate, Paralegal) from Settings → Team, and invite new members via a tokenised invite link.",
  },
  {
    icon: Keyboard,
    titleAr: "اختصارات لوحة المفاتيح",
    titleEn: "Keyboard shortcuts",
    bodyAr: "اضغط ‹?› في أي مكان لعرض قائمة الاختصارات المتاحة.",
    bodyEn: "Press ‘?’ anywhere to open the shortcut cheatsheet.",
  },
];

function HelpPage() {
  const { lang } = useApp();
  const ar = lang === "ar";
  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold">Qadiya</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة للرئيسية" : "Back to home"}
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-serif text-3xl font-semibold">
          {ar ? "دليل الاستخدام" : "User guide"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {ar
            ? "كل ما تحتاجه للبدء بمنظومة قضية — من إنشاء قضية إلى إصدار فاتورة وتصدير تسوية الأمانة."
            : "Everything you need to get productive with Qadiya OS — from opening a case to issuing an invoice and exporting a trust reconciliation."}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.titleEn} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg font-semibold">
                        {ar ? s.titleAr : s.titleEn}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {ar ? s.bodyAr : s.bodyEn}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg border border-border/60 bg-muted/30 p-6 text-sm">
          <div className="font-medium">
            {ar ? "تحتاج مساعدة إضافية؟" : "Need more help?"}
          </div>
          <div className="mt-1 text-muted-foreground">
            {ar ? "راسلنا على " : "Email us at "}
            <a className="text-primary underline" href="mailto:support@qadiya.app">
              support@qadiya.app
            </a>
            {ar ? " ونردّ خلال يوم عمل." : " and we reply within one business day."}
          </div>
        </div>
      </main>
    </div>
  );
}
