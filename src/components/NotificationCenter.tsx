import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Gavel, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  type NotificationItem,
  type NotificationKind,
} from "@/lib/notifications.functions";

const ICONS: Record<NotificationKind, typeof Bell> = {
  task_overdue: AlertTriangle,
  task_due_today: CalendarClock,
  hearing_today: Gavel,
  hearing_tomorrow: Gavel,
  invoice_overdue: Receipt,
  appeal_window: AlertTriangle,
};

function severityClass(sev: NotificationItem["severity"]) {
  if (sev === "danger") return "text-destructive";
  if (sev === "warn") return "text-gold";
  return "text-primary";
}

export function NotificationCenter() {
  const { lang, t } = useApp();
  const navigate = useNavigate();
  const run = useServerFn(listNotifications);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => run(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const items = data ?? [];
  const dangerCount = items.filter((i) => i.severity === "danger").length;
  const total = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("Notifications", "التنبيهات")}
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[10px] leading-none",
                dangerCount > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-gold text-navy",
              )}
            >
              {total > 9 ? "9+" : total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className={cn("font-medium text-sm", lang === "ar" && "font-arabic")}>
              {t("Notifications", "التنبيهات")}
            </p>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? t("You're all caught up", "لا توجد تنبيهات")
                : t(`${total} item${total === 1 ? "" : "s"}`, `${total} تنبيه`)}
            </p>
          </div>
          {total === 0 && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/70" />
              <p className={lang === "ar" ? "font-arabic" : ""}>
                {t("No pending alerts.", "لا توجد تنبيهات معلقة.")}
              </p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.kind] ?? Bell;
              const title = lang === "ar" ? n.title_ar : n.title_en;
              const sub = lang === "ar" ? n.subtitle_ar : n.subtitle_en;
              return (
                <button
                  key={n.id}
                  onClick={() => navigate({ to: n.href })}
                  className="w-full text-start px-4 py-3 hover:bg-accent/50 transition-colors flex gap-3"
                >
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", severityClass(n.severity))} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        lang === "ar" && "font-arabic",
                      )}
                    >
                      {title}
                    </p>
                    {sub && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
