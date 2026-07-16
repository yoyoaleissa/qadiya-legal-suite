import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Mail, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { getInvitationByToken } from "@/lib/firms.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Firm invitation — Qadiya OS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const isAr = lang === "ar";
  const runLookup = useServerFn(getInvitationByToken);

  const { data: invitation, isLoading } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => runLookup({ data: { token } }),
  });

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  const handleContinue = () => {
    sessionStorage.setItem("pendingInviteToken", token);
    if (signedIn) {
      navigate({ to: "/onboarding" });
    } else {
      navigate({ to: "/login" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="flex min-h-screen items-center justify-center bg-background p-6"
      >
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-semibold">
              <span className={isAr ? "font-arabic" : ""}>
                {t("Invitation not found", "الدعوة غير موجودة")}
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className={isAr ? "font-arabic" : ""}>
                {t(
                  "This invitation link is invalid or has expired. Ask your firm to send a new one.",
                  "رابط الدعوة غير صالح أو منتهي الصلاحية. اطلب من مكتبك إرسال دعوة جديدة.",
                )}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firmName = isAr ? invitation.firm_name_ar : invitation.firm_name_en;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
            <Scale className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-semibold">
            <span className={isAr ? "font-arabic" : ""}>
              {t("You're invited", "أنت مدعو")}
            </span>
          </h1>
          <p className="mt-3 text-sm">
            <span className={isAr ? "font-arabic" : ""}>
              {t("Join", "الانضمام إلى")}{" "}
            </span>
            <strong className={isAr ? "font-arabic" : ""}>{firmName}</strong>
            <br />
            <span className="text-muted-foreground">
              <span className={isAr ? "font-arabic" : ""}>
                {t("as", "بصفة")}{" "}
              </span>
              <span className="font-medium capitalize">{invitation.role}</span>
            </span>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            <span className={isAr ? "font-arabic" : ""}>
              {t("Invited email:", "البريد المدعو:")}
            </span>{" "}
            <span dir="ltr" className="font-mono">
              {invitation.email}
            </span>
          </p>
          <Button onClick={handleContinue} className="mt-6 w-full">
            <span className={isAr ? "font-arabic" : ""}>
              {signedIn
                ? t("Accept invitation", "قبول الدعوة")
                : t("Sign in to accept", "سجّل الدخول للقبول")}
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
