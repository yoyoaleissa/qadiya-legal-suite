import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  User,
  Flag,
  CalendarClock,
  FileText,
  Loader2,
  X,
  Plus,
  PlayCircle,
  ExternalLink,
  Undo2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import {
  listTasks,
  createTask,
  updateTaskStatus,
  listWorkflowTemplates,
  createTasksFromWorkflow,
  type TaskItem,
} from "@/lib/tasks.functions";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";

const FILTER_VALUES = ["all", "open", "in_progress", "done", "overdue", "today"] as const;
type FilterStatus = (typeof FILTER_VALUES)[number];

export const Route = createFileRoute("/_authenticated/tasks")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { taskId?: string; filter?: FilterStatus } => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    filter: FILTER_VALUES.includes(search.filter as FilterStatus)
      ? (search.filter as FilterStatus)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tasks — Qadiya OS" },
      {
        name: "description",
        content: "Workflow tasks, delegation, and escalation for your legal team.",
      },
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
  const { taskId, filter: filterParam } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(taskId ?? null);
  const [filter, setFilter] = useState<FilterStatus>(filterParam ?? "all");
  const [showCreate, setShowCreate] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (taskId) setSelectedId(taskId);
  }, [taskId]);

  useEffect(() => {
    if (filterParam) setFilter(filterParam);
  }, [filterParam]);

  const runTasks = useServerFn(listTasks);
  const runUpdateStatus = useServerFn(updateTaskStatus);
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => runTasks(),
  });

  const toggleDone = useMutation({
    mutationFn: (t: TaskItem) =>
      runUpdateStatus({ data: { id: t.id, status: t.status === "done" ? "open" : "done" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
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
  const filterLabel = (f: FilterStatus) => {
    if (f === "all") return tt("All", "الكل");
    if (f === "overdue") return tt("Overdue", "متأخرة");
    if (f === "today") return tt("Due today", "مستحقة اليوم");
    return statusLabel(f);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const matchesFilter = (t: TaskItem, f: FilterStatus) => {
    if (f === "all") return true;
    if (f === "overdue") return t.status !== "done" && !!t.due_date && t.due_date < todayStr;
    if (f === "today") return t.status !== "done" && t.due_date === todayStr;
    return t.status === f;
  };
  const filtered = (tasks ?? []).filter((t) => matchesFilter(t, filter));
  const selected = (tasks ?? []).find((t) => t.id === selectedId) ?? null;
  const counts: Record<FilterStatus, number> = {
    all: (tasks ?? []).length,
    open: (tasks ?? []).filter((t) => t.status === "open").length,
    in_progress: (tasks ?? []).filter((t) => t.status === "in_progress").length,
    done: (tasks ?? []).filter((t) => t.status === "done").length,
    overdue: (tasks ?? []).filter((t) => matchesFilter(t, "overdue")).length,
    today: (tasks ?? []).filter((t) => matchesFilter(t, "today")).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {tt("Workflow", "سير العمل")}
          </div>
          <h1 className="font-display text-3xl">{tt("Tasks", "المهام")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt(
              "Manage your team's workflow and deadlines.",
              "أدِر سير عمل فريقك والمواعيد النهائية.",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowWorkflow(true)}>
            <PlayCircle className="h-4 w-4" />
            {tt("Run Workflow", "تشغيل سير عمل")}
          </Button>
          <Button
            className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            {tt("Create Task", "إنشاء مهمة")}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "in_progress", "done", "today", "overdue"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f
                ? f === "overdue"
                  ? "bg-destructive text-white"
                  : "bg-navy text-white dark:bg-gold dark:text-navy"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {filterLabel(f)}
            <span className="ms-1.5 opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt("Loading tasks…", "جارٍ تحميل المهام…")}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CheckSquare}
              title={tt("No tasks found", "لا توجد مهام")}
              desc={tt(
                "Create a task or run a workflow template to get started.",
                "أنشئ مهمة أو شغّل قالب سير عمل للبدء.",
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg border bg-card px-4 py-3 text-start transition-colors",
                  selectedId === task.id
                    ? "border-gold bg-gold/5"
                    : "hover:border-gold/50 hover:bg-accent/40",
                  task.status === "done" && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDone.mutate(task);
                  }}
                  aria-label={tt(
                    task.status === "done" ? "Mark as open" : "Mark as done",
                    task.status === "done" ? "إعادة فتح" : "تم الإنجاز",
                  )}
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-colors hover:border-success",
                    task.status === "done" && "bg-success/20 border-success",
                  )}
                >
                  {task.status === "done" && <CheckSquare className="h-3 w-3 text-success" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(task.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <div
                    className={cn(
                      "font-medium truncate",
                      task.status === "done" && "line-through text-muted-foreground",
                    )}
                  >
                    <span className={lang === "ar" ? "font-arabic" : ""}>
                      {lang === "ar" ? (task.title_ar ?? task.title) : task.title}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        priorityTone(task.priority),
                      )}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        statusTone(task.status),
                      )}
                    >
                      {statusLabel(task.status)}
                    </span>
                    {task.due_date && (
                      <span
                        className={cn(
                          "text-[11px] inline-flex items-center gap-1",
                          task.status !== "done" &&
                            task.due_date < new Date().toISOString().slice(0, 10)
                            ? "text-destructive font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {task.due_date}
                        {task.status !== "done" &&
                          task.due_date < new Date().toISOString().slice(0, 10) &&
                          " ⚠️"}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className={lang === "ar" ? "font-arabic" : ""}>
                          {lang === "ar" ? (task.assignee_ar ?? task.assignee) : task.assignee}
                        </span>
                      </span>
                    )}
                  </div>
                </button>
                {task.status === "done" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDone.mutate(task);
                    }}
                    className="mt-0.5 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-gold transition-colors"
                    aria-label={tt("Undo completion", "تراجع عن الإنجاز")}
                  >
                    <Undo2 className="h-3 w-3" />
                    {tt("Undo", "تراجع")}
                  </button>
                )}
              </div>
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
                  {tt(
                    "Its description, priority and assignee will appear here.",
                    "سيظهر هنا الوصف والأولوية والمسؤول.",
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        tt={tt}
        lang={lang}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />

      {/* Workflow Template Dialog */}
      <WorkflowDialog
        open={showWorkflow}
        onClose={() => setShowWorkflow(false)}
        tt={tt}
        lang={lang}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </div>
  );
}

/* ─── Create Task Dialog ─── */
function CreateTaskDialog({
  open,
  onClose,
  tt,
  lang,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tt: (en: string, ar: string) => string;
  lang: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const runCreate = useServerFn(createTask);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await runCreate({
        data: {
          title,
          title_ar: titleAr || undefined,
          description: description || undefined,
          priority: priority as "high" | "medium" | "low",
          assignee: assignee || undefined,
          due_date: dueDate || undefined,
        },
      });
      onCreated();
      onClose();
      setTitle("");
      setTitleAr("");
      setDescription("");
      setPriority("medium");
      setAssignee("");
      setDueDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tt("Create Task", "إنشاء مهمة")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Title (English)", "العنوان (إنجليزي)")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tt("e.g. File appeal memorandum", "مثال: إيداع مذكرة الاستئناف")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Title (Arabic)", "العنوان (عربي)")}
            </label>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              placeholder="العنوان بالعربي (اختياري)"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{tt("Description", "الوصف")}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{tt("Priority", "الأولوية")}</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{tt("High", "عالية")}</SelectItem>
                  <SelectItem value="medium">{tt("Medium", "متوسطة")}</SelectItem>
                  <SelectItem value="low">{tt("Low", "منخفضة")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Due Date", "تاريخ الاستحقاق")}
              </label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{tt("Assignee", "المسؤول")}</label>
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder={tt("e.g. Sara Al-Rashid", "مثال: سارة الرشيد")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tt("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("Create", "إنشاء")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Workflow Template Dialog ─── */
function WorkflowDialog({
  open,
  onClose,
  tt,
  lang,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tt: (en: string, ar: string) => string;
  lang: string;
  onCreated: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [loading, setLoading] = useState(false);
  const runTemplates = useServerFn(listWorkflowTemplates);
  const runCreate = useServerFn(createTasksFromWorkflow);

  const { data: templates } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () => runTemplates(),
    enabled: open,
  });

  const handleRun = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await runCreate({ data: { template_id: selectedTemplate, assignee: assignee || undefined } });
      onCreated();
      onClose();
      setSelectedTemplate("");
      setAssignee("");
    } finally {
      setLoading(false);
    }
  };

  const activeTemplate = (templates ?? []).find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tt("Run Workflow Template", "تشغيل قالب سير عمل")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {tt(
              "Select a template to automatically create a series of tasks with pre-set deadlines.",
              "اختر قالباً لإنشاء سلسلة مهام تلقائياً بمواعيد محددة مسبقاً.",
            )}
          </p>
          <div>
            <label className="text-xs text-muted-foreground">{tt("Template", "القالب")}</label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder={tt("Choose a template…", "اختر قالباً…")} />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {lang === "ar" ? (t.name_ar ?? t.name) : t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeTemplate && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {tt("Steps that will be created:", "الخطوات التي ستُنشأ:")}
              </div>
              {activeTemplate.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                  <span className={lang === "ar" ? "font-arabic" : ""}>
                    {lang === "ar" ? step.title_ar : step.title}
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground">
                    +{step.days_offset}d
                  </span>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">
              {tt("Assign all to", "إسناد الكل إلى")}
            </label>
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder={tt(
                "Optional — leave blank to assign later",
                "اختياري — اتركه فارغاً للإسناد لاحقاً",
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tt("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleRun}
            disabled={!selectedTemplate || loading}
            className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              tt("Run Template", "تشغيل القالب")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Task Detail Panel ─── */
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
  const queryClient = useQueryClient();
  const runUpdate = useServerFn(updateTaskStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: "open" | "in_progress" | "done") => {
    setUpdating(true);
    try {
      await runUpdate({ data: { id: task.id, status: newStatus } });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } finally {
      setUpdating(false);
    }
  };

  const calendarUrl = task.due_date
    ? buildGoogleCalendarUrl({
        title: `📋 ${task.title}`,
        date: task.due_date,
        description: `Task: ${task.title}\nCase: ${task.case_number ?? "N/A"}\nPriority: ${task.priority}`,
      })
    : null;

  return (
    <Card className="sticky top-6">
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug">
            <span className={lang === "ar" ? "font-arabic" : ""}>
              {lang === "ar" ? (task.title_ar ?? task.title) : task.title}
            </span>
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              priorityTone(task.priority),
            )}
          >
            <Flag className="h-3 w-3" />
            {priorityLabel(task.priority)}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusTone(task.status),
            )}
          >
            {statusLabel(task.status)}
          </span>
        </div>

        {/* Status Change Buttons */}
        <div className="flex flex-wrap gap-2">
          {task.status !== "open" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("open")}
              disabled={updating}
            >
              {tt("Set Open", "فتح")}
            </Button>
          )}
          {task.status !== "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("in_progress")}
              disabled={updating}
            >
              {tt("Start", "بدء")}
            </Button>
          )}
          {task.status !== "done" && (
            <Button
              size="sm"
              variant="outline"
              className="border-success/50 text-success hover:bg-success/10"
              onClick={() => handleStatusChange("done")}
              disabled={updating}
            >
              {tt("Complete", "إكمال")}
            </Button>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {tt("Description", "الوصف")}
          </div>
          <p className="text-sm leading-relaxed">
            {(lang === "ar" ? task.description_ar : task.description) ??
              tt("No description.", "لا يوجد وصف.")}
          </p>
        </div>

        <div className="grid gap-4">
          <DetailRow icon={User} label={tt("Assigned to", "مسند إلى")}>
            {task.assignee ? (
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {lang === "ar" ? (task.assignee_ar ?? task.assignee) : task.assignee}
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
                  {lang === "ar" ? (task.case_title_ar ?? task.case_title) : task.case_title}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">#{task.case_number}</span>
            </DetailRow>
          )}
        </div>

        {/* Google Calendar Link */}
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {tt("Add deadline to Google Calendar", "إضافة الموعد إلى تقويم Google")}
          </a>
        )}
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
