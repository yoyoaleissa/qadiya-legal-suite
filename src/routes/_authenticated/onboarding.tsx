import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Loader2, Mail, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { createFirm, acceptInvitation, getMyFirm } from "@/lib/firms.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your firm — Qadiya OS" },
      {
        name: "description",
        content: "Create a new firm or join an existing one to get started with Qadiya OS.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runCreate = useServerFn(createFirm);
  const runAccept = useServerFn(acceptInvitation);
  const isAr = lang === "ar";

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("pendingInviteToken") ?? "";
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await runCreate({ data: { name_en: nameEn, name_ar: nameAr } });
      await qc.invalidateQueries();
      toast.success(t("Firm created", "تم إنشاء المكتب"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await runAccept({ data: { token: token.trim() } });
      sessionStorage.removeItem("pendingInviteToken");
      await qc.invalidateQueries();
      toast.success(t("Joined firm", "تم الانضمام إلى المكتب"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="mx-auto max-w-lg py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
          <Scale className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold">
          <span className={isAr ? "font-arabic" : ""}>
            {t("Set up your firm", "إعداد المكتب")}
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className={isAr ? "font-arabic" : ""}>
            {t(
              "Create a new firm to bring your team in, or accept an invitation to join one.",
              "أنشئ مكتباً جديداً لإحضار فريقك، أو اقبل دعوة للانضمام إلى مكتب موجود.",
            )}
          </span>
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={token ? "invite" : "create"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className={isAr ? "font-arabic" : ""}>
                  {t("New firm", "مكتب جديد")}
                </span>
              </TabsTrigger>
              <TabsTrigger value="invite" className="gap-1.5">
                <Mail className="h-4 w-4" />
                <span className={isAr ? "font-arabic" : ""}>
                  {t("Join by invitation", "الانضمام بدعوة")}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name_en">
                    <span className={isAr ? "font-arabic" : ""}>
                      {t("Firm name (English)", "اسم المكتب (إنجليزي)")}
                    </span>
                  </Label>
                  <Input
                    id="name_en"
                    dir="ltr"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Al-Jaber & Partners"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name_ar">
                    <span className={isAr ? "font-arabic" : ""}>
                      {t("Firm name (Arabic)", "اسم المكتب (عربي)")}
                    </span>
                  </Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مكتب الجابر وشركاؤه"
                    className="font-arabic"
                  />
                </div>
                <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span className={isAr ? "font-arabic" : ""}>
                    {t("Create firm", "إنشاء المكتب")}
                  </span>
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="invite" className="mt-6">
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="token">
                    <span className={isAr ? "font-arabic" : ""}>
                      {t("Invitation token", "رمز الدعوة")}
                    </span>
                  </Label>
                  <Input
                    id="token"
                    dir="ltr"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="a1b2c3d4e5f6..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className={isAr ? "font-arabic" : ""}>
                      {t(
                        "Paste the token from the invitation link your firm sent you.",
                        "الصق الرمز من رابط الدعوة الذي أرسله لك مكتبك.",
                      )}
                    </span>
                  </p>
                </div>
                <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span className={isAr ? "font-arabic" : ""}>
                    {t("Accept invitation", "قبول الدعوة")}
                  </span>
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
