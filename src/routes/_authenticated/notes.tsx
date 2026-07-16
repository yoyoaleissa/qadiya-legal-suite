import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMyCaseNotes, createCaseNote } from "@/lib/collaboration.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StickyNote, Lock, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Case Notes — Qadiya OS" }] }),
  component: NotesPage,
});

function NotesPage() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const fetchNotes = useServerFn(listMyCaseNotes);
  const addNote = useServerFn(createCaseNote);
  const { data, isLoading } = useQuery({ queryKey: ["case-notes"], queryFn: () => fetchNotes() });

  const [caseNumber, setCaseNumber] = useState("");
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!caseNumber.trim() || !body.trim()) throw new Error("Case number and note required");
      const { data: cs, error } = await supabase
        .from("cases")
        .select("id")
        .eq("case_number", caseNumber.trim())
        .maybeSingle();
      if (error || !cs) throw new Error(t("Case not found", "لم يتم العثور على القضية"));
      return addNote({ data: { case_id: cs.id, body: body.trim(), is_internal: isInternal } });
    },
    onSuccess: () => {
      toast.success(t("Note added", "تمت إضافة الملاحظة"));
      setBody("");
      qc.invalidateQueries({ queryKey: ["case-notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSubmitting(false),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <StickyNote className="h-6 w-6 text-gold" />
        <div>
          <h1 className={`text-2xl font-display ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("Case Notes", "ملاحظات القضية")}
          </h1>
          <p className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {t(
              "Internal thread for the team — never shared with the client unless marked shared.",
              "سجل داخلي للفريق — لا يُشارك مع الموكّل إلا عند التحديد.",
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={lang === "ar" ? "font-arabic" : ""}>
            {t("Add a note", "إضافة ملاحظة")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t("Case number (e.g. 2025/1234)", "رقم القضية (مثال: 2025/1234)")}
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
          />
          <Textarea
            placeholder={t("Write your note…", "اكتب ملاحظتك…")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            dir={lang === "ar" ? "rtl" : "ltr"}
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {t("Internal only (staff)", "داخلي فقط (الموظفون)")}
              </span>
            </label>
            <Button
              onClick={() => {
                setSubmitting(true);
                mutation.mutate();
              }}
              disabled={submitting || !caseNumber.trim() || !body.trim()}
            >
              {t("Add note", "إضافة")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={lang === "ar" ? "font-arabic" : ""}>
            {t("Recent notes", "أحدث الملاحظات")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("Loading…", "جارٍ التحميل…")}
            </p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("No notes yet.", "لا توجد ملاحظات.")}
            </p>
          ) : (
            <div className="space-y-3">
              {data.map((n) => (
                <div key={n.id} className="rounded-md border p-3 bg-card">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Badge variant="outline" className="font-mono">
                      {n.case_number ?? n.case_id.slice(0, 8)}
                    </Badge>
                    {n.is_internal ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {t("internal", "داخلي")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {t("shared", "مُشارك")}
                      </span>
                    )}
                    <span className="ms-auto">
                      {n.author_name ?? "—"} ·{" "}
                      {new Date(n.created_at).toLocaleString(lang === "ar" ? "ar-KW" : "en-GB")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" dir="auto">
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
