import { Download, RotateCcw, Scale, Info } from "lucide-react";
import type { CaseReport } from "@/lib/report-types";
import { COURT_LEVEL_LABELS, useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { DeadlineCard } from "./DeadlineCard";
import { CaseTimeline } from "./CaseTimeline";
import { FullDetails } from "./FullDetails";
import { formatDate } from "./format";

export function ReportView({ report, onNew }: { report: CaseReport; onNew: () => void }) {
  const { lang, t } = useApp();
  const headline = lang === "ar" ? report.status_headline_ar : report.status_headline_en;
  const stageLabel = report.current_stage
    ? COURT_LEVEL_LABELS[report.current_stage]?.[lang]
    : null;

  return (
    <div className="space-y-5">
      {/* action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <p className="text-sm text-muted-foreground">
          {t("case_number")}: <span dir="ltr" className="font-semibold text-foreground">{report.case_number}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onNew} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> {t("new_lookup")}
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5">
            <Download className="h-4 w-4" /> {t("download_pdf")}
          </Button>
        </div>
      </div>

      <div className="print-area space-y-5 rounded-2xl border border-border bg-card p-5 shadow-elevate sm:p-7">
        {/* print-only letterhead */}
        <div className="mb-2 hidden items-center justify-between border-b border-border pb-4 print:flex">
          <BrandMark />
          <span className="text-xs text-muted-foreground">{formatDate(new Date().toISOString().slice(0, 10), lang)}</span>
        </div>

        {/* a. Status headline */}
        <div className="rounded-xl bg-gradient-hero p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
            <Scale className="h-4 w-4" /> {t("status")}
          </div>
          <h2 className="mt-1.5 font-display text-2xl font-semibold leading-snug text-primary-foreground">
            {headline}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {stageLabel && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                {t("level")}: {stageLabel}
              </span>
            )}
            {report.case_type && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                {lang === "ar" ? report.case_type_ar ?? report.case_type : report.case_type}
              </span>
            )}
          </div>
        </div>

        {/* b. Bilingual summary */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t("summary")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div dir="en" className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">English</p>
              <p className="text-sm leading-relaxed text-foreground" style={{ fontFamily: "var(--font-sans)", direction: "ltr", textAlign: "start" }}>
                {report.summary_en}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">العربية</p>
              <p className="text-sm leading-relaxed text-foreground" style={{ fontFamily: "var(--font-arabic)", direction: "rtl", textAlign: "start" }}>
                {report.summary_ar}
              </p>
            </div>
          </div>
        </section>

        {/* c. Next deadline */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t("next_deadline")}</h3>
          <DeadlineCard deadline={report.deadline} />
        </section>

        {/* d. What this means */}
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-accent-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("what_it_means")}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {lang === "ar" ? report.recommendation_ar : report.recommendation_en}
          </p>
        </section>

        {/* e. Visual timeline */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("timeline")}</h3>
          <CaseTimeline timeline={report.timeline} currentStage={report.current_stage} />
        </section>

        {/* f. Full details */}
        <section>
          <FullDetails report={report} />
        </section>

        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("disclaimer")} · {t("powered")}
        </p>
      </div>
    </div>
  );
}
