import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { checkConflicts, type ConflictResult } from "@/lib/conflict-check";
import { supabase } from "@/integrations/supabase/client";

export function ConflictChecker() {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConflictResult | null>(null);
  const [checked, setChecked] = useState(false);

  const runCheck = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setResult(null);
    setChecked(false);

    try {
      // Fetch all clients (English + Arabic names)
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, name_ar")
        .limit(500);

      const entities: Array<{
        name: string;
        type: "client_name" | "opposing_party" | "related_entity";
        caseTitle?: string;
        caseId?: string;
        clientId?: string;
      }> = [];

      if (clients) {
        for (const c of clients) {
          if (c.name) {
            entities.push({ name: c.name, type: "client_name", clientId: c.id });
          }
          if (c.name_ar) {
            entities.push({ name: c.name_ar, type: "client_name", clientId: c.id });
          }
        }
      }

      const conflictResult = checkConflicts(name, entities);
      setResult(conflictResult);
      setChecked(true);
    } catch (err) {
      console.error("Conflict check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          {t("Conflict of Interest Check", "فحص تعارض المصالح")}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          "Check if a new client or opposing party conflicts with existing firm data.",
          "تحقق مما إذا كان موكل جديد أو خصم يتعارض مع بيانات المكتب الحالية."
        )}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={t("Enter name to check...", "أدخل الاسم للفحص...")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setChecked(false);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && runCheck()}
          dir="auto"
        />
        <button
          onClick={runCheck}
          disabled={!name.trim() || loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {t("Check", "فحص")}
        </button>
      </div>

      {checked && result && (
        <div
          className={`rounded-md p-3 ${
            result.hasConflict
              ? "bg-destructive/10 border border-destructive/30"
              : "bg-green-500/10 border border-green-500/30"
          }`}
        >
          {result.hasConflict ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="font-semibold text-sm text-destructive">
                  {t(
                    `⚠️ ${result.matches.length} potential conflict(s) found!`,
                    `⚠️ تم العثور على ${result.matches.length} تعارض محتمل!`
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                {result.matches.map((m, i) => (
                  <div key={i} className="text-xs bg-background/50 rounded p-2">
                    <span className="font-medium">{m.matchedName}</span>
                    <span className="text-muted-foreground">
                      {" — "}
                      {m.type === "client_name"
                        ? t("Existing client", "موكل حالي")
                        : t("Opposing party", "خصم")}
                      {m.caseTitle && ` (${m.caseTitle})`}
                      {" — "}
                      {Math.round(m.similarity * 100)}%{" "}
                      {t("match", "تطابق")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                {t("✓ No conflicts found — clear to proceed", "✓ لا يوجد تعارض — يمكنك المتابعة")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
