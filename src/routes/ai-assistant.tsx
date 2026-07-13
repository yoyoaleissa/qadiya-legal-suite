import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  BookOpen,
  Scale,
  Search,
  Shield,
  Send,
  Sparkles,
  User,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Legal Assistant — Qadiya OS" },
      {
        name: "description",
        content:
          "A bilingual AI legal assistant grounded on your firm's cases and Kuwaiti law — draft, research, and reason in Arabic or English.",
      },
    ],
  }),
  component: AiAssistantPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS: { en: string; ar: string }[] = [
  {
    en: "Summarize the cassation precedent for wrongful dismissal in the last 5 years.",
    ar: "لخّص أحكام التمييز في الفصل التعسفي خلال آخر 5 سنوات.",
  },
  {
    en: "What is the appeal deadline after a first-instance judgment in Kuwait?",
    ar: "ما هو ميعاد الاستئناف بعد صدور حكم أول درجة في الكويت؟",
  },
  {
    en: "Draft grounds of appeal outline for an estate-division dispute.",
    ar: "صُغ مسودة أسباب استئناف في نزاع قسمة تركة.",
  },
  {
    en: "Which of our open matters have the nearest deadlines?",
    ar: "أي من قضايانا المفتوحة له أقرب المواعيد؟",
  },
];

function AiAssistantPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const code = await res.text().catch(() => "");
        setMessages((m) => m.slice(0, -1));
        if (res.status === 429 || code === "RATE_LIMIT")
          setError(tt("Too many requests — please wait a moment and try again.", "طلبات كثيرة — يُرجى الانتظار قليلاً ثم المحاولة."));
        else if (res.status === 402 || code === "NO_CREDITS")
          setError(tt("AI credits are exhausted. Please top up to continue.", "انتهى رصيد الذكاء الاصطناعي. يُرجى إعادة الشحن للمتابعة."));
        else
          setError(tt("The assistant is unavailable right now. Please try again.", "المساعد غير متاح حالياً. يُرجى المحاولة مرة أخرى."));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta: string = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + delta,
                };
                return copy;
              });
            }
          } catch {
            /* ignore partial chunk */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
        setError(tt("Connection interrupted. Please try again.", "انقطع الاتصال. يُرجى المحاولة مرة أخرى."));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  const hasChat = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px]">
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold">{tt("Powered by Qadiya AI", "مدعوم بذكاء قضية")}</div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <span className={lang === "ar" ? "font-arabic" : ""}>{tt("AI Legal Assistant", "المساعد القانوني الذكي")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt(
              "Grounded on your firm's live matters and Kuwaiti law. Ask in Arabic or English.",
              "مرتبط بقضايا مكتبك المباشرة والتشريعات الكويتية. اسأل بالعربية أو الإنجليزية.",
            )}
          </p>
        </div>
        {hasChat && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => { stop(); setMessages([]); setError(null); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            {tt("New chat", "محادثة جديدة")}
          </Button>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!hasChat ? (
            <Welcome tt={tt} lang={lang} onPick={send} />
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} lang={lang} streaming={streaming && i === messages.length - 1} tt={tt} />)
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="border-t bg-card p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              dir={lang === "ar" ? "rtl" : "ltr"}
              placeholder={tt("Ask about a case, deadline, or draft a document…", "اسأل عن قضية أو ميعاد أو صياغة مستند…")}
              className={cn(
                "flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-sm max-h-40 focus:outline-none focus:ring-1 focus:ring-gold",
                lang === "ar" ? "font-arabic" : "",
              )}
            />
            {streaming ? (
              <Button type="button" variant="outline" size="icon" onClick={stop} className="shrink-0 h-11 w-11">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} className="shrink-0 h-11 w-11 bg-navy text-white dark:bg-gold dark:text-navy">
                <Send className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            )}
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {tt(
              "Qadiya AI can make mistakes — verify against primary sources.",
              "قد يخطئ ذكاء قضية — يُرجى التحقق من المصادر الأصلية.",
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}

function Welcome({
  tt,
  lang,
  onPick,
}: {
  tt: (en: string, ar: string) => string;
  lang: "en" | "ar";
  onPick: (t: string) => void;
}) {
  const features = [
    { icon: BookOpen, en: "Kuwaiti law corpus", ar: "التشريعات الكويتية", den: "Civil, commercial, penal, procedural.", dar: "المدني، التجاري، الجزائي، الإجرائي." },
    { icon: Scale, en: "Case law", ar: "الأحكام القضائية", den: "Cassation precedents & reasoning.", dar: "سوابق التمييز والتسبيب." },
    { icon: Search, en: "Your live matters", ar: "قضاياك المباشرة", den: "Answers grounded on your backend.", dar: "إجابات مرتبطة بخادمك المباشر." },
    { icon: Shield, en: "Professional grade", ar: "مستوى احترافي", den: "Built for lawyers, not the public.", dar: "مصمّم للمحامين لا للعامة." },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gold/40 bg-gradient-to-br from-navy to-navy/80 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,var(--gold),transparent_60%)]" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gold text-navy flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl">
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {tt("Your senior legal counsel, on demand.", "مستشارك القانوني الأول، عند الطلب.")}
              </span>
            </h2>
            <p className="text-white/75 text-sm mt-2 max-w-2xl">
              {tt(
                "Research Kuwaiti law, draft pleadings, analyze precedent, and reason over your firm's actual cases — bilingual and instant.",
                "ابحث في التشريعات الكويتية، وصُغ المذكرات، وحلّل السوابق، وحلّل قضايا مكتبك الفعلية — بلغتين وبشكل فوري.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.en} className="rounded-lg border bg-card p-4">
            <f.icon className="h-4 w-4 text-gold" />
            <div className="mt-2 font-medium text-sm">
              <span className={lang === "ar" ? "font-arabic" : ""}>{tt(f.en, f.ar)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className={lang === "ar" ? "font-arabic" : ""}>{tt(f.den, f.dar)}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{tt("Try asking", "جرّب أن تسأل")}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(tt(s.en, s.ar))}
              className="group flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-start text-sm transition-colors hover:border-gold/50 hover:bg-accent/40"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" />
              <span className={lang === "ar" ? "font-arabic" : ""}>{tt(s.en, s.ar)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  lang,
  streaming,
  tt,
}: {
  message: ChatMessage;
  lang: "en" | "ar";
  streaming: boolean;
  tt: (en: string, ar: string) => string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
          isUser ? "bg-muted text-muted-foreground" : "bg-navy text-white dark:bg-gold dark:text-navy",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-navy text-white dark:bg-gold dark:text-navy" : "bg-muted/60 border",
        )}
      >
        {isUser ? (
          <span className={lang === "ar" ? "font-arabic whitespace-pre-wrap" : "whitespace-pre-wrap"}>{message.content}</span>
        ) : message.content ? (
          <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-p:my-2 prose-ul:my-2 prose-li:my-0.5", lang === "ar" && "font-arabic")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {tt("Thinking…", "جارٍ التفكير…")}
          </span>
        )}
        {!isUser && streaming && message.content && (
          <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-gold animate-pulse" />
        )}
      </div>
    </div>
  );
}
