import { useState } from "react";
import { Calculator, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  LIMITATION_PERIODS,
  calculateLimitationDeadline,
  type CaseCategory,
} from "@/lib/statute-of-limitations";

export function StatuteCalculator() {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [category, setCategory] = useState<CaseCategory | "">("");
  const [startDate, setStartDate] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calculateLimitationDeadline> | null>(null);

  const calculate = () => {
    if (!category || !startDate) return;
    const res = calculateLimitationDeadline(category as CaseCategory, new Date(startDate));
    setResult(res);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          {t("Statute of Limitations Calculator", "حاسبة التقادم")}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            {t("Case Type", "نوع الدعوى")}
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CaseCategory);
              setResult(null);
            }}
          >
            <option value="">{t("Select type...", "اختر النوع...")}</option>
            {LIMITATION_PERIODS.map((p) => (
              <option key={p.category} value={p.category}>
                {isAr ? p.titleAr : p.titleEn}
                {p.periodYears > 0
                  ? ` (${p.periodYears} ${t("years", "سنوات")})`
                  : ` (${t("No limit", "لا تسقط")})`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            {t("Start Date (cause of action)", "تاريخ نشوء الحق")}
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setResult(null);
            }}
          />
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!category || !startDate}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t("Calculate", "احسب")}
      </button>

      {result && (
        <div
          className={`rounded-md p-3 ${
            result.isExpired
              ? "bg-destructive/10 border border-destructive/30"
              : result.daysRemaining <= 90
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : "bg-green-500/10 border border-green-500/30"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.isExpired ? (
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            ) : result.daysRemaining <= 90 ? (
              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p className="font-semibold text-sm">
                {result.isExpired
                  ? t("EXPIRED — Statute has lapsed", "منتهية — سقطت الدعوى بالتقادم")
                  : result.daysRemaining === Infinity
                    ? t("No limitation period applies", "لا تسقط بالتقادم")
                    : `${result.daysRemaining} ${t("days remaining", "يوم متبقي")}`}
              </p>
              {result.daysRemaining !== Infinity && (
                <p className="text-xs text-muted-foreground">
                  {t("Deadline:", "الموعد النهائي:")}{" "}
                  {result.deadline.toLocaleDateString(isAr ? "ar-KW" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("Legal basis:", "السند القانوني:")}{" "}
                {isAr ? result.info.legalBasisAr : result.info.legalBasisEn}
              </p>
              {result.info.notes && (
                <p className="text-xs text-muted-foreground italic">{result.info.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
