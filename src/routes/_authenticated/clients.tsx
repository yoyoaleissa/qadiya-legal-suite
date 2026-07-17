import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  FileText,
  Scale,
  Loader2,
  ChevronRight,
  MessageSquare,
  Plus,
  CalendarPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { EmptyState } from "@/components/EmptyState";
import { ClientChat } from "@/components/ClientChat";
import { listClients, getClientDetail } from "@/lib/clients.functions";
import { createClient, addTimelineEvent } from "@/lib/cases.functions";
import { checkConflict, type ConflictMatch } from "@/lib/insights.functions";
import { AlertTriangle } from "lucide-react";
import { ConflictChecker } from "@/components/ConflictChecker";

export const Route = createFileRoute("/_authenticated/clients")({
  validateSearch: (search: Record<string, unknown>): { clientId?: string } => ({
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Clients & Cases — Qadiya OS" },
      {
        name: "description",
        content: "Client profiles, matters, and case lifecycle for your Kuwaiti law firm.",
      },
    ],
  }),
  component: ClientsPage,
});

function statusTone(status: string) {
  switch (status) {
    case "closed":
      return "bg-muted text-muted-foreground";
    case "active":
      return "bg-success/15 text-success";
    default:
      return "bg-gold/15 text-gold";
  }
}

function ClientsPage() {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { clientId } = Route.useSearch();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(clientId ?? null);
  const [chatClient, setChatClient] = useState<{ id: string; name: string } | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);

  useEffect(() => {
    if (clientId) setOpenId(clientId);
  }, [clientId]);

  const runList = useServerFn(listClients);
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => runList(),
  });

  const filtered = (clients ?? []).filter((c) => {
    const hay = `${c.name} ${c.name_ar ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {tt("CRM", "إدارة الموكّلين")}
          </div>
          <h1 className="font-display text-3xl">{tt("Clients & Cases", "الموكّلون والقضايا")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt(
              "Select a client to view their legal matter and case history.",
              "اختر موكّلاً لعرض موضوع نزاعه وسجل قضاياه.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tt("Search clients…", "بحث…")}
              className="ps-9"
            />
          </div>
          <Button
            className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90 shrink-0"
            onClick={() => setShowCreateClient(true)}
          >
            <Plus className="h-4 w-4" />
            {tt("New Client", "موكّل جديد")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt("Loading clients…", "جارٍ تحميل الموكّلين…")}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title={tt("No clients found", "لا يوجد موكّلون")}
              desc={tt(
                "Connected to the live backend. Client and case records will appear here as your firm adds them.",
                "متصل بالخادم المباشر. ستظهر سجلات الموكّلين والقضايا هنا بمجرد إضافتها.",
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const displayName = lang === "ar" ? (c.name_ar ?? c.name) : c.name;
            return (
              <div
                key={c.id}
                className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4 transition-colors hover:border-gold/50 hover:bg-accent/40"
              >
                <button
                  onClick={() => setOpenId(c.id)}
                  className="flex flex-1 items-center gap-4 min-w-0 text-start"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-navy text-white dark:bg-gold dark:text-navy flex items-center justify-center font-display">
                    {displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate group-hover:text-gold transition-colors">
                      <span className={lang === "ar" ? "font-arabic" : ""}>{displayName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-md">
                      {c.notes ?? tt("No matter summary", "لا يوجد ملخص")}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="gap-1 hidden sm:flex">
                    <FileText className="h-3 w-3" />
                    {c.case_count} {tt("cases", "قضايا")}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setChatClient({ id: c.id, name: displayName })}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tt("Message", "مراسلة")}</span>
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180 group-hover:text-gold transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClientDialog clientId={openId} onClose={() => setOpenId(null)} />
      <ClientChat
        clientId={chatClient?.id ?? null}
        clientName={chatClient?.name ?? ""}
        onClose={() => setChatClient(null)}
      />
      <CreateClientDialog
        open={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        tt={tt}
        lang={lang}
      />
    </div>
  );

  function CreateClientDialog({
    open,
    onClose,
    tt,
    lang,
  }: {
    open: boolean;
    onClose: () => void;
    tt: (en: string, ar: string) => string;
    lang: string;
  }) {
    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [nationalId, setNationalId] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [conflicts, setConflicts] = useState<ConflictMatch[] | null>(null);
    const [ackConflict, setAckConflict] = useState(false);
    const [checking, setChecking] = useState(false);
    const runCreate = useServerFn(createClient);
    const runCheck = useServerFn(checkConflict);
    const qc = useQueryClient();

    const runConflictCheck = async () => {
      if (!name.trim() && !nameAr.trim() && !nationalId.trim()) return;
      setChecking(true);
      try {
        const matches = await runCheck({
          data: {
            name: name.trim() || nameAr.trim(),
            name_ar: nameAr.trim() || undefined,
            national_id: nationalId.trim() || undefined,
          },
        });
        setConflicts(matches);
        setAckConflict(false);
      } finally {
        setChecking(false);
      }
    };

    const handleSubmit = async () => {
      if (!name.trim()) return;
      // Require a conflict check before creating
      if (conflicts === null) {
        await runConflictCheck();
        return;
      }
      if (conflicts.length > 0 && !ackConflict) return;
      setLoading(true);
      try {
        await runCreate({
          data: {
            name,
            name_ar: nameAr || undefined,
            phone: phone || undefined,
            email: email || undefined,
            national_id: nationalId || undefined,
            notes: notes || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: ["clients"] });
        onClose();
        setName("");
        setNameAr("");
        setPhone("");
        setEmail("");
        setNationalId("");
        setNotes("");
        setConflicts(null);
        setAckConflict(false);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tt("New Client", "موكّل جديد")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Name (English)", "الاسم (إنجليزي)")}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kuwait Trading Co."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Name (Arabic)", "الاسم (عربي)")}
              </label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                placeholder="شركة الكويت للتجارة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{tt("Phone", "الهاتف")}</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+965 XXXX XXXX"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{tt("Email", "البريد")}</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("National ID / Civil ID", "الرقم المدني")}
              </label>
              <Input
                value={nationalId}
                onChange={(e) => {
                  setNationalId(e.target.value);
                  setConflicts(null);
                }}
                placeholder="XXXXXXXXXXXX"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Legal Matter / Notes", "موضوع النزاع / ملاحظات")}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={tt("Brief description of the legal matter", "وصف موجز لموضوع النزاع")}
              />
            </div>
            {conflicts && conflicts.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  {tt(
                    `${conflicts.length} possible conflict${conflicts.length > 1 ? "s" : ""} found`,
                    `تم العثور على ${conflicts.length} تعارض محتمل`,
                  )}
                </div>
                <ul className="text-xs space-y-1">
                  {conflicts.map((c) => (
                    <li key={c.client_id} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {c.match_type}
                      </Badge>
                      <span>{lang === "ar" ? c.name_ar ?? c.name : c.name}</span>
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={ackConflict}
                    onChange={(e) => setAckConflict(e.target.checked)}
                  />
                  {tt(
                    "I've reviewed these and confirm no conflict",
                    "راجعت النتائج وأؤكد عدم وجود تعارض",
                  )}
                </label>
              </div>
            )}
            {conflicts && conflicts.length === 0 && (
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                {tt("No conflicts found.", "لا توجد تعارضات.")}
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <ConflictChecker />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {tt("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="outline"
              onClick={runConflictCheck}
              disabled={checking || (!name.trim() && !nameAr.trim() && !nationalId.trim())}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tt("Check for conflicts", "فحص التعارض")
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !name.trim() ||
                loading ||
                (conflicts !== null && conflicts.length > 0 && !ackConflict)
              }
              className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : conflicts === null ? (
                tt("Check & Create", "فحص وإنشاء")
              ) : (
                tt("Create Client", "إنشاء موكّل")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function ClientDialog({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
    const runDetail = useServerFn(getClientDetail);
    const [addEventCase, setAddEventCase] = useState<{
      id: string;
      title: string;
      status: string;
    } | null>(null);
    const { data: detail, isLoading: loadingDetail } = useQuery({
      queryKey: ["client", clientId],
      queryFn: () => runDetail({ data: { clientId: clientId! } }),
      enabled: !!clientId,
    });

    return (
      <>
        <Dialog open={!!clientId} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {loadingDetail || !detail ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tt("Loading…", "جارٍ التحميل…")}
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    <span className={lang === "ar" ? "font-arabic" : ""}>
                      {lang === "ar" ? (detail.name_ar ?? detail.name) : detail.name}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    {tt("Legal matter & case history", "موضوع النزاع وسجل القضايا")}
                  </DialogDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit gap-1.5"
                    onClick={() => {
                      const displayName =
                        lang === "ar" ? (detail.name_ar ?? detail.name) : detail.name;
                      onClose();
                      setChatClient({ id: detail.id, name: displayName });
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {tt("Message client", "مراسلة الموكّل")}
                  </Button>
                </DialogHeader>

                <div className="space-y-6 pt-2">
                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold mb-1">
                      <Scale className="h-3.5 w-3.5" />
                      {tt("The legal problem", "موضوع النزاع")}
                    </div>
                    <p className="text-sm leading-relaxed">
                      {detail.notes ?? tt("No matter summary recorded.", "لا يوجد ملخص مسجّل.")}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-display text-lg mb-3">
                      {tt("Case history", "سجل القضايا")}
                    </h3>
                    {detail.cases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {tt("No cases on file yet.", "لا توجد قضايا مسجلة.")}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {detail.cases.map((cs) => (
                          <div key={cs.id} className="rounded-lg border bg-card p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">
                                  <span className={lang === "ar" ? "font-arabic" : ""}>
                                    {lang === "ar" ? (cs.title_ar ?? cs.title) : cs.title}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {tt("Case", "قضية")} #{cs.case_number}
                                  {cs.case_type
                                    ? ` · ${lang === "ar" ? (cs.case_type_ar ?? cs.case_type) : cs.case_type}`
                                    : ""}
                                </div>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(cs.overall_status)}`}
                              >
                                {tt(
                                  cs.overall_status,
                                  cs.overall_status === "closed"
                                    ? "مغلقة"
                                    : cs.overall_status === "active"
                                      ? "نشطة"
                                      : cs.overall_status,
                                )}
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 gap-1.5"
                              onClick={() =>
                                setAddEventCase({
                                  id: cs.id,
                                  title: cs.title ?? cs.case_number,
                                  status: cs.overall_status,
                                })
                              }
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              {tt("Add Event", "إضافة حدث")}
                            </Button>

                            {cs.timeline.length > 0 && (
                              <ol className="mt-4 space-y-3 border-s ps-4">
                                {cs.timeline.map((ev, i) => (
                                  <li key={i} className="relative">
                                    <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-background" />
                                    <div className="text-xs text-muted-foreground">
                                      {ev.event_date}
                                    </div>
                                    <div className="text-sm font-medium">
                                      <span className={lang === "ar" ? "font-arabic" : ""}>
                                        {lang === "ar" ? (ev.title_ar ?? ev.title) : ev.title}
                                      </span>
                                    </div>
                                    {(lang === "ar" ? ev.description_ar : ev.description) && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {lang === "ar" ? ev.description_ar : ev.description}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        <AddEventDialog
          caseInfo={addEventCase}
          clientId={clientId}
          onClose={() => setAddEventCase(null)}
          tt={tt}
          lang={lang}
        />
      </>
    );
  }

  function AddEventDialog({
    caseInfo,
    clientId,
    onClose,
    tt,
    lang,
  }: {
    caseInfo: { id: string; title: string; status: string } | null;
    clientId: string | null;
    onClose: () => void;
    tt: (en: string, ar: string) => string;
    lang: string;
  }) {
    const [title, setTitle] = useState("");
    const [titleAr, setTitleAr] = useState("");
    const [description, setDescription] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [updateStatus, setUpdateStatus] = useState(false);
    const [newStatus, setNewStatus] = useState<
      "open" | "active" | "appeal" | "execution" | "closed"
    >("active");
    const [loading, setLoading] = useState(false);
    const runAdd = useServerFn(addTimelineEvent);
    const qc = useQueryClient();

    const handleSubmit = async () => {
      if (!caseInfo || !title.trim()) return;
      setLoading(true);
      try {
        await runAdd({
          data: {
            case_id: caseInfo.id,
            title,
            title_ar: titleAr || undefined,
            description: description || undefined,
            event_date: eventDate || undefined,
            new_status: updateStatus ? newStatus : undefined,
          },
        });
        qc.invalidateQueries({ queryKey: ["client", clientId] });
        onClose();
        setTitle("");
        setTitleAr("");
        setDescription("");
        setEventDate("");
        setUpdateStatus(false);
        setNewStatus("active");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={!!caseInfo} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tt("Add Timeline Event", "إضافة حدث زمني")}</DialogTitle>
            {caseInfo && (
              <DialogDescription>
                <span className={lang === "ar" ? "font-arabic" : ""}>{caseInfo.title}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Event date", "تاريخ الحدث")}
              </label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {tt("Title (English)", "العنوان (إنجليزي)")}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tt("e.g. Hearing adjourned", "مثال: تأجيل الجلسة")}
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
                placeholder="تأجيل الجلسة"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{tt("Details", "التفاصيل")}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.checked)}
                  className="h-4 w-4 accent-[var(--gold)]"
                />
                {tt("Also update case status", "تحديث حالة القضية أيضاً")}
              </label>
              {updateStatus && (
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as typeof newStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{tt("Open", "مفتوحة")}</SelectItem>
                    <SelectItem value="active">{tt("Active", "نشطة")}</SelectItem>
                    <SelectItem value="appeal">{tt("Appeal", "استئناف")}</SelectItem>
                    <SelectItem value="execution">{tt("Execution", "تنفيذ")}</SelectItem>
                    <SelectItem value="closed">{tt("Closed", "مغلقة")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tt("Add Event", "إضافة الحدث")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
