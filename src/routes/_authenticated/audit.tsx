import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/collaboration.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Qadiya OS" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { t, lang } = useApp();
  const { isAdmin, isLoading: loading } = useIsAdmin();
  const fetchLog = useServerFn(listAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => fetchLog({ data: { limit: 200 } }),
    enabled: isAdmin,
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className={lang === "ar" ? "font-arabic" : ""}>
          {t("Admins only.", "للمدراء فقط.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-gold" />
        <div>
          <h1 className={`text-2xl font-display ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("Audit Log", "سجل التدقيق")}
          </h1>
          <p className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {t(
              "Every privileged action across the firm — required for Kuwait Bar compliance.",
              "كل إجراء مميّز داخل المكتب — مطلوب للامتثال لجمعية المحامين الكويتية.",
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={lang === "ar" ? "font-arabic" : ""}>
            {t("Recent activity", "النشاط الأخير")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("Loading…", "جارٍ التحميل…")}
            </p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("No activity yet.", "لا يوجد نشاط بعد.")}
            </p>
          ) : (
            <div className="divide-y">
              {data.map((row) => (
                <div key={row.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{row.resource_type}</span>
                    </div>
                    <div className="text-sm mt-1 truncate">
                      {row.actor_email ?? t("system", "النظام")}
                      {row.resource_id ? (
                        <span className="text-muted-foreground"> · {row.resource_id.slice(0, 8)}</span>
                      ) : null}
                    </div>
                    {row.metadata_json ? (
                      <pre className="text-[10px] text-muted-foreground/70 mt-1 font-mono truncate">
                        {row.metadata_json}
                      </pre>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString(lang === "ar" ? "ar-KW" : "en-GB")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
