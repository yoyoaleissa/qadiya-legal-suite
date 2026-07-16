import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listCaseFreshness } from "@/lib/insights.functions";
import { generateCaseReport } from "@/lib/report.functions";
import { saveCaseReport } from "@/lib/case-reports.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Radio } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ageLabel(min: number, lang: "en" | "ar"): string {
  if (min < 60) return lang === "ar" ? `${min} دقيقة` : `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return lang === "ar" ? `${h} ساعة` : `${h}h`;
  const d = Math.floor(h / 24);
  return lang === "ar" ? `${d} يوم` : `${d}d`;
}

function ageTone(min: number): string {
  if (min < 60 * 24) return "text-emerald-600";
  if (min < 60 * 24 * 7) return "text-amber-600";
  return "text-red-600";
}

export function CaseFreshness() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const fetchList = useServerFn(listCaseFreshness);
  const runReport = useServerFn(generateCaseReport);
  const savePersist = useServerFn(saveCaseReport);
  const { data, isLoading } = useQuery({
    queryKey: ["case-freshness"],
    queryFn: () => fetchList(),
    refetchInterval: 5 * 60 * 1000,
  });
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refresh = useMutation({
    mutationFn: async (caseNumber: string) => {
      setRefreshingId(caseNumber);
      const report = await runReport({ data: { caseNumber } });
      await savePersist({ data: { caseNumber, report } });
    },
    onSuccess: () => {
      toast.success(t("Case refreshed", "تم تحديث القضية"));
      qc.invalidateQueries({ queryKey: ["case-freshness"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setRefreshingId(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-gold" />
          <span className={lang === "ar" ? "font-arabic" : ""}>
            {t("MOJ sync freshness", "تحديث بيانات وزارة العدل")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("Loading…", "جارٍ التحميل…")}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t(
              "No synced cases yet. Generate a report to start tracking.",
              "لا توجد قضايا متزامنة بعد.",
            )}
          </p>
        ) : (
          <div className="divide-y max-h-72 overflow-y-auto">
            {data.slice(0, 12).map((row) => (
              <div key={row.case_number} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono truncate">{row.case_number}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {row.status_hint ?? t("no status", "بدون حالة")}
                  </div>
                </div>
                <span className={`text-xs tabular-nums ${ageTone(row.minutes_since)}`}>
                  {ageLabel(row.minutes_since, lang)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={refreshingId === row.case_number}
                  onClick={() => refresh.mutate(row.case_number)}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshingId === row.case_number ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
