import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Gavel,
  MessageSquare,
  Receipt,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  type NotificationItem,
  type NotificationKind,
} from "@/lib/notifications.functions";

const ICONS: Record<string, typeof Bell> = {
  task_overdue: AlertTriangle,
  task_due_today: CalendarClock,
  hearing_today: Gavel,
  hearing_tomorrow: Gavel,
  invoice_overdue: Receipt,
  appeal_window: AlertTriangle,
  portal_message: MessageSquare,
  case_update: Bell,
  system: Bell,
};

function iconFor(kind: NotificationKind) {
  return ICONS[kind as string] ?? Bell;
}

function severityClass(sev: NotificationItem["severity"]) {
  if (sev === "danger") return "text-destructive";
  if (sev === "warn") return "text-gold";
  if (sev === "success") return "text-emerald-500";
  return "text-primary";
}

export function NotificationCenter() {
  const { lang, t } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const run = useServerFn(listNotifications);
  const runMarkRead = useServerFn(markNotificationRead);
  const runMarkAll = useServerFn(markAllNotificationsRead);
  const runDelete = useServerFn(deleteNotification);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => run(),
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  const seenIds = useRef<Set<string>>(new Set());

  // Realtime: subscribe to my notification inserts and pop a toast
  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      userId = userRes.user?.id ?? null;
      if (!userId) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              title_en: string;
              title_ar: string;
              href: string | null;
              severity: NotificationItem["severity"];
            };
            if (seenIds.current.has(row.id)) return;
            seenIds.current.add(row.id);
            const title = lang === "ar" ? row.title_ar : row.title_en;
            const fn =
              row.severity === "danger"
                ? toast.error
                : row.severity === "warn"
                  ? toast.warning
                  : row.severity === "success"
                    ? toast.success
                    : toast;
            fn(title, {
              action: row.href
                ? {
                    label: t("Open", "فتح"),
                    onClick: () => navigate({ to: row.href! }),
                  }
                : undefined,
            });
            qc.invalidateQueries({ queryKey: ["notifications"] });
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const items = data ?? [];
  const unread = items.filter((i) => !i.read);
  const unreadCount = unread.length;
  const dangerCount = unread.filter((i) => i.severity === "danger").length;

  async function handleItemClick(n: NotificationItem) {
    if (n.persistent && !n.read) {
      try {
        await runMarkRead({ data: { id: n.id } });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* noop */
      }
    }
    if (n.href) navigate({ to: n.href });
  }

  async function handleMarkAll() {
    try {
      await runMarkAll();
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("All notifications marked as read", "تم تمييز الكل كمقروء"));
    } catch {
      toast.error(t("Something went wrong", "حدث خطأ"));
    }
  }

  async function handleDelete(e: React.MouseEvent, n: NotificationItem) {
    e.stopPropagation();
    if (!n.persistent) return;
    try {
      await runDelete({ data: { id: n.id } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      /* noop */
    }
  }

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
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[10px] leading-none",
                dangerCount > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-gold text-navy",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[24rem] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className={cn("font-medium text-sm", lang === "ar" && "font-arabic")}>
              {t("Notifications", "التنبيهات")}
            </p>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? t("You're all caught up", "لا توجد تنبيهات جديدة")
                : t(
                    `${unreadCount} unread`,
                    `${unreadCount} غير مقروء`,
                  )}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAll}
            >
              {t("Mark all read", "تمييز الكل")}
            </Button>
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          )}
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
              const Icon = iconFor(n.kind);
              const title = lang === "ar" ? n.title_ar : n.title_en;
              const sub = lang === "ar" ? n.subtitle_ar : n.subtitle_en;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
                    !n.read && "bg-accent/20",
                  )}
                  onClick={() => handleItemClick(n)}
                >
                  {!n.read && (
                    <span className="absolute start-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  <Icon
                    className={cn("h-4 w-4 shrink-0 mt-0.5", severityClass(n.severity))}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm truncate",
                        !n.read ? "font-medium" : "font-normal text-muted-foreground",
                        lang === "ar" && "font-arabic",
                      )}
                    >
                      {title}
                    </p>
                    {sub && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {sub}
                      </p>
                    )}
                  </div>
                  {n.persistent && (
                    <button
                      onClick={(e) => handleDelete(e, n)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      aria-label={t("Dismiss", "تجاهل")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
