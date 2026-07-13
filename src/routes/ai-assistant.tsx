import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, BookOpen, Scale, Search, Shield } from "lucide-react";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Legal Assistant — Qadiya OS" },
      { name: "description", content: "A private RAG legal assistant trained on your firm's archive and Kuwaiti law — coming soon." },
    ],
  }),
  component: AiAssistantPage,
});

function AiAssistantPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-gold">{tt("Coming Soon", "قريباً")}</div>
        <h1 className="font-display text-3xl">{tt("AI Legal Assistant", "المساعد القانوني الذكي")}</h1>
      </div>

      <Card className="border-gold/40 bg-gradient-to-br from-navy to-navy/80 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--gold),transparent_60%)]" />
        <CardContent className="pt-8 pb-8 relative">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-lg bg-gold text-navy flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <Badge className="bg-gold text-navy mb-2">Q4 2026</Badge>
              <h2 className="font-display text-2xl">
                {tt("A private RAG assistant trained on your firm's memory.", "مساعد ذكاء اصطناعي خاص مدرّب على أرشيف مكتبك.")}
              </h2>
              <p className="text-white/75 mt-3 max-w-2xl">
                {tt(
                  "Ask questions in Arabic or English. Get cited answers from Kuwaiti law, your past pleadings, and every closed matter in your archive — never sent to a public model.",
                  "اطرح أسئلتك بالعربية أو الإنجليزية، واحصل على إجابات مُوثّقة من التشريعات الكويتية ومذكراتك السابقة وكامل أرشيف قضاياك — دون إرسال أي بيانات لنماذج عامة.",
                )}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={BookOpen} title={tt("Kuwaiti law corpus", "التشريعات الكويتية")} desc={tt("Civil, commercial, penal, procedural.", "المدني، التجاري، الجزائي، الإجرائي.")} />
            <Feature icon={Scale} title={tt("Case law", "أحكام قضائية")} desc={tt("Cassation precedents indexed.", "أحكام التمييز مفهرسة.")} />
            <Feature icon={Search} title={tt("Firm archive", "أرشيف المكتب")} desc={tt("Every pleading you've filed.", "كل مذكرة قدّمها المكتب.")} />
            <Feature icon={Shield} title={tt("Private by default", "خصوصية افتراضية")} desc={tt("On-premise deployment option.", "خيار النشر داخلياً.")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-display text-lg mb-3">{tt("Example prompts", "أمثلة على الأوامر")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>&ldquo;{tt("Summarize the cassation precedent for wrongful dismissal in the last 5 years.", "لخّص أحكام التمييز في الفصل التعسفي خلال 5 سنوات.")}&rdquo;</li>
            <li>&ldquo;{tt("Draft the grounds for appeal in case 812/2026 based on our internal notes.", "صُغ أسباب استئناف القضية 812/2026 استناداً إلى ملاحظاتنا الداخلية.")}&rdquo;</li>
            <li>&ldquo;{tt("Find every clause in our contracts that references force majeure.", "أوجد كل بنود القوة القاهرة في عقودنا.")}&rdquo;</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Lock; title: string; desc: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <Icon className="h-4 w-4 text-gold" />
      <div className="mt-2 font-medium text-sm">{title}</div>
      <div className="text-xs text-white/60 mt-1">{desc}</div>
    </div>
  );
}
