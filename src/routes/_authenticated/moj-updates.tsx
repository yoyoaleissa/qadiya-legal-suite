import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, ScrollText } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { listMojUpdates, setMojUpdateStatus } from "@/lib/moj-updates.functions";
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
        {pending > 0 && (
          <Badge variant="destructive" className="shrink-0">
            {t(`${pending} pending review`, `${pending} بانتظار المراجعة`)}
          </Badge>
        )}
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
