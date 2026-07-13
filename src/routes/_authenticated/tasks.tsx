import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, User, Flag, CalendarClock, FileText, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { listTasks, type TaskItem } from "@/lib/tasks.functions";

export const Route = createFileRoute("/tasks")({
  validateSearch: (search: Record<string, unknown>): { taskId?: string } => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tasks — Qadiya OS" },
      { name: "description", content: "Workflow tasks, delegation, and escalation for your legal team." },
    ],
  }),
  component: TasksPage,
});

function priorityTone(p: string) {
  switch (p) {
    case "high":
      return "bg-destructive/10 text-destructive";
    case "low":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-gold/15 text-gold";
  }
}

function statusTone(s: string) {
  switch (s) {
    case "done":
      return "bg-success/15 text-success";
    case "in_progress":
      return "bg-navy/10 text-navy dark:bg-gold/15 dark:text-gold";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function TasksPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { taskId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(taskId ?? null);

  useEffect(() => {
    if (taskId) setSelectedId(taskId);
  }, [taskId]);

  const runTasks = useServerFn(listTasks);
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => runTasks(),
  });

  const priorityLabel = (p: string) =>
    tt(
      p === "high" ? "High" : p === "low" ? "Low" : "Medium",
      p === "high" ? "عالية" : p === "low" ? "منخفضة" : "متوسطة",
    );
  const statusLabel = (s: string) =>
    tt(
      s === "done" ? "Done" : s === "in_progress" ? "In progress" : "Open",
      s === "done" ? "مكتملة" : s === "in_progress" ? "قيد التنفيذ" : "مفتوحة",
    );

  const selected = (tasks ?? []).find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("Workflow", "سير العمل")}</div>
        <h1 className="font-display text-3xl">{tt("Tasks", "المهام")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tt("Select a task to see its full details.", "اختر مهمة لعرض تفاصيلها الكاملة.")}
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt("Loading tasks…", "جارٍ تحميل المهام…")}
          </CardContent>
        </Card>
      ) : (tasks ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CheckSquare}
              title={tt("No tasks yet", "لا توجد مهام بعد")}
              desc={tt(
                "Connected to the live backend. Assigned tasks will appear here for your role.",
                "متصل بالخادم المباشر. ستظهر المهام المسندة هنا حسب دورك.",
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            {(tasks ?? []).map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedId(task.id)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg border bg-card px-4 py-3 text-start transition-colors",
                  selectedId === task.id ? "border-gold bg-gold/5" : "hover:border-gold/50 hover:bg-accent/40",
                )}
              >
                <div className={cn("mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center", task.status === "done" && "bg-success/20 border-success")}>
                  {task.status === "done" && <CheckSquare className="h-3 w-3 text-success" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("font-medium truncate", task.status === "done" && "line-through text-muted-foreground")}>
                    <span className={lang === "ar" ? "font-arabic" : ""}>
                      {lang === "ar" ? task.title_ar ?? task.title : task.title}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", priorityTone(task.priority))}>
                      {priorityLabel(task.priority)}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone(task.status))}>
                      {statusLabel(task.status)}
                    </span>
                    {task.due_date && (
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {task.due_date}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <TaskDetail
                task={selected}
                onClose={() => setSelectedId(null)}
                tt={tt}
                lang={lang}
                priorityLabel={priorityLabel}
                statusLabel={statusLabel}
              />
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed h-full min-h-[240px] text-center p-6">
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm font-medium">{tt("Select a task", "اختر مهمة")}</div>
                <div className="text-xs text-muted-foreground">
                  {tt("Its description, priority and assignee will appear here.", "سيظهر هنا الوصف والأولوية والمسؤول.")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskDetail({
  task,
  onClose,
  tt,
  lang,
  priorityLabel,
  statusLabel,
}: {
  task: TaskItem;
  onClose: () => void;
  tt: (en: string, ar: string) => string;
  lang: string;
  priorityLabel: (p: string) => string;
  statusLabel: (s: string) => string;
}) {
  return (
    <Card className="sticky top-6">
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug">
            <span className={lang === "ar" ? "font-arabic" : ""}>
              {lang === "ar" ? task.title_ar ?? task.title : task.title}
            </span>
          </h3>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", priorityTone(task.priority))}>
            <Flag className="h-3 w-3" />
            {priorityLabel(task.priority)}
          </span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone(task.status))}>
            {statusLabel(task.status)}
          </span>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{tt("Description", "الوصف")}</div>
          <p className="text-sm leading-relaxed">
            {(lang === "ar" ? task.description_ar : task.description) ?? tt("No description.", "لا يوجد وصف.")}
          </p>
        </div>

        <div className="grid gap-4">
          <DetailRow icon={User} label={tt("Assigned to", "مسند إلى")}>
            {task.assignee ? (
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {lang === "ar" ? task.assignee_ar ?? task.assignee : task.assignee}
              </span>
            ) : (
              tt("Unassigned", "غير مُسند")
            )}
          </DetailRow>
          <DetailRow icon={CalendarClock} label={tt("Due date", "تاريخ الاستحقاق")}>
            {task.due_date ?? tt("No due date", "لا يوجد")}
          </DetailRow>
          {task.case_number && (
            <DetailRow icon={FileText} label={tt("Related case", "القضية المرتبطة")}>
              <span className="block">
                <span className={lang === "ar" ? "font-arabic" : ""}>
                  {lang === "ar" ? task.case_title_ar ?? task.case_title : task.case_title}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">#{task.case_number}</span>
            </DetailRow>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
