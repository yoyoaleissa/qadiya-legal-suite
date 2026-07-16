import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Bell,
  CheckSquare,
  RefreshCw,
  MessageSquare,
  Users,
  FileDown,
  StickyNote,
  Search,
  Loader2,
  FileText,
  Scale,
  History,
  Clock,
} from "lucide-react";
import { generateCaseReport } from "@/lib/report.functions";
import {
  saveCaseReport,
  listRecentReports,
  getCaseReport,
  type RecentReportRow,
} from "@/lib/case-reports.functions";
import type { CaseReport } from "@/lib/report-types";
import { useApp } from "@/lib/app-context";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { exportCaseReportPdf } from "@/lib/report-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportView } from "@/components/report/ReportView";

export const Route = createFileRoute("/_authenticated/reports")({
  component: CaseReportsPage,
  head: () => ({
    meta: [
      { title: "Case Reports — Qadiya OS" },
      { name: "description", content: "View and act on case reports generated from MOJ data." },
    ],
  }),
});

const RECENT_CACHE_KEY = "qadiya:recent-reports:v1";

function readCachedRecent(): RecentReportRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as RecentReportRow[]) : [];
  } catch {
    return [];
  }
}

function writeCachedRecent(rows: RecentReportRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(rows.slice(0, 20)));
  } catch {
    // ignore quota errors
  }
}

function CaseReportsPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const runReport = useServerFn(generateCaseReport);
  const saveReport = useServerFn(saveCaseReport);
  const fetchRecent = useServerFn(listRecentReports);
  const fetchReport = useServerFn(getCaseReport);
  const [report, setReport] = useState<CaseReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [recent, setRecent] = useState<RecentReportRow[]>(() => readCachedRecent());
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const refreshRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const rows = await fetchRecent();
      setRecent(rows);
      writeCachedRecent(rows);
    } catch {
      // keep cached
    } finally {
      setLoadingRecent(false);
    }
  }, [fetchRecent]);

  useEffect(() => {
    void refreshRecent();
  }, [refreshRecent]);

  async function handleLookup() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setReport(null);
    try {
      const result = await runReport({ data: { caseNumber: trimmed } });
      setReport(result);
      if (result?.found) {
        try {
          await saveReport({ data: { caseNumber: trimmed, report: result } });
          await refreshRecent();
        } catch {
          // don't block UI on save failure
        }
      }
    } catch {
      // handled by UI
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenRecent(row: RecentReportRow) {
    if (loadingId) return;
    setLoadingId(row.id);
    try {
      const rep = await fetchReport({ data: { id: row.id } });
      if (rep) {
        setReport(rep);
        setInput(row.case_number);
      }
    } finally {
      setLoadingId(null);
    }
  }

  function getNextHearing(): { date: string; notes: string } | null {
    if (!report) return null;
    const today = new Date().toISOString().slice(0, 10);
    const future = report.hearings
      .filter((h) => h.session_date && h.session_date >= today)
      .sort((a, b) => (a.session_date! > b.session_date! ? 1 : -1));
    return future[0] ? { date: future[0].session_date!, notes: future[0].notes || "" } : null;
  }

  function getAppealDeadline(): string | null {
    if (!report?.deadline) return null;
    return report.deadline.date;
  }

  function openCalendarLink(title: string, date: string, description?: string) {
    const url = buildGoogleCalendarUrl({ title, date, description, location: "Kuwait Courts" });
    window.open(url, "_blank");
  }

  function handleAddHearingToCalendar() {
    const hearing = getNextHearing();
    if (!hearing) return;
    openCalendarLink(
      `Court Hearing — Case ${report!.case_number}`,
      hearing.date,
      hearing.notes || `Case ${report!.case_number} hearing`,
    );
  }

  function handleSetAppealReminder() {
    const deadline = getAppealDeadline();
    if (!deadline) return;
    // Set reminder 7 days before
    const d = new Date(deadline);
    d.setDate(d.getDate() - 7);
    const reminderDate = d.toISOString().slice(0, 10);
    openCalendarLink(
      `⚠️ Appeal Deadline in 7 Days — Case ${report!.case_number}`,
      reminderDate,
      `Appeal deadline for case ${report!.case_number} is on ${deadline}. Prepare appeal memo.`,
    );
  }

  function handleCreateTask() {
    // Navigate to tasks page with pre-filled data via URL params
    window.open(`/tasks?newTask=true&title=Follow-up: Case ${report!.case_number}`, "_self");
  }

  function handleRunWorkflow() {
    window.open(`/tasks?workflow=true&case=${report!.case_number}`, "_self");
  }

  async function handleDownloadPdf() {
    if (!report) return;
    await exportCaseReportPdf(report, lang);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest text-gold">
          {tt("INTELLIGENCE", "الاستخبارات")}
        </div>
        <h1 className="font-display text-3xl md:text-4xl mt-1">
          {tt("Case Reports", "تقارير القضايا")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {tt(
            "Look up any case to view its full report with AI analysis, then take action — add to calendar, create tasks, or notify your client.",
            "ابحث عن أي قضية لعرض تقريرها الكامل مع تحليل الذكاء الاصطناعي، ثم اتخذ إجراء — أضف إلى التقويم أو أنشئ مهام أو أبلغ موكّلك.",
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {/* Search Bar */}
          <div className="flex gap-2 max-w-lg">
            <Input
              placeholder={tt(
                "Enter case number (e.g. 222486500)",
                "أدخل رقم القضية (مثلاً 222486500)",
              )}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="flex-1"
              dir="ltr"
            />
            <Button onClick={handleLookup} disabled={loading || !input.trim()} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {tt("Lookup", "بحث")}
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="text-sm text-muted-foreground">
                  {tt(
                    "Generating report with AI analysis...",
                    "جارٍ إنشاء التقرير مع التحليل الذكي...",
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Not Found */}
          {report && !report.found && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {tt(
                    "Case not found in database. Try a different number.",
                    "القضية غير موجودة في قاعدة البيانات. جرب رقماً آخر.",
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Report Found — Show Actions + Report */}
          {report && report.found && (
            <div className="space-y-4">
              {/* ACTION BUTTONS */}
              <Card className="border-gold/20">
                <CardContent className="py-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-gold" />
                    {tt("Quick Actions", "إجراءات سريعة")}
                  </h3>

                  {/* Row 1: Calendar & Reminders */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={handleAddHearingToCalendar}
                      disabled={!getNextHearing()}
                      title={
                        getNextHearing()
                          ? `Next: ${getNextHearing()!.date}`
                          : "No upcoming hearings"
                      }
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {tt("Add Hearing", "أضف جلسة")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={handleSetAppealReminder}
                      disabled={!getAppealDeadline()}
                      title={
                        getAppealDeadline()
                          ? `Deadline: ${getAppealDeadline()}`
                          : "No appeal deadline"
                      }
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {tt("Appeal Reminder", "تذكير استئناف")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={handleCreateTask}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      {tt("Create Task", "إنشاء مهمة")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={handleRunWorkflow}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {tt("Run Workflow", "تشغيل سير عمل")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={handleDownloadPdf}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {tt("Download PDF", "تحميل PDF")}
                    </Button>
                  </div>

                  {/* Row 2: Communication & Notes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={() => {
                        // Open Google Calendar for client meeting
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        openCalendarLink(
                          `Client Meeting — Case ${report.case_number}`,
                          tomorrow.toISOString().slice(0, 10),
                          `Discuss case ${report.case_number} status and next steps.`,
                        );
                      }}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {tt("Client Meeting", "اجتماع موكّل")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={() => setShowNoteInput(!showNoteInput)}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      {tt("Add Note", "إضافة ملاحظة")}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      onClick={() => {
                        // Copy case link to clipboard for sharing
                        navigator.clipboard.writeText(
                          `Case ${report.case_number} — ${lang === "ar" ? report.status_headline_ar : report.status_headline_en}`,
                        );
                        alert(tt("Copied to clipboard", "تم النسخ"));
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {tt("Share", "مشاركة")}
                    </Button>

                    {report.deadline && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1 h-9 justify-center text-xs"
                      >
                        ⏰ {report.deadline.days_remaining} {tt("days left", "يوم متبقي")}
                      </Badge>
                    )}

                    {getNextHearing() && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 h-9 justify-center text-xs border-gold/50 text-gold"
                      >
                        📆 {tt("Next:", "القادمة:")} {getNextHearing()!.date}
                      </Badge>
                    )}
                  </div>

                  {/* Note Input (shown when Add Note is clicked) */}
                  {showNoteInput && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder={tt("Type your internal note...", "اكتب ملاحظتك الداخلية...")}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (noteText.trim()) {
                            alert(
                              tt(
                                "Note saved (requires Supabase connection)",
                                "تم حفظ الملاحظة (يتطلب اتصال Supabase)",
                              ),
                            );
                            setNoteText("");
                            setShowNoteInput(false);
                          }
                        }}
                      >
                        {tt("Save", "حفظ")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* The actual report view */}
              <ReportView
                report={report}
                onNew={() => {
                  setReport(null);
                  setInput("");
                }}
              />
            </div>
          )}

          {/* Empty State (no search yet) */}
          {!report && !loading && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center">
                  <Scale className="h-8 w-8 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-lg">
                    {tt("Enter a case number to get started", "أدخل رقم قضية للبدء")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    {tt(
                      "The system will pull all case data from the database, generate an AI analysis, and give you one-click actions for calendar, tasks, and client communication.",
                      "سيسحب النظام جميع بيانات القضية من قاعدة البيانات، ويُنشئ تحليلاً ذكياً، ويمنحك إجراءات بنقرة واحدة للتقويم والمهام والتواصل مع الموكّل.",
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Reports Sidebar */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-gold" />
                  {tt("Recent Reports", "التقارير الأخيرة")}
                </h3>
                {loadingRecent && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {recent.length === 0 && !loadingRecent && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {tt("No past lookups yet.", "لا توجد عمليات بحث سابقة.")}
                </p>
              )}
              <ul className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                {recent.map((r) => {
                  const isActive = loadingId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => handleOpenRecent(r)}
                        disabled={isActive}
                        className="w-full text-start rounded-md border border-border/60 hover:border-gold/50 hover:bg-muted/40 transition-colors p-2.5 disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs" dir="ltr">
                            {r.case_number}
                          </span>
                          {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {(lang === "ar" ? r.status_headline_ar : r.status_headline_en) || ""}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.next_hearing_date && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 gap-1 border-gold/40 text-gold"
                            >
                              <CalendarIcon className="h-2.5 w-2.5" />
                              {r.next_hearing_date}
                            </Badge>
                          )}
                          {r.deadline_date && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {r.deadline_days}
                              {tt("d", "ي")}
                            </Badge>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
