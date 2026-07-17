import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  BookOpen,
  Copy,
  Download,
  FileSignature,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import {
  DOC_TYPES,
  type DocType,
  draftLegalDocument,
  listCasesForDrafting,
  saveDraftAsNote,
  type DraftResult,
} from "@/lib/drafting.functions";

export const Route = createFileRoute("/_authenticated/drafting")({
  head: () => ({
    meta: [
      { title: "AI Drafting — Qadiya OS" },
      {
        name: "description",
        content:
          "Generate Kuwaiti-court-ready legal drafts grounded on your case data and the firm's knowledge base.",
      },
    ],
  }),
  component: DraftingPage,
});

const DOC_LABELS: Record<DocType, { en: string; ar: string }> = {
  memorandum: { en: "Legal Memorandum", ar: "مذكرة قانونية" },
  appeal_grounds: { en: "Grounds of Appeal", ar: "أسباب الاستئناف" },
  cassation_petition: { en: "Cassation Petition", ar: "طعن بالتمييز" },
  demand_letter: { en: "Demand Letter (Indhar)", ar: "إنذار قانوني" },
  response_memo: { en: "Reply Memorandum", ar: "مذكرة رد" },
  motion_for_evidence: { en: "Motion for Evidence", ar: "طلب إجراء تحقيق" },
  settlement_offer: { en: "Settlement Offer", ar: "عرض تسوية" },
};

function DraftingPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [docType, setDocType] = useState<DocType>("memorandum");
  const [caseId, setCaseId] = useState<string | "">("");
  const [tone, setTone] = useState<"formal" | "assertive" | "conciliatory">("formal");
  const [facts, setFacts] = useState("");
  const [result, setResult] = useState<DraftResult | null>(null);

  const runList = useServerFn(listCasesForDrafting);
  const runDraft = useServerFn(draftLegalDocument);
  const runSave = useServerFn(saveDraftAsNote);

  const { data: cases } = useQuery({
    queryKey: ["drafting-cases"],
    queryFn: () => runList(),
    staleTime: 30_000,
  });

  const generate = useMutation({
    mutationFn: () =>
      runDraft({
        data: {
          docType,
          caseId: caseId || null,
          additionalFacts: facts,
          language: lang,
          tone,
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      toast.success(tt("Draft ready.", "المسودة جاهزة."));
    },
    onError: (err) => {
      const msg = (err as Error).message;
      if (msg === "RATE_LIMIT")
        toast.error(tt("Too many requests — try again shortly.", "طلبات كثيرة — حاول بعد قليل."));
      else if (msg === "NO_CREDITS")
        toast.error(tt("AI credits exhausted.", "انتهى رصيد الذكاء الاصطناعي."));
      else toast.error(tt("Draft failed.", "فشل التوليد."));
    },
  });

  const save = useMutation({
    mutationFn: () => {
      if (!caseId || !result) throw new Error("no target");
      return runSave({ data: { caseId, content: result.content } });
    },
    onSuccess: () => toast.success(tt("Saved as case note.", "حُفظت كملاحظة قضية.")),
    onError: () => toast.error(tt("Could not save.", "تعذّر الحفظ.")),
  });

  const canSave = useMemo(() => !!caseId && !!result, [caseId, result]);

  const downloadMd = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
            <Wand2 className="h-3.5 w-3.5" />
            {tt("AI Drafting", "المسودة الذكية")}
          </div>
          <h1 className="mt-2 font-serif text-3xl font-semibold">
            {tt("Draft Kuwaiti court filings, grounded on your data", "صُغ مذكراتك أمام المحاكم الكويتية استناداً إلى بياناتك")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {tt(
              "Pick a document type and a case. The assistant pulls parties, hearings, and relevant Kuwaiti law passages from your knowledge base, then produces a review-ready draft with inline citations.",
              "اختر نوع المستند وقضية. يجلب المساعد الأطراف والجلسات ومقاطع القانون الكويتي ذات الصلة من قاعدة المعرفة، ثم يُنتج مسودة جاهزة للمراجعة بمراجع مضمنة.",
            )}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ── Left: controls ─────────────────────────────── */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {tt("Document type", "نوع المستند")}
                </label>
                <div className="mt-1 grid grid-cols-1 gap-1.5">
                  {DOC_TYPES.map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDocType(dt)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        docType === dt
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      <FileSignature className="h-3.5 w-3.5 shrink-0" />
                      <span className={lang === "ar" ? "font-arabic" : ""}>
                        {tt(DOC_LABELS[dt].en, DOC_LABELS[dt].ar)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  {tt("Case (optional)", "القضية (اختياري)")}
                </label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">{tt("— No case attached —", "— بدون قضية —")}</option>
                  {(cases ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number ?? "—"} · {tt(c.title ?? "", c.title_ar ?? c.title ?? "")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">{tt("Tone", "النبرة")}</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {(["formal", "assertive", "conciliatory"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                        tone === t
                          ? "border-gold bg-gold/10"
                          : "border-border bg-card text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      {t === "formal"
                        ? tt("Formal", "رسمي")
                        : t === "assertive"
                          ? tt("Assertive", "حازم")
                          : tt("Conciliatory", "مصالح")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  {tt("Additional facts / instructions", "وقائع أو تعليمات إضافية")}
                </label>
                <Textarea
                  value={facts}
                  onChange={(e) => setFacts(e.target.value)}
                  rows={7}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  placeholder={tt(
                    "e.g. Focus on the wrongful-dismissal ground under Art. 55 of the Labour Law; demand 6 months' salary and end-of-service.",
                    "مثال: التركيز على سبب الفصل التعسفي وفق المادة 55 من قانون العمل، والمطالبة براتب 6 أشهر ومكافأة نهاية الخدمة.",
                  )}
                  className={lang === "ar" ? "font-arabic" : ""}
                />
              </div>

              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="w-full gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
              >
                {generate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generate.isPending
                  ? tt("Drafting…", "جارٍ التوليد…")
                  : tt("Generate draft", "توليد المسودة")}
              </Button>
            </CardContent>
          </Card>

          {/* ── Right: draft + citations ─────────────────── */}
          <div className="space-y-4">
            {!result && !generate.isPending && (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Wand2}
                    title={tt("No draft yet", "لا توجد مسودة بعد")}
                    desc={tt(
                      "Pick a document type and click Generate. The knowledge base you uploaded in AI Assistant → Knowledge grounds the citations.",
                      "اختر نوع المستند ثم اضغط توليد. تعتمد المراجع على قاعدة المعرفة التي رفعتها في المساعد الذكي → المعرفة.",
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {generate.isPending && (
              <Card>
                <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  {tt(
                    "Retrieving authorities and drafting…",
                    "جارٍ استرجاع المراجع وصياغة المسودة…",
                  )}
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {result.caseSnapshot && (
                  <Card>
                    <CardContent className="pt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {result.caseSnapshot.caseNumber && (
                        <span>
                          {tt("Case", "القضية")}:{" "}
                          <span className="font-mono text-foreground">
                            {result.caseSnapshot.caseNumber}
                          </span>
                        </span>
                      )}
                      {result.caseSnapshot.clientName && (
                        <span>
                          {tt("Client", "الموكّل")}:{" "}
                          <span className="text-foreground">{result.caseSnapshot.clientName}</span>
                        </span>
                      )}
                      {result.caseSnapshot.nextHearing && (
                        <span>
                          {tt("Next hearing", "الجلسة القادمة")}:{" "}
                          <span className="text-foreground">
                            {new Date(result.caseSnapshot.nextHearing).toLocaleDateString(
                              lang === "ar" ? "ar-KW" : "en-GB",
                            )}
                          </span>
                        </span>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          navigator.clipboard.writeText(result.content);
                          toast.success(tt("Copied.", "نُسخ."));
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> {tt("Copy", "نسخ")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={downloadMd}
                      >
                        <Download className="h-3.5 w-3.5" /> {tt("Download .md", "تنزيل .md")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={!canSave || save.isPending}
                        onClick={() => save.mutate()}
                        title={
                          canSave
                            ? undefined
                            : tt(
                                "Attach a case to save as a case note.",
                                "أرفق قضية لحفظه كملاحظة.",
                              )
                        }
                      >
                        {save.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {tt("Save as case note", "حفظ كملاحظة")}
                      </Button>
                    </div>

                    <article
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      className={`prose prose-sm max-w-none dark:prose-invert prose-headings:font-serif prose-headings:text-foreground prose-strong:text-foreground ${
                        lang === "ar" ? "font-arabic" : ""
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                    </article>
                  </CardContent>
                </Card>

                {result.citations.length > 0 && (
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {tt("Cited authorities", "المراجع المستشهد بها")}
                      </div>
                      <div className="space-y-2">
                        {result.citations.map((c) => (
                          <div
                            key={c.index}
                            className="rounded-lg border bg-card px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono">
                                [{c.index}]
                              </Badge>
                              <span
                                className={`font-medium ${lang === "ar" ? "font-arabic" : ""}`}
                              >
                                {c.title}
                              </span>
                              <span className="ms-auto text-[10px] text-muted-foreground">
                                {Math.round(c.similarity * 100)}%
                              </span>
                            </div>
                            <p
                              className={`mt-1 text-xs text-muted-foreground line-clamp-3 ${
                                lang === "ar" ? "font-arabic" : ""
                              }`}
                              dir={lang === "ar" ? "rtl" : "ltr"}
                            >
                              {c.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    
  );
}
