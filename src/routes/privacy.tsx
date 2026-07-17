import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { Scale, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Qadiya OS" },
      {
        name: "description",
        content:
          "How Qadiya OS collects, stores, and protects personal and case data for Kuwaiti law firms.",
      },
      { property: "og:title", content: "Privacy Policy — Qadiya OS" },
      { property: "og:description", content: "Data protection policy for Qadiya OS." },
    ],
    links: [{ rel: "canonical", href: "https://qadiya.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useApp();
  const ar = lang === "ar";
  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold">Qadiya</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "العودة للرئيسية" : "Back to home"}
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-3xl font-semibold">
          {ar ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? "آخر تحديث: يوليو 2026" : "Last updated: July 2026"}
        </p>
        <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
          {ar ? <ArabicPolicy /> : <EnglishPolicy />}
        </div>
      </main>
    </div>
  );
}

function EnglishPolicy() {
  return (
    <>
      <h2>1. Introduction</h2>
      <p>
        Qadiya OS ("we", "us") is a legal practice management platform used by Kuwaiti law firms.
        This policy explains what personal data we process, how we protect it, and the rights
        available to firm members and their clients under Kuwait's Personal Data Protection
        Regulation (CITRA Decision No. 42/2021) and applicable professional-secrecy rules under
        Kuwait's Advocacy Law No. 42/1964.
      </p>

      <h2>2. Data we process</h2>
      <ul>
        <li><strong>Firm & user data:</strong> name, email, role, authentication credentials.</li>
        <li><strong>Case data:</strong> matter numbers, hearings, judgments, deadlines, documents, notes, timeline events.</li>
        <li><strong>Client data:</strong> names, civil IDs, contact details, and correspondence supplied by the firm.</li>
        <li><strong>Financial data:</strong> invoices, trust ledger entries, time entries.</li>
        <li><strong>Operational logs:</strong> audit trail of user actions inside the firm's workspace.</li>
      </ul>

      <h2>3. Legal basis</h2>
      <p>
        We process data as a <strong>processor</strong> on behalf of the law firm (the controller).
        The firm is responsible for obtaining any necessary client consent under CITRA rules and
        Kuwait Bar Association guidance.
      </p>

      <h2>4. Data residency & security</h2>
      <p>
        Data is stored on encrypted managed infrastructure. All connections use TLS. Row-level
        security isolates every firm's data — no firm can read another firm's records, ever.
        Backups are encrypted at rest.
      </p>

      <h2>5. Access & sharing</h2>
      <p>
        We do not sell data. We do not use client or case data to train AI models. AI features
        (drafting, briefings, embeddings) route through the Lovable AI Gateway under a
        no-training data-processing agreement, with prompts scoped to the firm's own data.
      </p>

      <h2>6. Retention</h2>
      <p>
        Firm data is retained for the life of the subscription plus 90 days for recovery. On
        written request from a firm's administrator, we permanently delete all firm data within
        30 days, except records we are legally required to retain.
      </p>

      <h2>7. Sub-processors</h2>
      <p>
        We use vetted sub-processors for hosting, email delivery, and AI inference. A current
        list is available on request to <a href="mailto:privacy@qadiya.app">privacy@qadiya.app</a>.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Individuals whose data is stored in a firm's workspace may exercise access, correction,
        and deletion rights by contacting the firm directly. We assist firms in fulfilling these
        requests. Complaints may be filed with CITRA (Communication & Information Technology
        Regulatory Authority).
      </p>

      <h2>9. Contact</h2>
      <p>
        Data protection queries: <a href="mailto:privacy@qadiya.app">privacy@qadiya.app</a>.
      </p>
    </>
  );
}

function ArabicPolicy() {
  return (
    <>
      <h2>1. مقدمة</h2>
      <p>
        منظومة قضية (Qadiya OS) هي منصة إدارة أعمال قانونية تستخدمها المكاتب في دولة الكويت.
        توضح هذه السياسة أنواع البيانات الشخصية التي نعالجها وطرق حمايتها، وحقوق منسوبي المكاتب
        وموكليهم وفق لائحة حماية البيانات الشخصية الصادرة عن هيئة الاتصالات (قرار 42/2021)،
        وقواعد السرية المهنية في قانون المحاماة الكويتي رقم 42/1964.
      </p>

      <h2>2. البيانات التي نعالجها</h2>
      <ul>
        <li><strong>بيانات المكتب والمستخدم:</strong> الاسم، البريد الإلكتروني، الدور، بيانات الدخول.</li>
        <li><strong>بيانات القضايا:</strong> أرقام الدعاوى، الجلسات، الأحكام، المواعيد، المستندات، الملاحظات.</li>
        <li><strong>بيانات الموكلين:</strong> الأسماء، البطاقة المدنية، بيانات التواصل، والمراسلات.</li>
        <li><strong>البيانات المالية:</strong> الفواتير، سجلات حسابات الأمانة، تسجيل الوقت.</li>
        <li><strong>السجلات التشغيلية:</strong> سجل تدقيق كامل لتحركات المستخدمين داخل بيئة المكتب.</li>
      </ul>

      <h2>3. الأساس القانوني</h2>
      <p>
        نعمل بصفة <strong>مُعالِج للبيانات</strong> نيابةً عن المكتب (المُتحكم). المكتب مسؤول عن
        الحصول على موافقة الموكلين وفق تعليمات هيئة الاتصالات وجمعية المحامين الكويتية.
      </p>

      <h2>4. مكان التخزين والأمان</h2>
      <p>
        تُخزَّن البيانات على بنية تحتية مُدارة ومشفّرة. جميع الاتصالات عبر TLS. تُعزل بيانات كل
        مكتب بواسطة سياسات أمان على مستوى الصف — لا يمكن لأي مكتب الاطلاع على بيانات مكتب آخر.
        النسخ الاحتياطية مشفّرة أثناء التخزين.
      </p>

      <h2>5. الوصول والمشاركة</h2>
      <p>
        لا نبيع البيانات. لا نستخدم بيانات القضايا أو الموكلين لتدريب نماذج الذكاء الاصطناعي.
        تمر ميزات الذكاء الاصطناعي عبر بوابة Lovable AI وفق اتفاقية معالجة تمنع التدريب على بياناتك.
      </p>

      <h2>6. الاحتفاظ</h2>
      <p>
        نحتفظ ببيانات المكتب طوال مدة الاشتراك و90 يومًا بعده لأغراض الاستعادة. نحذف جميع بيانات
        المكتب نهائيًا خلال 30 يومًا من طلب المسؤول كتابيًا، باستثناء ما يُلزمنا القانون بحفظه.
      </p>

      <h2>7. المعالِجون الفرعيون</h2>
      <p>
        نستعين بمزودين معتمدين للاستضافة والبريد والذكاء الاصطناعي. قائمة محدّثة متاحة عند الطلب
        على <a href="mailto:privacy@qadiya.app">privacy@qadiya.app</a>.
      </p>

      <h2>8. حقوقك</h2>
      <p>
        يمكن لأصحاب البيانات المخزّنة داخل مكتبٍ ما ممارسة حقوق الوصول والتصحيح والحذف بمخاطبة
        المكتب مباشرة. نُقدّم للمكاتب الدعم اللازم لتلبية هذه الطلبات. يمكن رفع الشكاوى إلى
        هيئة الاتصالات وتقنية المعلومات (CITRA).
      </p>

      <h2>9. للتواصل</h2>
      <p>
        استفسارات حماية البيانات: <a href="mailto:privacy@qadiya.app">privacy@qadiya.app</a>.
      </p>
    </>
  );
}
