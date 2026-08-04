import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { listMojUpdates, refreshMojUpdates, setMojUpdateStatus } from "@/lib/moj-updates.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/moj-updates")({
  head: () => ({
    meta: [
      { title: "MOJ Updates Pending Review — Qadiya OS" },
      {
        name: "description",
        content:
          "Automatically detected Ministry of Justice regulations, circulars and announcements awaiting review.",
      },
      { property: "og:title", content: "MOJ Updates Pending Review — Qadiya OS" },
      {
        property: "og:description",
        content: "Detected Kuwaiti Ministry of Justice regulatory updates awaiting counsel review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MojUpdatesPage,
});

function snippet(text: string | null | undefined, max = 240) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function MojUpdatesPage() {
  const { t, lang } = useApp();
  const queryClient = useQueryClient();
  const runList = useServerFn(listMojUpdates);
  const runSetStatus = useServerFn(setMojUpdateStatus);
  const runRefresh = useServerFn(refreshMojUpdates);

  const { data: updates, isLoading } = useQuery({
    queryKey: ["moj-updates"],
    queryFn: () => runList(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: "new" | "reviewed" }) => runSetStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moj-updates"] });
    },
    onError: () => {
      toast.error(t("Could not update the review status.", "تعذّر تحديث حالة المراجعة."));
    },
  });

  const refresh = useMutation({
    mutationFn: () => runRefresh(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["moj-updates"] });
      if (!res.aiAvailable) {
        toast.warning(
          t(
            "Detection ran, but no working AI connection is available to summarize the updates.",
            "تمّت عملية الرصد، إلا أنه لا يتوفر اتصال فعّال بالمساعد الذكي لتلخيص المستجدات.",
          ),
        );
        return;
      }
      toast.success(
        t(
          `Detection complete — ${res.inserted} new, ${res.explained} explanation(s) generated.`,
          `اكتمل الرصد — ${res.inserted} مستجد جديد، وتم إعداد ${res.explained} بيان توضيحي.`,
        ),
      );
    },
    onError: () => {
      toast.error(
        t("Could not run the detection job.", "تعذّر تشغيل مهمة رصد المستجدات."),
      );
    },
  });

  const pending = (updates ?? []).filter((u) => u.status === "new").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ScrollText className="h-6 w-6 text-muted-foreground" />
            {t("Detected Updates Pending Review", "مستجدات مرصودة قيد المراجعة")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(
              "Regulations, circulars and announcements automatically detected from the Ministry of Justice public pages. Detection and storage only — nothing here has been verified by counsel or indexed into the AI assistant yet.",
              "لوائح وتعاميم وإعلانات تُرصد آلياً من الصفحات العامة لوزارة العدل. المرحلة الحالية اقتصار على الرصد والحفظ فحسب، دون مراجعة من المحامي ودون إدراجها ضمن قاعدة المعرفة الخاصة بالمساعد الذكي.",
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pending > 0 && <Badge variant="destructive">{t(`${pending} pending review`, `${pending} بانتظار المراجعة`)}</Badge>}
          <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {refresh.isPending
              ? t("Checking…", "جارٍ الرصد…")
              : t("Update Knowledge", "تحديث المعرفة")}
          </Button>
        </div>
      </div>


      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (updates ?? []).length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t(
              "No ministry updates detected yet. The scheduled detection job runs daily.",
              "لم تُرصد أي مستجدات وزارية حتى تاريخه. تعمل مهمة الرصد المجدولة يومياً.",
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(updates ?? []).map((u) => {
          const heading = lang === "ar" ? u.title_ar : u.title || u.title_ar;
          const body = lang === "ar" ? u.content_ar || u.content : u.content || u.content_ar;
          const isReviewed = u.status === "reviewed";
          return (
            <Card key={u.id} className={isReviewed ? "opacity-70" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{heading}</CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{u.category}</Badge>
                    <Badge variant={isReviewed ? "secondary" : "destructive"}>
                      {isReviewed ? t("Reviewed", "روجعت") : t("New", "جديدة")}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Detected", "تاريخ الرصد")}:{" "}
                  {new Date(u.detected_at).toLocaleString(lang === "ar" ? "ar-KW" : "en-GB")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {body && <p className="text-sm text-muted-foreground">{snippet(body)}</p>}

                {explanation ? (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("What this means in practice", "المدلول العملي لهذا المستجد")}
                    </p>
                    <p className="text-sm leading-relaxed">{explanation}</p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    {t(
                      "Raw detected text shown above — needs a working AI connection to summarize.",
                      "المعروض أعلاه هو النص المرصود كما ورد — ويلزم توفّر اتصال فعّال بالمساعد الذكي لإعداد بيان توضيحي له.",
                    )}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">

                  <Button asChild variant="outline" size="sm">
                    <a href={u.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      {t("Open source", "الاطلاع على المصدر")}
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant={isReviewed ? "ghost" : "default"}
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({ id: u.id, status: isReviewed ? "new" : "reviewed" })
                    }
                  >
                    {isReviewed
                      ? t("Mark as pending", "إعادتها قيد المراجعة")
                      : t("Mark as reviewed", "اعتمادها كمراجَعة")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
