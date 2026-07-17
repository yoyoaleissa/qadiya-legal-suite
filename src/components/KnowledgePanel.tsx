import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, FileText, Loader2, Trash2, Upload, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { ingestKnowledge, listKnowledge, deleteKnowledge } from "@/lib/knowledge.functions";

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    text += line + "\n\n";
  }
  return text.trim();
}

export function KnowledgePanel({
  tt,
  lang,
}: {
  tt: (en: string, ar: string) => string;
  lang: "en" | "ar";
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"firm" | "global">("firm");
  const [ingesting, setIngesting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const runIngest = useServerFn(ingestKnowledge);
  const runList = useServerFn(listKnowledge);
  const runDelete = useServerFn(deleteKnowledge);
  const qc = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: () => runList(),
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      if (!text.trim()) {
        toast.error(
          tt("No readable text found in that file.", "لم يُعثر على نص قابل للقراءة في الملف."),
        );
        return;
      }
      setContent(text);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast.success(
        tt("Document loaded — review and upload.", "تم تحميل المستند — راجعه ثم ارفعه."),
      );
    } catch {
      toast.error(tt("Could not read that file.", "تعذّرت قراءة الملف."));
    } finally {
      setParsing(false);
    }
  };

  const handleIngest = async () => {
    if (!title.trim() || !content.trim()) return;
    setIngesting(true);
    try {
      const res = await runIngest({ data: { title: title.trim(), content, scope } });
      toast.success(tt(`Indexed ${res.chunks} passage(s).`, `تمت فهرسة ${res.chunks} مقطع.`));
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "RATE_LIMIT")
        toast.error(tt("Too many requests — try again shortly.", "طلبات كثيرة — حاول بعد قليل."));
      else if (msg === "NO_CREDITS")
        toast.error(tt("AI credits exhausted.", "انتهى رصيد الذكاء الاصطناعي."));
      else toast.error(tt("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (t: string) => {
    try {
      await runDelete({ data: { title: t } });
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(tt("Removed from knowledge base.", "تمت الإزالة من قاعدة المعرفة."));
    } catch {
      toast.error(tt("Could not remove.", "تعذّرت الإزالة."));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 h-full overflow-y-auto pb-2">
      {/* Upload form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
            <UploadCloud className="h-3.5 w-3.5" />
            {tt("Upload Knowledge", "رفع المعرفة")}
          </div>
          <p className="text-sm text-muted-foreground">
            {tt(
              "Add Kuwaiti law texts, firm briefs, or precedent notes. Content is chunked, embedded, and used to ground the assistant's answers.",
              "أضف نصوص القانون الكويتي أو مذكرات المكتب أو ملاحظات السوابق. يُقسَّم المحتوى ويُفهرَس ويُستخدم لإسناد إجابات المساعد.",
            )}
          </p>

          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Title / Source", "العنوان / المصدر")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tt("e.g. Labour Law No. 6/2010", "مثال: قانون العمل رقم 6/2010")}
              className={lang === "ar" ? "font-arabic" : ""}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Visibility", "النطاق")}
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("firm")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  scope === "firm"
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-gold/40"
                }`}
              >
                <div className="font-medium">{tt("My firm only", "مكتبي فقط")}</div>
                <div className="text-[11px]">
                  {tt("Private briefs, memos, precedents", "مذكرات وسوابق خاصة")}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScope("global")}
                disabled
                title={tt(
                  "Only Qadiya editors can add to the shared corpus.",
                  "لا يمكن إضافة المحتوى العام إلا من محرري قضية.",
                )}
                className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground opacity-70 cursor-not-allowed"
              >
                <div className="font-medium">{tt("Shared corpus", "المحتوى العام")}</div>
                <div className="text-[11px]">
                  {tt("Kuwaiti laws — curated by Qadiya", "قوانين كويتية — يديرها قضية")}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Or upload a file (PDF, TXT, MD)", "أو ارفع ملفاً (PDF، TXT، MD)")}
            </label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-sm text-muted-foreground hover:border-gold/50 hover:bg-accent/30 transition-colors">
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {tt("Reading file…", "جارٍ قراءة الملف…")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> {tt("Choose file", "اختر ملفاً")}
                </>
              )}
              <input
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={parsing || ingesting}
              />
            </label>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{tt("Content", "المحتوى")}</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              dir={lang === "ar" ? "rtl" : "ltr"}
              placeholder={tt(
                "Paste or edit the document text here…",
                "الصق نص المستند أو حرّره هنا…",
              )}
              className={lang === "ar" ? "font-arabic" : ""}
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              {content.length.toLocaleString()} {tt("characters", "حرف")}
            </div>
          </div>

          <Button
            onClick={handleIngest}
            disabled={!title.trim() || !content.trim() || ingesting || parsing}
            className="w-full gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
          >
            {ingesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {ingesting
              ? tt("Indexing…", "جارٍ الفهرسة…")
              : tt("Add to Knowledge Base", "أضف إلى قاعدة المعرفة")}
          </Button>
        </CardContent>
      </Card>

      {/* Existing sources */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            {tt("Knowledge Base", "قاعدة المعرفة")}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tt("Loading…", "جارٍ التحميل…")}
            </div>
          ) : (sources ?? []).length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={tt("No documents yet", "لا توجد مستندات بعد")}
              desc={tt(
                "Upload your first legal document to ground the assistant.",
                "ارفع أول مستند قانوني لإسناد المساعد.",
              )}
            />
          ) : (
            <div className="space-y-2">
              {(sources ?? []).map((s) => (
                <div
                  key={`${s.scope}-${s.title}`}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-md bg-gold/15 text-gold flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                        {s.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          s.scope === "global"
                            ? "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.scope === "global" ? tt("Shared", "عام") : tt("Firm", "مكتب")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.chunks} {tt("passages", "مقطع")} ·{" "}
                      {new Date(s.created_at).toLocaleDateString(lang === "ar" ? "ar-KW" : "en-GB")}
                    </div>
                  </div>
                  {s.scope === "firm" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(s.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
