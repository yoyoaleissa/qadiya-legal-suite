import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Sparkles, Upload, Trash2, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/lib/app-context";
import { DOCUMENT_TEMPLATES, type DocFields, type DocTemplate } from "@/lib/document-templates";
import { supabase } from "@/integrations/supabase/client";
import {
  listCaseDocuments,
  recordUploadedDocument,
  getDocumentDownloadUrl,
  deleteCaseDocument,
} from "@/lib/documents.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Qadiya OS" },
      {
        name: "description",
        content:
          "Upload, share and auto-generate court-ready legal documents for cases and clients in Arabic and English.",
      },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { lang, t } = useApp();
  const [openTpl, setOpenTpl] = useState<DocTemplate | null>(null);
  const fields = useMemo<DocFields>(
    () => ({
      date: new Date().toISOString().slice(0, 10),
      clientName: lang === "ar" ? "أحمد الصباح" : "Ahmad Al-Sabah",
      civilId: "282010100123",
      firmName: lang === "ar" ? "العدالة للمحاماة" : "Al-Adala Chambers",
      caseNumber: "222486500",
    }),
    [lang],
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("Documents", "المستندات")}
        </div>
        <h1 className="font-display text-3xl">{t("Documents", "المستندات")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Upload case files, share with clients, and auto-generate court-ready pleadings.",
            "ارفع ملفات القضايا، شاركها مع الموكّلين، وولّد المذكرات جاهزة للمحكمة.",
          )}
        </p>
      </div>

      <UploadedDocuments />

      <div>
        <h2 className="font-display text-xl mb-3">
          {t("Auto-generated templates", "قوالب التوليد التلقائي")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              className="hover:border-gold/60 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setOpenTpl(tpl)}
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-md bg-navy text-white dark:bg-gold dark:text-navy flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{templateCategory(tpl.id, lang)}</Badge>
                </div>
                <div className="mt-3 font-display text-lg">{tpl.name[lang]}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  5 {t("merge fields", "حقل دمج")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <PreviewDialog
        openTpl={openTpl}
        onOpenChange={(open) => !open && setOpenTpl(null)}
        fields={fields}
      />
    </div>
  );
}

function UploadedDocuments() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const runList = useServerFn(listCaseDocuments);
  const runRecord = useServerFn(recordUploadedDocument);
  const runUrl = useServerFn(getDocumentDownloadUrl);
  const runDelete = useServerFn(deleteCaseDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["case-documents"],
    queryFn: () => runList(),
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error(t("Max file size 25 MB", "الحد الأقصى 25 ميغابايت"));
      return;
    }
    setUploading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id ?? "anon";
      const { data: prof } = await supabase.from("profiles").select("firm_id").eq("id", uid).maybeSingle();
      const firmId = prof?.firm_id;
      if (!firmId) throw new Error(t("No firm on profile", "لا توجد شركة مرتبطة بالحساب"));
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${firmId}/${uid}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("case-documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      await runRecord({
        data: {
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          is_client_visible: false,
        },
      });
      toast.success(t("Uploaded", "تم الرفع"));
      qc.invalidateQueries({ queryKey: ["case-documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openFile = async (path: string) => {
    try {
      const { url } = await runUrl({ data: { storage_path: path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this document?", "حذف هذا المستند؟"))) return;
    try {
      await runDelete({ data: { id } });
      qc.invalidateQueries({ queryKey: ["case-documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const fmtSize = (b?: number | null) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl">{t("Uploaded documents", "المستندات المرفوعة")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("PDF, DOCX, JPG, PNG — up to 25 MB.", "PDF أو DOCX أو JPG أو PNG — حتى 25 ميغابايت.")}
            </p>
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={onFile}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? t("Uploading…", "جارٍ الرفع…") : t("Upload file", "رفع ملف")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (docs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("No documents uploaded yet.", "لم يتم رفع أي مستندات بعد.")}
          </p>
        ) : (
          <div className="divide-y">
            {(docs ?? []).map((d) => (
              <div key={d.id} className="py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                    {d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}
                  </div>
                </div>
                {d.is_client_visible ? (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Eye className="h-3 w-3" /> {t("Client", "الموكّل")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                    <EyeOff className="h-3 w-3" /> {t("Internal", "داخلي")}
                  </Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => openFile(d.storage_path)} aria-label="Download">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d.id)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewDialog({
  openTpl,
  onOpenChange,
  fields,
}: {
  openTpl: DocTemplate | null;
  onOpenChange: (v: boolean) => void;
  fields: DocFields;
}) {
  const { lang, t } = useApp();
  const doc = useMemo(() => openTpl?.render(fields, lang) ?? null, [openTpl, fields, lang]);
  const bodyDir = lang === "ar" ? "rtl" : "ltr";

  return (
    <Dialog open={!!openTpl} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            {t("Auto-fill preview", "معاينة التعبئة التلقائية")}
          </DialogTitle>
        </DialogHeader>

        {openTpl && doc && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{openTpl.name[lang]}</div>
            <div
              dir={bodyDir}
              lang={lang}
              className="print-area bg-white text-slate-900 p-6 border rounded-md text-[13px] leading-relaxed shadow-inner"
            >
              <div className="text-center font-display text-lg">{doc.title}</div>
              <div className="text-center text-xs text-slate-500 mb-4">
                {lang === "ar"
                  ? "مكتب العدالة للمحاماة · دولة الكويت"
                  : "Al-Adala Chambers · State of Kuwait"}
              </div>

              <div className={lang === "ar" ? "text-right font-arabic" : "text-left"}>
                {doc.blocks.map((block, i) => {
                  if (block.kind === "heading") {
                    return (
                      <h3 key={i} className="mt-4 font-semibold">
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.kind === "clause") {
                    return (
                      <p key={i} className="mt-3">
                        <span className="bg-gold/30 px-1 rounded">{block.index}</span> — {block.text}
                      </p>
                    );
                  }
                  if (block.kind === "signatures") {
                    return (
                      <div key={i} className="mt-6 grid grid-cols-2 gap-8 text-xs">
                        <div>{block.client}: __________</div>
                        <div>{block.firm}: __________</div>
                      </div>
                    );
                  }
                  return (
                    <p key={i} className={i === 0 ? "" : "mt-3"}>
                      {block.text}
                    </p>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("Close", "إغلاق")}
              </Button>
              <Button onClick={() => window.print()}>
                {t("Generate document", "توليد المستند")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function templateCategory(id: string, lang: "en" | "ar") {
  if (id === "power_of_attorney") return lang === "ar" ? "توكيل" : "Authority";
  if (id === "retainer_agreement") return lang === "ar" ? "عقود" : "Contracts";
  return lang === "ar" ? "مذكرات" : "Pleadings";
}
