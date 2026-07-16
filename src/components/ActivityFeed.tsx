import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActivityFeed } from "@/lib/portal.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

/**
 * Compact team activity feed reading from the audit log.
 * Drop this on the dashboard or a dedicated page.
 */
export function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const { lang, t } = useApp();
  const fetchFeed = useServerFn(listActivityFeed);
  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: () => fetchFeed({ data: { limit } }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          {t("Team Activity", "نشاط الفريق")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-xs text-muted-foreground">{t("Loading…", "جاري التحميل…")}</p>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-xs text-muted-foreground">
            {t("No recent activity yet.", "لا يوجد نشاط حديث.")}
          </p>
        )}
        {data?.map((row) => {
          const actor =
            (lang === "ar" ? row.actor_name_ar : row.actor_name) ||
            row.actor_email ||
            t("System", "النظام");
          const when = (() => {
            try {
              return formatDistanceToNow(new Date(row.created_at), {
                addSuffix: true,
                locale: lang === "ar" ? arLocale : undefined,
              });
            } catch {
              return "";
            }
          })();
          return (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{actor}</span>{" "}
                  <span className="text-muted-foreground">{row.action}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    · {row.resource_type}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{when}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {row.resource_type}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
