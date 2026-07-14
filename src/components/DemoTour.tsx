import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  Sparkles,
  Gavel,
  Receipt,
  Bot,
  ArrowRight,
  ArrowLeft,
  X,
  Rocket,
} from "lucide-react";
import { useApp } from "@/lib/app-context";

interface TourStep {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Qadiya",
    titleAr: "مرحباً بك في قضية",
    description:
      "Your complete legal practice management system. Let me show you around — this tour takes 60 seconds.",
    descriptionAr:
      "نظام إدارة المكتب القانوني المتكامل. دعني أعرّفك على النظام — الجولة تستغرق 60 ثانية.",
    icon: <Rocket className="h-8 w-8 text-[hsl(var(--navy))]" />,
  },
  {
    title: "Dashboard & Daily Briefing",
    titleAr: "لوحة التحكم والإحاطة اليومية",
    description:
      "Your morning starts here. See today's hearings, overdue tasks, and urgent deadlines at a glance. The Daily Briefing card summarizes everything you need to know.",
    descriptionAr:
      "يومك يبدأ هنا. اطّلع على جلسات اليوم والمهام المتأخرة والمواعيد العاجلة. بطاقة الإحاطة اليومية تلخّص كل ما تحتاج معرفته.",
    icon: <LayoutDashboard className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/",
  },
  {
    title: "Court Calendar",
    titleAr: "التقويم القضائي",
    description:
      "All court hearings in a 30-day grid. Click any event to add it to Google Calendar with one click. Color-coded: navy for hearings, red for deadlines.",
    descriptionAr:
      "جميع الجلسات في تقويم 30 يوم. اضغط على أي حدث لإضافته إلى تقويم Google بنقرة واحدة. مرمّز بالألوان: أزرق للجلسات، أحمر للمواعيد النهائية.",
    icon: <Calendar className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/calendar",
  },
  {
    title: "Tasks & Workflows",
    titleAr: "المهام وسير العمل",
    description:
      "Create tasks, assign to team members, and run workflow templates. 'New Civil Case' auto-creates 5 tasks with staggered deadlines. No more forgotten steps.",
    descriptionAr:
      "أنشئ مهام، وزّعها على الفريق، وشغّل قوالب سير العمل. 'قضية مدنية جديدة' تنشئ 5 مهام تلقائياً بمواعيد متدرجة. لا مزيد من الخطوات المنسية.",
    icon: <CheckSquare className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/tasks",
  },
  {
    title: "Clients & Cases",
    titleAr: "العملاء والقضايا",
    description:
      "Full CRM for your clients. Each client has their cases, communication history, and documents in one place. Direct messaging built in.",
    descriptionAr:
      "نظام إدارة عملاء متكامل. كل عميل لديه قضاياه وسجل التواصل والمستندات في مكان واحد. المراسلة المباشرة مدمجة.",
    icon: <Users className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/clients",
  },
  {
    title: "Case Reports (MOJ Intelligence)",
    titleAr: "تقارير القضايا (ذكاء وزارة العدل)",
    description:
      "Type any case number → system scrapes the Kuwait MOJ portal live → generates a premium PDF with hearings, judgments, appeal deadlines, and AI recommendations. No competitor has this.",
    descriptionAr:
      "أدخل أي رقم قضية ← النظام يستخرج البيانات من بوابة وزارة العدل مباشرة ← يُنشئ تقرير PDF احترافي بالجلسات والأحكام ومواعيد الاستئناف وتوصيات الذكاء الاصطناعي. لا منافس يملك هذا.",
    icon: <Gavel className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/reports",
  },
  {
    title: "AI Legal Counsel",
    titleAr: "المستشار القانوني الذكي",
    description:
      "Ask legal questions in Arabic or English. Powered by RAG — upload Kuwait laws and precedents, and the AI cites actual articles. Bilingual, streaming, specialized in Kuwaiti law.",
    descriptionAr:
      "اسأل أسئلة قانونية بالعربية أو الإنجليزية. مدعوم بتقنية RAG — ارفع القوانين الكويتية والسوابق القضائية والذكاء الاصطناعي يستشهد بمواد فعلية.",
    icon: <Sparkles className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/ai-assistant",
  },
  {
    title: "Documents & Templates",
    titleAr: "المستندات والنماذج",
    description:
      "Generate legal documents from templates — Power of Attorney, contracts, pleadings. Auto-fills client and case data. Export as PDF.",
    descriptionAr:
      "أنشئ مستندات قانونية من النماذج — وكالات، عقود، صحف دعوى. تعبئة تلقائية ببيانات العميل والقضية. تصدير كـ PDF.",
    icon: <FileText className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/documents",
  },
  {
    title: "Billing & Invoicing",
    titleAr: "الفوترة والمحاسبة",
    description:
      "Create invoices, track payments, manage billing status. Admin-only access. Summary cards show outstanding, collected, and overdue amounts in KWD.",
    descriptionAr:
      "أنشئ فواتير، تتبّع المدفوعات، أدِر حالة الفوترة. وصول للمدراء فقط. بطاقات ملخّصة تعرض المبالغ المستحقة والمحصّلة والمتأخرة بالدينار.",
    icon: <Receipt className="h-8 w-8 text-[hsl(var(--navy))]" />,
    route: "/billing",
  },
  {
    title: "Telegram Bot (Live Integration)",
    titleAr: "بوت تلغرام (تكامل مباشر)",
    description:
      "Clients send a case number on Telegram → get an instant PDF report. Lawyers get smart judgment alerts with appeal deadline countdown and one-click Google Calendar buttons. Data syncs to this dashboard automatically.",
    descriptionAr:
      "العملاء يرسلون رقم القضية على تلغرام ← يحصلون على تقرير PDF فوري. المحامون يتلقون تنبيهات ذكية بالأحكام مع عدّاد موعد الاستئناف وأزرار تقويم Google. البيانات تتزامن مع لوحة التحكم تلقائياً.",
    icon: <Bot className="h-8 w-8 text-[hsl(var(--navy))]" />,
  },
  {
    title: "You're Ready!",
    titleAr: "أنت جاهز!",
    description:
      "Qadiya replaces paper letters, manual MOJ checks, scattered calendars, and forgotten deadlines with one intelligent system. Welcome to the future of legal practice in Kuwait.",
    descriptionAr:
      "قضية تستبدل الخطابات الورقية والتحقق اليدوي من وزارة العدل والتقويمات المتفرقة والمواعيد المنسية بنظام ذكي واحد. مرحباً بمستقبل الممارسة القانونية في الكويت.",
    icon: <Rocket className="h-8 w-8 text-[hsl(var(--gold))]" />,
  },
];

const TOUR_KEY = "qadiya_tour_completed";

export function DemoTour() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(TOUR_KEY, "true");
      setOpen(false);
      return;
    }
    const nextStep = TOUR_STEPS[step + 1];
    if (nextStep.route) {
      navigate({ to: nextStep.route });
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prevStep = TOUR_STEPS[step - 1];
      if (prevStep.route) {
        navigate({ to: prevStep.route });
      }
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setOpen(false);
  };

  // Allow re-triggering via window event
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("qadiya:start-tour", handler);
    return () => window.removeEventListener("qadiya:start-tour", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {currentStep.icon}
            <DialogTitle className={lang === "ar" ? "font-arabic" : "font-display"}>
              {lang === "ar" ? currentStep.titleAr : currentStep.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className={`text-muted-foreground leading-relaxed ${lang === "ar" ? "font-arabic text-right" : ""}`}>
          {lang === "ar" ? currentStep.descriptionAr : currentStep.description}
        </p>
        <div className="flex items-center justify-center gap-1 py-2">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-[hsl(var(--navy))]" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {lang === "ar" ? "السابق" : "Back"}
              </Button>
            )}
            {isFirst && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                <X className="h-4 w-4 mr-1" />
                {lang === "ar" ? "تخطي" : "Skip"}
              </Button>
            )}
          </div>
          <Button onClick={handleNext} size="sm">
            {isLast
              ? lang === "ar"
                ? "ابدأ الآن"
                : "Get Started"
              : lang === "ar"
                ? "التالي"
                : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to restart tour from anywhere
export function restartTour() {
  localStorage.removeItem(TOUR_KEY);
  window.dispatchEvent(new Event("qadiya:start-tour"));
}
