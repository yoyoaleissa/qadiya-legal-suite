import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  Scale,
  FileText,
  Calendar,
  MessageCircle,
  LogOut,
  Receipt,
  Send,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CourtMapLink } from "@/components/CourtMapLink";
import {
  getPortalProfile,
  listPortalCases,
  listPortalInvoices,
  listPortalMessages,
  sendPortalMessage,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "بوابة الموكل — Qadiya OS Client Portal" },
      {
        name: "description",
        content:
          "Track your Kuwait legal case status, hearing dates, invoices, and messages from your lawyer.",
      },
      { property: "og:title", content: "بوابة الموكل — Qadiya OS Client Portal" },
      {
        property: "og:description",
        content:
          "Secure client portal for Kuwait law firm clients — cases, invoices, and secure messaging.",
      },
      { property: "og:url", content: "https://qadiya.lovable.app/portal" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://qadiya.lovable.app/portal" }],
  }),
  component: ClientPortal,
});

function ClientPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Scale className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">قضية</span>
            <Badge variant="secondary" className="text-xs">
              بوابة الموكل
            </Badge>
          </div>
          {session && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              <LogOut className="h-4 w-4 ml-1" />
              خروج
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {session ? <PortalHome /> : <PortalGuest />}
        <footer className="text-center mt-12 text-xs text-muted-foreground">
          <p>Powered by Qadiya AI</p>
          <p className="mt-1">هذه البوابة للاطلاع فقط ولا تُغني عن الاستشارة القانونية</p>
        </footer>
      </main>
    </div>
  );
}

/* ----------------- Guest (not signed in) view ----------------- */

function PortalGuest() {
  const [email, setEmail] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [lookup, setLookup] = useState<
    | { notFound: true }
    | { notFound?: false; case_number: string; json_data: Record<string, unknown> | null; updated_at: string }
    | null
  >(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const sendMagic = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/portal` },
      });
      if (error) throw error;
      toast.success("تم إرسال رابط تسجيل الدخول إلى بريدك");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الإرسال");
    } finally {
      setSending(false);
    }
  };

  const doLookup = async () => {
    if (!caseNumber.trim()) return;
    setLookupLoading(true);
    setLookup(null);
    try {
      const { data } = await supabase
        .from("case_reports")
        .select("case_number, json_data, updated_at")
        .eq("case_number", caseNumber.trim())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setLookup({
          case_number: data.case_number,
          json_data: (data.json_data as Record<string, unknown> | null) ?? null,
          updated_at: data.updated_at,
        });
      } else setLookup({ notFound: true });
    } catch {
      setLookup({ notFound: true });
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">متابعة قضيتك</h1>
        <p className="text-muted-foreground">
          سجّل الدخول برابط سحري لعرض قضاياك وفواتيرك، أو ابحث عن قضية بالرقم الآلي
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تسجيل الدخول</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagic()}
              dir="ltr"
            />
            <Button onClick={sendMagic} disabled={sending}>
              {sending ? "…" : "أرسل الرابط"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            سيصلك رابط دخول آمن. يجب أن يكون بريدك مسجّلاً لدى مكتب المحاماة.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            بحث سريع عن قضية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="الرقم الآلي (مثال: 222486500)"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLookup()}
              dir="ltr"
            />
            <Button variant="outline" onClick={doLookup} disabled={lookupLoading}>
              بحث
            </Button>
          </div>
          {lookup && !("notFound" in lookup && lookup.notFound) && "case_number" in lookup && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm space-y-1">
              <div className="font-medium">قضية {lookup.case_number}</div>
              <div className="text-xs text-muted-foreground">
                آخر تحديث: {new Date(lookup.updated_at).toLocaleDateString("ar-KW")}
              </div>
            </div>
          )}
          {lookup && "notFound" in lookup && lookup.notFound && (
            <p className="text-xs mt-3 text-muted-foreground">لم يتم العثور على تقرير لهذه القضية.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------- Signed-in client view ----------------- */

function PortalHome() {
  const fetchProfile = useServerFn(getPortalProfile);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => fetchProfile(),
  });

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground">جاري التحميل…</p>;
  }

  if (!profile?.client) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm">
            بريدك الإلكتروني ({profile?.email}) غير مرتبط بأي ملف موكل في المكتب.
          </p>
          <p className="text-xs text-muted-foreground">
            تواصل مع مكتب المحاماة لربط بريدك بملفك.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">أهلاً {profile.client.name_ar || profile.client.name}</h1>
        <p className="text-sm text-muted-foreground">هذه لوحتك الخاصة كموكل في المكتب.</p>
      </div>

      <Tabs defaultValue="cases">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cases">
            <FileText className="h-4 w-4 ml-1" />
            قضاياي
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 ml-1" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="h-4 w-4 ml-1" />
            رسائل
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cases" className="mt-4">
          <PortalCases />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <PortalInvoices />
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          <PortalMessages />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PortalCases() {
  const fn = useServerFn(listPortalCases);
  const { data, isLoading } = useQuery({ queryKey: ["portal-cases"], queryFn: () => fn() });
  if (isLoading) return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;
  if (!data?.length)
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-center text-muted-foreground">
          لا توجد قضايا مرتبطة بحسابك بعد.
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-3">
      {data.map((c) => (
        <Card key={c.id}>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{c.title_ar || c.title || `قضية ${c.case_number}`}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {c.case_number}
                </div>
              </div>
              <Badge variant={c.overall_status === "closed" ? "secondary" : "default"}>
                {c.overall_status}
              </Badge>
            </div>
            {(c.case_type_ar || c.case_type) && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {c.case_type_ar || c.case_type}
              </div>
            )}
            <div className="pt-1">
              <CourtMapLink courtName={c.case_type_ar || c.case_type || ""} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortalInvoices() {
  const fn = useServerFn(listPortalInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["portal-invoices"], queryFn: () => fn() });
  if (isLoading) return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;
  if (!data?.length)
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-center text-muted-foreground">
          لا توجد فواتير بعد.
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-2">
      {data.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium">
                {inv.description_ar || inv.description || inv.invoice_number}
              </div>
              <div className="text-xs text-muted-foreground" dir="ltr">
                {inv.invoice_number} · {inv.issue_date}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {Number(inv.amount).toFixed(3)} {inv.currency}
              </div>
              <Badge
                variant={
                  inv.status === "paid" ? "secondary" : inv.status === "overdue" ? "destructive" : "default"
                }
              >
                {inv.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortalMessages() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPortalMessages);
  const sendFn = useServerFn(sendPortalMessage);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-messages"],
    queryFn: () => listFn(),
    refetchInterval: 15_000,
  });
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: async () => sendFn({ data: { body: text.trim() } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["portal-messages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="h-72 overflow-y-auto border rounded-md p-3 bg-muted/30 space-y-2">
          {isLoading && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-xs text-muted-foreground text-center">
              ابدأ محادثتك مع مكتب المحاماة.
            </p>
          )}
          {data?.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.sender === "client"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border"
                }`}
              >
                <div>{m.body}</div>
                <div className="text-[10px] opacity-70 mt-1">
                  {new Date(m.created_at).toLocaleString("ar-KW")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب رسالتك…"
          />
          <Button
            onClick={() => text.trim() && send.mutate()}
            disabled={!text.trim() || send.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
