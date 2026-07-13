import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";
export type Lang = "en" | "ar";
export type Role = "partner" | "associate" | "paralegal";

interface AppState {
  theme: Theme;
  lang: Lang;
  dir: "ltr" | "rtl";
  role: Role;
  setRole: (r: Role) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: keyof typeof translations.en) => string;
}

const AppContext = createContext<AppState | null>(null);

export const translations = {
  en: {
    brand: "Qadiya OS",
    tagline: "Kuwait Legal Practice Management",
    hero_title: "Clarity in every case.",
    hero_sub: "AI-drafted case reports, deadline intelligence, and a complete practice command center — built for Kuwaiti law firms.",
    open_report_bot: "Open the Report Bot",
    staff_portal: "Staff Portal",
    report_bot: "Report Bot",
    report_bot_desc: "Clients enter a case number and receive an instant, plain-language status report in Arabic and English.",
    enter_case: "Enter your case number",
    case_number: "Case number",
    generate_report: "Generate report",
    generating: "Preparing your case report…",
    download_pdf: "Download PDF",
    new_lookup: "New lookup",
    status: "Status",
    summary: "Case summary",
    next_deadline: "Next deadline",
    no_deadline: "No active deadlines — this case is closed.",
    days_remaining: "days remaining",
    what_it_means: "What this means for you",
    timeline: "Case timeline",
    full_details: "Full details (for lawyers)",
    judgments: "Judgments",
    sessions: "Sessions & hearings",
    execution: "Execution procedures",
    court_levels: "Court levels",
    date: "Date",
    level: "Level",
    ruling: "Ruling",
    type: "Type",
    amount: "Amount",
    payment: "Payment",
    court: "Court",
    reference: "Reference",
    registered: "Registered",
    receipts: "Collection receipts",
    not_found_title: "Case not found",
    not_found_desc: "We couldn't find a case with that number. Please check and try again.",
    try_example: "Try the demo case 222486500",
    dashboard: "Dashboard",
    coming_soon: "Coming soon",
    disclaimer: "This report is procedural guidance generated from case records — it is not legal advice or a verdict.",
    powered: "Powered by Qadiya OS AI",
    documents: "Document Generation",
    documents_desc: "Generate court-ready documents auto-filled from case and client data — in Arabic or English.",
    choose_template: "Choose a template",
    client_name: "Client name",
    civil_id: "Civil ID",
    firm_name: "Firm name",
    autofill_preview: "Auto-fill preview",
    generate_document: "Generate document",
    close: "Close",
    print_document: "Download PDF",
    theme: "Theme",
    language: "Language",
  },
  ar: {
    brand: "قضية OS",
    tagline: "منظومة إدارة الممارسة القانونية الكويتية",
    hero_title: "وضوحٌ في كل قضية.",
    hero_sub: "تقارير قضايا مُعدّة بالذكاء الاصطناعي، وذكاء المواعيد، ومركز قيادة متكامل — مصمّم لمكاتب المحاماة الكويتية.",
    open_report_bot: "افتح روبوت التقارير",
    staff_portal: "بوابة الموظفين",
    report_bot: "روبوت التقارير",
    report_bot_desc: "يُدخل العميل رقم القضية ليحصل فوراً على تقرير مبسّط بحالته بالعربية والإنجليزية.",
    enter_case: "أدخل رقم قضيتك",
    case_number: "رقم القضية",
    generate_report: "إصدار التقرير",
    generating: "جارٍ إعداد تقرير قضيتك…",
    download_pdf: "تحميل PDF",
    new_lookup: "بحث جديد",
    status: "الحالة",
    summary: "ملخص القضية",
    next_deadline: "الموعد القادم",
    no_deadline: "لا توجد مواعيد نشطة — القضية مغلقة.",
    days_remaining: "يوماً متبقياً",
    what_it_means: "ماذا يعني هذا لك",
    timeline: "الجدول الزمني للقضية",
    full_details: "التفاصيل الكاملة (للمحامين)",
    judgments: "الأحكام",
    sessions: "الجلسات",
    execution: "إجراءات التنفيذ",
    court_levels: "درجات التقاضي",
    date: "التاريخ",
    level: "الدرجة",
    ruling: "المنطوق",
    type: "النوع",
    amount: "المبلغ",
    payment: "السداد",
    court: "المحكمة",
    reference: "المرجع",
    registered: "تاريخ القيد",
    receipts: "سندات التحصيل",
    not_found_title: "القضية غير موجودة",
    not_found_desc: "تعذّر العثور على قضية بهذا الرقم. يُرجى التحقق والمحاولة مرة أخرى.",
    try_example: "جرّب القضية التجريبية 222486500",
    dashboard: "لوحة التحكم",
    coming_soon: "قريباً",
    disclaimer: "هذا التقرير إرشاد إجرائي مُستخرج من سجلات القضية — وليس استشارة قانونية أو حكماً.",
    powered: "مدعوم بذكاء قضية OS",
    documents: "إنشاء المستندات",
    documents_desc: "أنشئ مستندات جاهزة للمحكمة بتعبئة تلقائية من بيانات القضية والعميل — بالعربية أو الإنجليزية.",
    choose_template: "اختر قالباً",
    client_name: "اسم العميل",
    civil_id: "الرقم المدني",
    firm_name: "اسم المكتب",
    autofill_preview: "معاينة التعبئة التلقائية",
    generate_document: "توليد المستند",
    close: "إغلاق",
    print_document: "تحميل PDF",
    theme: "المظهر",
    language: "اللغة",
  },
} as const;

export const COURT_LEVEL_LABELS: Record<string, { en: string; ar: string }> = {
  police_prosecution: { en: "Police / Prosecution", ar: "النيابة" },
  first_instance: { en: "First Instance", ar: "الكلية / أول درجة" },
  appeal: { en: "Appeal", ar: "الاستئناف" },
  cassation: { en: "Cassation", ar: "التمييز" },
  execution: { en: "Execution", ar: "التنفيذ" },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const storedTheme = (localStorage.getItem("qadiya-theme") as Theme) || "light";
    const storedLang = (localStorage.getItem("qadiya-lang") as Lang) || "en";
    setTheme(storedTheme);
    setLangState(storedLang);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("qadiya-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    localStorage.setItem("qadiya-lang", lang);
  }, [lang]);

  const toggleTheme = useCallback(() => setTheme((p) => (p === "light" ? "dark" : "light")), []);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === "en" ? "ar" : "en")), []);

  const t = useCallback(
    (key: keyof typeof translations.en) => translations[lang][key] ?? translations.en[key],
    [lang],
  );

  const value = useMemo<AppState>(
    () => ({ theme, lang, dir: lang === "ar" ? "rtl" : "ltr", toggleTheme, setLang, toggleLang, t }),
    [theme, lang, toggleTheme, setLang, toggleLang, t],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
