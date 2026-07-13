import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { formatDate } from "@/components/report/format";
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
  const { lang, t, dir } = useApp();
  const [selected, setSelected] = useState<DocTemplate>(DOCUMENT_TEMPLATES[0]);
  const [preview, setPreview] = useState(false);
  const [fields, setFields] = useState<DocFields>({
    date: new Date().toISOString().slice(0, 10),
    clientName: lang === "ar" ? "عبدالله محمد العتيبي" : "Abdullah M. Al-Otaibi",
    civilId: "290011500123",
    firmName: lang === "ar" ? "مكتب قضية للمحاماة" : "Qadiya Law Firm",
    caseNumber: "222486500",
  });

  const setField = (key: keyof DocFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const fieldDefs: { key: keyof DocFields; label: string; type?: string; ltr?: boolean }[] = [
    { key: "date", label: t("date"), type: "date", ltr: true },
    { key: "clientName", label: t("client_name") },
    { key: "civilId", label: t("civil_id"), ltr: true },
    { key: "firmName", label: t("firm_name") },
    { key: "caseNumber", label: t("case_number"), ltr: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground">{t("documents")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("documents_desc")}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Template picker */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("choose_template")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {DOCUMENT_TEMPLATES.map((tpl) => {
                const active = tpl.id === selected.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelected(tpl)}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-card p-5 text-start shadow-elevate transition-colors",
                      active ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent/50",
                    )}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
                      <FileText className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-foreground">{tpl.name[lang]}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {tpl.description[lang]}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Field form */}
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-elevate">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {selected.name[lang]}
            </h2>
            <div className="space-y-4">
              {fieldDefs.map((fd) => (
                <div key={fd.key} className="space-y-1.5">
                  <Label htmlFor={fd.key}>{fd.label}</Label>
                  <Input
                    id={fd.key}
                    type={fd.type ?? "text"}
                    dir={fd.ltr ? "ltr" : dir}
                    value={fields[fd.key]}
                    onChange={(e) => setField(fd.key, e.target.value)}
                  />
                </div>
              ))}
              <Button className="w-full gap-1.5" onClick={() => setPreview(true)}>
                <Sparkles className="h-4 w-4" /> {t("autofill_preview")}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <PreviewDialog
        open={preview}
        onOpenChange={setPreview}
        template={selected}
        fields={fields}
      />
    </div>
  );
}

function PreviewDialog({
  open,
  onOpenChange,
  template,
  fields,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: DocTemplate;
  fields: DocFields;
}) {
  const { lang, t } = useApp();
  // The document body follows the app language: Arabic body + RTL when
  // Arabic is active, English body + LTR otherwise.
  const doc = useMemo(() => template.render(fields, lang), [template, fields, lang]);
  const bodyDir = lang === "ar" ? "rtl" : "ltr";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("autofill_preview")}</DialogTitle>
        </DialogHeader>

        <div
          dir={bodyDir}
          lang={lang}
          className={cn(
            "print-area space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8",
            lang === "ar" ? "text-right font-arabic" : "text-left",
          )}
        >
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <BrandMark />
            <span className="text-xs text-muted-foreground" dir="ltr">
              {formatDate(fields.date, lang)}
            </span>
          </div>

          <h2 className="text-center font-display text-2xl font-semibold text-foreground">
            {doc.title}
          </h2>

          {doc.blocks.map((block, i) => {
            if (block.kind === "heading") {
              return (
                <h3 key={i} className="pt-2 text-lg font-semibold text-foreground">
                  {block.text}
                </h3>
              );
            }
            if (block.kind === "clause") {
              return (
                <p key={i} className="flex gap-2 leading-relaxed text-foreground/90">
                  <span className="font-semibold text-accent-foreground">{block.index}.</span>
                  <span>{block.text}</span>
                </p>
              );
            }
            if (block.kind === "signatures") {
              return (
                <div key={i} className="mt-8 grid gap-8 pt-4 sm:grid-cols-2">
                  <div className="border-t border-border pt-2 text-sm text-foreground">{block.client}</div>
                  <div className="border-t border-border pt-2 text-sm text-foreground">{block.firm}</div>
                </div>
              );
            }
            return (
              <p key={i} className="leading-relaxed text-foreground/90">
                {block.text}
              </p>
            );
          })}
        </div>

        <DialogFooter className="no-print gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
          <Button className="gap-1.5" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> {t("generate_document")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
