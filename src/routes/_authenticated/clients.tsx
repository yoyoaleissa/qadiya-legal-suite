import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, FileText, Scale, Loader2, ChevronRight, MessageSquare, Plus, CalendarPlus } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients & Cases — Qadiya OS" },
      { name: "description", content: "Client profiles, matters, and case lifecycle for your Kuwaiti law firm." },
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
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [chatClient, setChatClient] = useState<{ id: string; name: string } | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);

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
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tt("CRM", "إدارة الموكّلين")}</div>
          <h1 className="font-display text-3xl">{tt("Clients & Cases", "الموكّلون والقضايا")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt("Select a client to view their legal matter and case history.", "اختر موكّلاً لعرض موضوع نزاعه وسجل قضاياه.")}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt("Search clients…", "بحث…")} className="ps-9" />
          </div>
          <Button className="gap-2 bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90 shrink-0" onClick={() => setShowCreateClient(true)}>
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
            const displayName = lang === "ar" ? c.name_ar ?? c.name : c.name;
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
      <CreateClientDialog open={showCreateClient} onClose={() => setShowCreateClient(false)} tt={tt} lang={lang} />
    </div>
  );

  function CreateClientDialog({ open, onClose, tt, lang }: { open: boolean; onClose: () => void; tt: (en: string, ar: string) => string; lang: string }) {
    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const runCreate = useServerFn(createClient);
    const qc = useQueryClient();

    const handleSubmit = async () => {
      if (!name.trim()) return;
      setLoading(true);
      try {
        await runCreate({ data: { name, name_ar: nameAr || undefined, phone: phone || undefined, email: email || undefined, notes: notes || undefined } });
        qc.invalidateQueries({ queryKey: ["clients"] });
        onClose();
        setName(""); setNameAr(""); setPhone(""); setEmail(""); setNotes("");
      } finally { setLoading(false); }
    };

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{tt("New Client", "موكّل جديد")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground">{tt("Name (English)", "الاسم (إنجليزي)")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kuwait Trading Co." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{tt("Name (Arabic)", "الاسم (عربي)")}</label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="شركة الكويت للتجارة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{tt("Phone", "الهاتف")}</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+965 XXXX XXXX" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{tt("Email", "البريد")}</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{tt("Legal Matter / Notes", "موضوع النزاع / ملاحظات")}</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={tt("Brief description of the legal matter", "وصف موجز لموضوع النزاع")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{tt("Cancel", "إلغاء")}</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || loading} className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("Create Client", "إنشاء موكّل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function ClientDialog({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
    const runDetail = useServerFn(getClientDetail);
    const [addEventCase, setAddEventCase] = useState<{ id: string; title: string; status: string } | null>(null);
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
                    {lang === "ar" ? detail.name_ar ?? detail.name : detail.name}
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
                    const displayName = lang === "ar" ? detail.name_ar ?? detail.name : detail.name;
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
                  <h3 className="font-display text-lg mb-3">{tt("Case history", "سجل القضايا")}</h3>
                  {detail.cases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tt("No cases on file yet.", "لا توجد قضايا مسجلة.")}</p>
                  ) : (
                    <div className="space-y-4">
                      {detail.cases.map((cs) => (
                        <div key={cs.id} className="rounded-lg border bg-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">
                                <span className={lang === "ar" ? "font-arabic" : ""}>
                                  {lang === "ar" ? cs.title_ar ?? cs.title : cs.title}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {tt("Case", "قضية")} #{cs.case_number}
                                {cs.case_type ? ` · ${lang === "ar" ? cs.case_type_ar ?? cs.case_type : cs.case_type}` : ""}
                              </div>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(cs.overall_status)}`}>
                              {tt(cs.overall_status, cs.overall_status === "closed" ? "مغلقة" : cs.overall_status === "active" ? "نشطة" : cs.overall_status)}
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5"
                            onClick={() => setAddEventCase({ id: cs.id, title: cs.title ?? cs.case_number, status: cs.overall_status })}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            {tt("Add Event", "إضافة حدث")}
                          </Button>


                          {cs.timeline.length > 0 && (
                            <ol className="mt-4 space-y-3 border-s ps-4">
                              {cs.timeline.map((ev, i) => (
                                <li key={i} className="relative">
                                  <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-background" />
                                  <div className="text-xs text-muted-foreground">{ev.event_date}</div>
                                  <div className="text-sm font-medium">
                                    <span className={lang === "ar" ? "font-arabic" : ""}>
                                      {lang === "ar" ? ev.title_ar ?? ev.title : ev.title}
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
    );
  }
}
