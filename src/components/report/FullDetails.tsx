import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CaseReport } from "@/lib/report-types";
import { COURT_LEVEL_LABELS, useApp } from "@/lib/app-context";
import { formatDate, formatKwd } from "./format";
import { CourtMapLink } from "@/components/CourtMapLink";
import { AllDeadlines } from "@/components/DeadlineAlert";

export function FullDetails({ report }: { report: CaseReport }) {
  const { lang, t } = useApp();
  const levelLabel = (k: string) => COURT_LEVEL_LABELS[k]?.[lang] ?? k;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="details" className="rounded-xl border border-border bg-card px-4">
        <AccordionTrigger className="text-sm font-semibold">{t("full_details")}</AccordionTrigger>
        <AccordionContent className="space-y-6 pb-5">
          {/* Court levels */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("court_levels")}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("level")}</TableHead>
                    <TableHead>{t("court")}</TableHead>
                    <TableHead>{t("reference")}</TableHead>
                    <TableHead>{t("registered")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.court_levels.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{levelLabel(l.level)}</TableCell>
                      <TableCell>
                        {l.court_name ? <CourtMapLink courtName={l.court_name} /> : "—"}
                      </TableCell>
                      <TableCell dir="ltr">{l.case_ref ?? "—"}</TableCell>
                      <TableCell>{formatDate(l.registered_date, lang)}</TableCell>
                      <TableCell>{l.status ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Judgments */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("judgments")}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("level")}</TableHead>
                    <TableHead>{t("ruling")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("payment")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.judgments.map((j, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(j.judgment_date, lang)}</TableCell>
                      <TableCell>{levelLabel(j.level)}</TableCell>
                      <TableCell className="max-w-[220px]">{j.ruling_text ?? "—"}</TableCell>
                      <TableCell>{j.judgment_type ?? "—"}</TableCell>
                      <TableCell>{formatKwd(j.amount, lang)}</TableCell>
                      <TableCell>{j.payment_status ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {(() => {
              const latest = [...report.judgments]
                .filter((j) => j.judgment_date)
                .sort((a, b) => (b.judgment_date ?? "").localeCompare(a.judgment_date ?? ""))[0];
              if (!latest?.judgment_date) return null;
              return (
                <div className="mt-4">
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === "ar"
                      ? "المواعيد المحسوبة من تاريخ الحكم"
                      : "Deadlines from judgment date"}
                  </h5>
                  <AllDeadlines
                    judgmentDate={new Date(latest.judgment_date)}
                    caseTitle={report.case_number}
                  />
                </div>
              );
            })()}
          </section>

          {/* Hearings */}
          {report.hearings.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("sessions")}
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("level")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.hearings.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatDate(h.session_date, lang)}</TableCell>
                        <TableCell>{h.level ? levelLabel(h.level) : "—"}</TableCell>
                        <TableCell>{h.status ?? h.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {/* Execution */}
          {report.executions.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("execution")}
              </h4>
              <div className="space-y-3">
                {report.executions.map((ex, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>
                        <span className="text-muted-foreground">{t("reference")}: </span>
                        <span dir="ltr" className="font-medium">
                          {ex.file_number ?? "—"}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">{t("court")}: </span>
                        <span className="font-medium">{ex.jurisdiction ?? "—"}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">{t("registered")}: </span>
                        <span className="font-medium">{formatDate(ex.opened_date, lang)}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">{t("status")}: </span>
                        <span className="font-medium">{ex.status ?? "—"}</span>
                      </span>
                    </div>
                    {ex.receipts.length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {t("receipts")}
                        </p>
                        <ul className="space-y-1">
                          {ex.receipts.map((r, ri) => (
                            <li
                              key={ri}
                              className="flex justify-between rounded bg-muted/50 px-3 py-1.5 text-sm"
                            >
                              <span>{formatDate(r.receipt_date, lang)}</span>
                              <span className="font-semibold">{formatKwd(r.amount, lang)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
