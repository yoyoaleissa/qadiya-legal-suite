import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPartnerKPIs } from "@/lib/insights.functions";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, Clock, Percent, Briefcase, CalendarCheck } from "lucide-react";

export function PartnerKPIs() {
  const { t, lang } = useApp();
  const { isAdmin } = useIsAdmin();
  const fetchKPIs = useServerFn(getPartnerKPIs);
  const { data } = useQuery({
    queryKey: ["partner-kpis"],
    queryFn: () => fetchKPIs(),
    enabled: isAdmin,
    refetchInterval: 5 * 60 * 1000,
  });

  if (!isAdmin || !data) return null;

  const items = [
    {
      icon: TrendingUp,
      labelEn: "Revenue MTD",
      labelAr: "إيراد الشهر",
      value: `${data.revenue_mtd.toFixed(3)} ${data.currency}`,
      tone: "text-emerald-600",
    },
    {
      icon: Wallet,
      labelEn: "Outstanding",
      labelAr: "مستحق",
      value: `${data.outstanding.toFixed(3)} ${data.currency}`,
      tone: "text-amber-600",
    },
    {
      icon: Percent,
      labelEn: "Collections",
      labelAr: "التحصيل",
      value: `${data.collections_rate}%`,
      tone: data.collections_rate >= 70 ? "text-emerald-600" : "text-amber-600",
    },
    {
      icon: Clock,
      labelEn: "WIP hours (90d)",
      labelAr: "ساعات جارية",
      value: `${data.wip_hours}h`,
      tone: "text-foreground",
    },
    {
      icon: Briefcase,
      labelEn: "Active cases",
      labelAr: "قضايا نشطة",
      value: String(data.active_cases),
      tone: "text-foreground",
    },
    {
      icon: CalendarCheck,
      labelEn: "Hearings 7d",
      labelAr: "جلسات ٧ أيام",
      value: String(data.hearings_this_week),
      tone: data.hearings_this_week > 0 ? "text-navy dark:text-gold" : "text-muted-foreground",
    },
  ];

  return (
    <div>
      <h2 className={`text-sm uppercase tracking-widest text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>
        {t("Partner KPIs", "مؤشرات الشريك")}
      </h2>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Card key={it.labelEn}>
              <CardContent className="pt-4 pb-4">
                <Icon className={`h-4 w-4 mb-1.5 ${it.tone}`} />
                <div className="text-lg font-semibold tabular-nums">{it.value}</div>
                <div className={`text-[10px] uppercase tracking-wider text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
                  {t(it.labelEn, it.labelAr)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
