import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/app-context";
import { DOCUMENT_TEMPLATES, type DocFields, type DocTemplate } from "@/lib/document-templates";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Document Generation — Qadiya OS" },
      {
        name: "description",
        content:
          "Generate court-ready legal documents auto-filled from case and client data, in Arabic and English.",
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
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("Automation", "الأتمتة")}</div>
        <h1 className="font-display text-3xl">{t("Document Generation", "توليد المستندات")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("Auto-fill any template with client and matter data.", "تعبئة تلقائية لأي قالب ببيانات العميل والقضية.")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className="hover:border-gold/60 hover:shadow-md transition-all cursor-pointer" onClick={() => setOpenTpl(tpl)}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-md bg-navy text-white dark:bg-gold dark:text-navy flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <Badge variant="outline">{templateCategory(tpl.id, lang)}</Badge>
              </div>
              <div className="mt-3 font-display text-lg">{tpl.name[lang]}</div>
              <div className="text-xs text-muted-foreground mt-1">5 {t("merge fields", "حقل دمج")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PreviewDialog openTpl={openTpl} onOpenChange={(open) => !open && setOpenTpl(null)} fields={fields} />
    </div>
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
                {lang === "ar" ? "مكتب العدالة للمحاماة · دولة الكويت" : "Al-Adala Chambers · State of Kuwait"}
              </div>

              <div className={lang === "ar" ? "text-right font-arabic" : "text-left"}>
                {doc.blocks.map((block, i) => {
                  if (block.kind === "heading") {
                    return <h3 key={i} className="mt-4 font-semibold">{block.text}</h3>;
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
                  return <p key={i} className={i === 0 ? "" : "mt-3"}>{block.text}</p>;
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("Close", "إغلاق")}</Button>
              <Button onClick={() => window.print()}>{t("Generate document", "توليد المستند")}</Button>
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
