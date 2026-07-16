import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scale, FileText, Calendar, Clock, MapPin, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CourtMapLink } from "@/components/CourtMapLink";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "بوابة الموكل — Qadiya OS Client Portal" },
      {
        name: "description",
        content:
          "Track your Kuwait legal case status, next hearing dates, and shared documents from your lawyer.",
      },
      {
        property: "og:title",
        content: "بوابة الموكل — Qadiya OS Client Portal",
      },
      {
        property: "og:description",
        content:
          "Track your Kuwait legal case status, next hearing dates, and shared documents from your lawyer.",
      },
      { property: "og:url", content: "https://qadiya.lovable.app/portal" },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/e1f1d6b8-c929-40e4-b365-93440d11ad42",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/e1f1d6b8-c929-40e4-b365-93440d11ad42",
      },
    ],
    links: [{ rel: "canonical", href: "https://qadiya.lovable.app/portal" }],
  }),
  component: ClientPortal,
});

/**
 * Client Portal — A simplified, read-only interface for law firm clients.
 * Clients can:
 * - View their active cases and status
 * - See next hearing dates with court map links
 * - Download shared documents
 * - Chat with the AI assistant about their case
 *
 * Authentication: Uses Supabase Auth with role="client" in profiles table.
 * If not logged in, shows a case lookup by number (public, no auth needed).
 */
function ClientPortal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caseNumber, setCaseNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  const handleCaseLookup = async () => {
    if (!caseNumber.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);

    try {
      // Check if we have a cached report for this case
      const { data } = await supabase
        .from("case_reports")
        .select("*")
        .eq("case_number", caseNumber.trim())
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLookupResult(data);
      } else {
        setLookupResult({ notFound: true });
      }
    } catch {
      setLookupResult({ notFound: true });
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Scale className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      {/* Header */}
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
              onClick={() => {
                supabase.auth.signOut();
                setSession(null);
              }}
            >
              <LogOut className="h-4 w-4 ml-1" />
              خروج
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">متابعة قضيتك</h1>
          <p className="text-muted-foreground">أدخل الرقم الآلي للقضية لمعرفة آخر المستجدات</p>
        </div>

        {/* Case Lookup */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="الرقم الآلي (مثال: 222486500)"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCaseLookup()}
                className="text-lg text-center"
                dir="ltr"
              />
              <Button onClick={handleCaseLookup} disabled={lookupLoading}>
                {lookupLoading ? <Clock className="h-4 w-4 animate-spin" /> : "بحث"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {lookupResult && !lookupResult.notFound && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تقرير القضية {caseNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lookupResult.json_data && (
                  <>
                    {/* Status */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">الحالة</span>
                      <Badge
                        variant={
                          lookupResult.json_data.status === "مغلقة" ? "secondary" : "default"
                        }
                      >
                        {lookupResult.json_data.status || "نشطة"}
                      </Badge>
                    </div>

                    {/* Court */}
                    {lookupResult.json_data.court && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">المحكمة</span>
                        <CourtMapLink courtName={lookupResult.json_data.court} />
                      </div>
                    )}

                    {/* Hearings */}
                    {lookupResult.json_data.hearings?.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">الجلسات</span>
                        </div>
                        <div className="space-y-1">
                          {lookupResult.json_data.hearings.slice(-3).map((h: any, i: number) => (
                            <div
                              key={i}
                              className="text-sm text-muted-foreground flex justify-between"
                            >
                              <span>{h.date}</span>
                              <span>{h.decision || h.type || ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Judgments */}
                    {lookupResult.json_data.judgments?.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="h-4 w-4" />
                          <span className="text-sm font-medium">الأحكام</span>
                        </div>
                        <div className="space-y-1">
                          {lookupResult.json_data.judgments.map((j: any, i: number) => (
                            <div key={i} className="text-sm text-muted-foreground">
                              {j.decision || j.text || `حكم ${i + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  آخر تحديث: {new Date(lookupResult.updated_at).toLocaleDateString("ar-KW")}
                </p>
              </CardContent>
            </Card>

            {/* Telegram Bot CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium mb-2">احصل على تقرير PDF مفصّل عبر تيليجرام</p>
                <Button asChild variant="outline" size="sm">
                  <a href="https://t.me/Qadiya_bot" target="_blank" rel="noopener noreferrer">
                    فتح بوت قضية
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {lookupResult?.notFound && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <CardContent className="pt-6 text-center">
              <p className="text-sm">
                لم يتم العثور على تقرير لهذه القضية. جرّب الرقم الآلي (9 أرقام) أو تواصل مع مكتب
                المحاماة.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-xs text-muted-foreground">
          <p>Powered by Qadiya AI 🤖</p>
          <p className="mt-1">هذه البوابة للاطلاع فقط ولا تُغني عن الاستشارة القانونية</p>
        </footer>
      </main>
    </div>
  );
}
