import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Bot, Scale, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";
import { generateCaseReport } from "@/lib/report.functions";
import type { CaseReport } from "@/lib/report-types";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportView } from "./ReportView";
import { cn } from "@/lib/utils";

type Msg = { role: "bot" | "user"; text: string };

export function ReportBot() {
  const { lang, t } = useApp();
  const runReport = useServerFn(generateCaseReport);

  const greeting =
    lang === "ar"
      ? "مرحباً 👋 أنا مساعد قضية OS. أدخل رقم قضيتك وسأعدّ لك تقريراً فورياً بحالتها."
      : "Hi 👋 I'm the Qadiya OS assistant. Enter your case number and I'll prepare an instant status report.";

  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CaseReport | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Reset greeting when language changes and no report yet
  useEffect(() => {
    setMessages((prev) => (prev.length === 1 ? [{ role: "bot", text: greeting }] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [report, loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function lookup(caseNumber: string) {
    const trimmed = caseNumber.trim();
    if (!trimmed || loading) return;
    setReport(null);
    setNotFound(null);
    setMessages((p) => [...p, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const result = await runReport({ data: { caseNumber: trimmed } });
      if (!result.found) {
        setNotFound(trimmed);
        setMessages((p) => [...p, { role: "bot", text: t("not_found_desc") }]);
      } else {
        setReport(result);
        setMessages((p) => [
          ...p,
          {
            role: "bot",
            text: lang === "ar" ? "تم إعداد تقريرك ✅ يمكنك مراجعته وتحميله أدناه." : "Your report is ready ✅ Review and download it below.",
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI_ERROR";
      if (msg === "RATE_LIMIT") toast.error(lang === "ar" ? "الخدمة مشغولة، حاول بعد قليل." : "Service busy — please retry shortly.");
      else if (msg === "NO_CREDITS") toast.error(lang === "ar" ? "نفدت أرصدة الذكاء الاصطناعي." : "AI credits exhausted.");
      else toast.error(lang === "ar" ? "تعذّر إعداد التقرير." : "Couldn't generate the report.");
      setMessages((p) => [...p, { role: "bot", text: t("not_found_desc") }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setReport(null);
    setNotFound(null);
    setMessages([{ role: "bot", text: greeting }]);
    setInput("");
  }

  return (
    <div className="space-y-6">
      {/* Chat widget */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevate no-print">
        <div className="flex items-center gap-2.5 border-b border-border bg-gradient-hero px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
            <Bot className="h-4 w-4 text-accent" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-primary-foreground">{t("report_bot")}</p>
            <p className="text-[11px] text-primary-foreground/70">{t("powered")}</p>
          </div>
        </div>

        <div className="max-h-[320px] space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-ee-sm bg-primary text-primary-foreground"
                    : "rounded-es-sm bg-muted text-foreground",
                )}
                dir={m.role === "user" ? "ltr" : undefined}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-es-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("generating")}
              </div>
            </div>
          )}
          {notFound && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-2 rounded-2xl rounded-es-sm border border-border bg-background px-3.5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SearchX className="h-4 w-4 text-destructive" /> {t("not_found_title")}
                </div>
                <Button variant="outline" size="sm" onClick={() => lookup("222486500")}>
                  {t("try_example")}
                </Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("enter_case")}
            dir="ltr"
            inputMode="numeric"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label={t("generate_report")}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Hint chips */}
      {!report && !loading && (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs text-muted-foreground">
            <Scale className="me-1 inline h-3.5 w-3.5" />
            {lang === "ar" ? "جرّب:" : "Try:"}
          </span>
          <button
            onClick={() => lookup("222486500")}
            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            dir="ltr"
          >
            222486500
          </button>
        </div>
      )}

      {report && <ReportView report={report} onNew={reset} />}
    </div>
  );
}
