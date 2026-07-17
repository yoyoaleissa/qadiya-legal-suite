import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { Scale, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Qadiya OS" },
      {
        name: "description",
        content:
          "Subscription terms, acceptable use, and liability for Qadiya OS — Kuwait's legal practice OS.",
      },
      { property: "og:title", content: "Terms of Service — Qadiya OS" },
      { property: "og:description", content: "Terms of service for Qadiya OS subscribers." },
    ],
    links: [{ rel: "canonical", href: "https://qadiya.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          {ar ? "شروط الاستخدام" : "Terms of Service"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? "آخر تحديث: يوليو 2026" : "Last updated: July 2026"}
        </p>
        <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
          {ar ? <ArabicTerms /> : <EnglishTerms />}
        </div>
      </main>
    </div>
  );
}

function EnglishTerms() {
  return (
    <>
      <h2>1. Agreement</h2>
      <p>
        By creating an account or using Qadiya OS ("Service") you agree to these Terms on behalf
        of your law firm ("Subscriber"). If you cannot bind the firm, do not use the Service.
      </p>

      <h2>2. Subscription & billing</h2>
      <p>
        Subscriptions are billed monthly in Kuwaiti Dinars per active seat. Fees are non-refundable
        except where required by law. Adding seats mid-cycle is prorated; downgrades take effect
        at the next renewal.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not upload data you have no right to process.</li>
        <li>Do not reverse-engineer, resell, or sublicense the Service.</li>
        <li>Do not use the Service to violate Kuwaiti law, Bar rules, or third-party rights.</li>
      </ul>

      <h2>4. Professional responsibility</h2>
      <p>
        AI outputs (drafts, briefings, citations) are drafting aids only. The reviewing lawyer
        remains fully responsible for the accuracy, legal quality, and filing of any document
        generated with the Service. The Service does not provide legal advice.
      </p>

      <h2>5. Data ownership</h2>
      <p>
        The Subscriber owns all firm and client data uploaded to the Service. We hold it as a
        processor and use it only to operate and improve the Service, as detailed in the Privacy
        Policy. We do not use Subscriber data to train AI models.
      </p>

      <h2>6. Availability</h2>
      <p>
        We target 99.5% monthly uptime excluding scheduled maintenance and force majeure.
        Planned maintenance is announced in-app in advance where possible.
      </p>

      <h2>7. Suspension & termination</h2>
      <p>
        We may suspend accounts for non-payment, abuse, or legal risk. Subscribers may terminate
        at any time from Settings; data export is available for 30 days after termination.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by Kuwaiti law, our aggregate liability is limited to
        fees paid by the Subscriber in the 12 months preceding the claim. We are not liable for
        indirect, incidental, or consequential damages, or for missed filing deadlines resulting
        from Subscriber's failure to review AI outputs or reminders.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Kuwait. Disputes shall be resolved
        by the competent Kuwaiti courts.
      </p>

      <h2>10. Contact</h2>
      <p>
        Contract queries: <a href="mailto:legal@qadiya.app">legal@qadiya.app</a>.
      </p>
    </>
  );
}

function ArabicTerms() {
  return (
    <>
      <h2>1. الاتفاقية</h2>
      <p>
        بإنشاء حساب أو استخدام منظومة قضية ("الخدمة") فإنك توافق على هذه الشروط نيابةً عن
        مكتبك ("المشترك"). إذا لم يكن لديك صلاحية إلزام المكتب، فلا تستخدم الخدمة.
      </p>

      <h2>2. الاشتراك والفوترة</h2>
      <p>
        الاشتراكات شهرية بالدينار الكويتي لكل مقعد فعّال. الرسوم غير مستردّة إلا فيما يقتضيه
        القانون. إضافة مقاعد خلال الدورة تُحتسب بالتناسب، وأي تخفيض يسري في الدورة التالية.
      </p>

      <h2>3. الاستخدام المقبول</h2>
      <ul>
        <li>لا تُحمِّل بيانات لا يحق لك معالجتها.</li>
        <li>يُحظر الهندسة العكسية أو إعادة البيع أو الترخيص من الباطن.</li>
        <li>لا يجوز استخدام الخدمة لمخالفة القانون الكويتي أو قواعد جمعية المحامين أو حقوق الغير.</li>
      </ul>

      <h2>4. المسؤولية المهنية</h2>
      <p>
        مخرجات الذكاء الاصطناعي (المسودات، الملخصات، الاستشهادات) أدوات مساعدة فقط. يبقى المحامي
        المُراجِع مسؤولًا كاملًا عن صحة أي مستند يتم إنتاجه بالخدمة وعن جودته القانونية وتقديمه.
        لا تُقدّم الخدمة استشارات قانونية.
      </p>

      <h2>5. ملكية البيانات</h2>
      <p>
        يملك المشترك جميع بيانات المكتب والموكلين المرفوعة على الخدمة. نحن نحتفظ بها بصفة مُعالِج
        ولا نستخدمها إلا لتشغيل الخدمة وتحسينها، وفق سياسة الخصوصية. لا نستخدم بياناتك لتدريب
        نماذج الذكاء الاصطناعي.
      </p>

      <h2>6. الإتاحة</h2>
      <p>
        نستهدف إتاحة 99.5% شهريًا مع استثناء الصيانة المجدولة والقوة القاهرة. يُعلَن عن الصيانة
        المجدولة داخل التطبيق مسبقًا كلما أمكن.
      </p>

      <h2>7. الإيقاف والإنهاء</h2>
      <p>
        يحق لنا إيقاف الحسابات لعدم السداد أو الإساءة أو المخاطر القانونية. يمكن للمشترك إنهاء
        الاشتراك متى شاء من الإعدادات، ويتوفر تصدير البيانات لمدة 30 يومًا بعد الإنهاء.
      </p>

      <h2>8. حدود المسؤولية</h2>
      <p>
        بأقصى ما يسمح به القانون الكويتي، تنحصر مسؤوليتنا الإجمالية في الرسوم المدفوعة من المشترك
        خلال 12 شهرًا سابقة للمطالبة. لا نتحمّل أي أضرار غير مباشرة أو تبعية، ولا مواعيد فائتة
        بسبب إخفاق المشترك في مراجعة مخرجات الذكاء الاصطناعي أو التذكيرات.
      </p>

      <h2>9. القانون الواجب التطبيق</h2>
      <p>
        تخضع هذه الشروط لقوانين دولة الكويت، وتختص المحاكم الكويتية بنظر أي نزاع.
      </p>

      <h2>10. للتواصل</h2>
      <p>
        استفسارات العقود: <a href="mailto:legal@qadiya.app">legal@qadiya.app</a>.
      </p>
    </>
  );
}
