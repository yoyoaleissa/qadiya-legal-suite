import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  Gavel,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { generateCaseReport } from "@/lib/report.functions";
import type { CaseReport } from "@/lib/report-types";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportView } from "./ReportView";
import { cn } from "@/lib/utils";

type Msg =
  | { role: "bot"; kind: "text"; text: string; textAr: string }
  | { role: "user"; kind: "text"; text: string }
  | { role: "bot"; kind: "loading" }
  | { role: "bot"; kind: "report"; report: CaseReport }
  | { role: "bot"; kind: "notfound"; caseNumber: string };

export function ReportBot() {
  const { t, lang } = useApp();
  const runReport = useServerFn(generateCaseReport);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      kind: "text",
      text: "Hello — I'm the Qadiya Report Bot. Send me a case number (e.g. 222486500) and I'll pull the latest status, timeline, and next steps from the Ministry of Justice.",
      textAr:
        "أهلاً — أنا بوت تقارير قضية. أرسل لي رقم قضية (مثلاً 222486500) وسأعرض لك آخر حالة والجدول الزمني والخطوات القادمة من وزارة العدل.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit(caseNumber: string) {
    const trimmed = caseNumber.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", kind: "text", text: trimmed },
      { role: "bot", kind: "loading" },
    ]);
    setInput("");
    try {
      const result = await runReport({ data: { caseNumber: trimmed } });
      setMessages((m) => {
        const withoutLoading = m.slice(0, -1);
        if (!result.found) {
          return [...withoutLoading, { role: "bot", kind: "notfound", caseNumber: trimmed }];
        }
        return [...withoutLoading, { role: "bot", kind: "report", report: result }];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI_ERROR";
      if (msg === "RATE_LIMIT") toast.error(t("Service busy — please retry shortly.", "الخدمة مشغولة، حاول بعد قليل."));
      else if (msg === "NO_CREDITS") toast.error(t("AI credits exhausted.", "نفدت أرصدة الذكاء الاصطناعي."));
      else toast.error(t("Couldn't generate the report.", "تعذّر إعداد التقرير."));
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "bot", kind: "notfound", caseNumber: trimmed },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([
      {
        role: "bot",
        kind: "text",
        text: "Hello — I'm the Qadiya Report Bot. Send me a case number (e.g. 222486500) and I'll pull the latest status, timeline, and next steps from the Ministry of Justice.",
        textAr:
          "أهلاً — أنا بوت تقارير قضية. أرسل لي رقم قضية (مثلاً 222486500) وسأعرض لك آخر حالة والجدول الزمني والخطوات القادمة من وزارة العدل.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="grid lg:grid-cols-[1fr,360px] gap-6">
      <Card className="flex flex-col h-[calc(100vh-11rem)] min-h-[640px] overflow-hidden pt-0 no-print">
        <div className="border-b bg-gradient-to-r from-navy to-navy/90 text-white px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gold text-navy flex items-center justify-center">
            <Gavel className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg leading-tight">
              {t("Report Bot", "بوت التقارير")}
            </div>
            <div className="text-xs text-white/70">
              {t(
                "Client-facing case status assistant · MOJ-connected",
                "مساعد حالة القضية للعميل · متصل بوزارة العدل",
              )}
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 me-1.5 inline-block" />
            {t("Live", "مباشر")}
          </Badge>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 bg-muted/30">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} onNew={reset} onTry={() => submit("222486500")} />
          ))}
        </div>

        <div className="border-t bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(
                "Type a case number (try 222486500)…",
                "اكتب رقم القضية (جرّب 222486500)…",
              )}
              inputMode="numeric"
              disabled={busy}
              className="flex-1"
            />
            <Button type="submit" disabled={busy || !input.trim()} className="gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              {t("Send", "إرسال")}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => submit("222486500")}
            disabled={busy}
            className="mt-2 text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent/20 hover:border-accent transition-colors disabled:opacity-50"
          >
            222486500 · {t("Closed case demo", "قضية مغلقة")}
          </button>
        </div>
      </Card>

      <div className="space-y-4 no-print">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-gold" />
              {t("How it works", "كيف يعمل")}
            </div>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal ps-5">
              <li>{t("Client sends a case number in Telegram / WhatsApp.", "يرسل العميل رقم القضية عبر تلغرام / واتساب.")}</li>
              <li>{t("Bot fetches the latest MOJ extract.", "يجلب البوت آخر بيانات وزارة العدل.")}</li>
              <li>{t("AI produces a bilingual, plain-language brief.", "يُولّد الذكاء الاصطناعي ملخصاً واضحاً بالعربية والإنجليزية.")}</li>
              <li>{t("Client downloads a branded PDF report.", "يحمّل العميل تقريراً بصيغة PDF بهوية المكتب.")}</li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="font-medium">{t("Why partners love it", "لماذا يفضّله الشركاء")}</div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> {t("Cuts 8+ status calls per associate per day.", "يقلل 8+ مكالمات استفسار يومياً لكل محامٍ.")}</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> {t("Never gives verdicts — only procedural facts.", "لا يُصدر أحكاماً — يعرض الوقائع الإجرائية فقط.")}</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" /> {t("Full Arabic + English out of the box.", "يدعم العربية والإنجليزية بالكامل.")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onNew, onTry }: { msg: Msg; onNew: () => void; onTry: () => void }) {
  const { t, lang } = useApp();
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-navy text-white px-4 py-2 text-sm shadow-sm" dir="ltr">
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.kind === "loading") {
    return (
      <BotWrap>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          {t("Fetching MOJ extract and generating report…", "جاري جلب البيانات وإعداد التقرير…")}
        </div>
      </BotWrap>
    );
  }
  if (msg.kind === "text") {
    return (
      <BotWrap>
        <p className="text-sm leading-relaxed">{lang === "ar" ? msg.textAr : msg.text}</p>
      </BotWrap>
    );
  }
  if (msg.kind === "notfound") {
    return (
      <BotWrap>
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger" />
          <div>
            <div className="font-medium">
              {t(`No case found for ${msg.caseNumber}`, `لم يتم العثور على قضية للرقم ${msg.caseNumber}`)}
            </div>
            <div className="text-muted-foreground mt-1">
              {t("Try 222486500 for the live seeded case.", "جرّب 222486500 للقضية المضافة في النظام.")}
            </div>
            <Button variant="outline" size="sm" onClick={onTry} className="mt-2">
              222486500
            </Button>
          </div>
        </div>
      </BotWrap>
    );
  }
  return (
    <BotWrap wide>
      <ReportView report={msg.report} onNew={onNew} />
    </BotWrap>
  );
}

function BotWrap({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-md bg-gold/20 border border-gold/40 flex items-center justify-center">
        <Gavel className="h-4 w-4 text-gold" />
      </div>
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm bg-card border shadow-sm px-4 py-3",
          wide ? "flex-1 max-w-full" : "max-w-[80%]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
