import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Gavel, Loader2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Qadiya OS" },
      {
        name: "description",
        content: "Secure staff sign-in for Qadiya OS, the Kuwait legal practice management suite.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { lang, setLang, t } = useApp();
  const navigate = useNavigate();
  const router = useRouter();
  const isAr = lang === "ar";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // If already signed in, go straight to the dashboard.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/", replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await router.invalidate();
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || null },
          },
        });
        if (error) throw error;
        if (data.session) {
          await router.invalidate();
          navigate({ to: "/", replace: true });
        } else {
          setNotice(
            t(
              "Account created. Please check your email to confirm, then sign in.",
              "تم إنشاء الحساب. يُرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.",
            ),
          );
          setMode("signin");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(message, isAr));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir={isAr ? "rtl" : "ltr"}>
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="grid min-h-screen bg-background lg:grid-cols-2"
    >
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-gold text-navy">
            <Gavel className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-2xl leading-none">
              <span className={isAr ? "font-arabic" : ""}>{t("Qadiya OS", "قضية OS")}</span>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-primary-foreground/60">
              <span className={isAr ? "font-arabic" : ""}>
                {t("Kuwait Legal Suite", "منظومة المحاماة الكويتية")}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <Scale className="mb-5 h-8 w-8 text-gold" />
          <h1 className="font-display text-3xl font-semibold leading-snug">
            <span className={isAr ? "font-arabic" : ""}>
              {t("Clarity in every case.", "وضوحٌ في كل قضية.")}
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            <span className={isAr ? "font-arabic" : ""}>
              {t(
                "AI-drafted case reports, deadline intelligence, and a full practice command center — built for Kuwaiti law firms.",
                "تقارير قضايا مُعدّة بالذكاء الاصطناعي، وذكاء المواعيد، ومركز قيادة متكامل — مصمّم لمكاتب المحاماة الكويتية.",
              )}
            </span>
          </p>
        </div>

        <div className="text-xs text-primary-foreground/50">
          <span className={isAr ? "font-arabic" : ""}>
            {t("Secured by Lovable Cloud", "محميّ عبر لوفابل كلاود")}
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-6 py-10 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-navy">
              <Gavel className="h-5 w-5" />
            </span>
            <span className="font-display text-xl">{t("Qadiya OS", "قضية OS")}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => setLang(isAr ? "en" : "ar")}
          >
            {isAr ? "English" : "العربية"}
          </Button>
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-10">
          {/* Firm logo placeholder */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
              <Scale className="h-8 w-8" />
            </span>
            <div className="font-display text-2xl leading-none text-foreground">
              <span className={isAr ? "font-arabic" : ""}>{t("Qadiya", "قضية")}</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className={isAr ? "font-arabic" : ""}>{t("Kuwait Legal Suite", "منظومة المحاماة الكويتية")}</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-foreground">
            <span className={isAr ? "font-arabic" : ""}>
              {mode === "signin"
                ? t("Welcome back", "أهلاً بعودتك")
                : t("Create your account", "أنشئ حسابك")}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className={isAr ? "font-arabic" : ""}>
              {mode === "signin"
                ? t("Sign in to your firm's command center.", "سجّل الدخول إلى مركز قيادة مكتبك.")
                : t("Set up access for your firm's staff.", "أنشئ صلاحية الوصول لموظفي مكتبك.")}
            </span>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">
                  <span className={isAr ? "font-arabic" : ""}>{t("Full name", "الاسم الكامل")}</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder={t("e.g. Sara Al-Sabah", "مثال: سارة الصباح")}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">
                <span className={isAr ? "font-arabic" : ""}>{t("Email", "البريد الإلكتروني")}</span>
              </Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@firm.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                <span className={isAr ? "font-arabic" : ""}>{t("Password", "كلمة المرور")}</span>
              </Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <span className={isAr ? "font-arabic" : ""}>{error}</span>
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
                <span className={isAr ? "font-arabic" : ""}>{notice}</span>
              </p>
            )}

            <Button type="submit" className="w-full gap-1.5" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className={isAr ? "font-arabic" : ""}>
                {mode === "signin" ? t("Sign in", "تسجيل الدخول") : t("Create account", "إنشاء حساب")}
              </span>
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span className={isAr ? "font-arabic" : ""}>
              {mode === "signin"
                ? t("New to Qadiya OS?", "جديد على قضية OS؟")
                : t("Already have an account?", "لديك حساب بالفعل؟")}
            </span>{" "}
            <button
              type="button"
              className="font-medium text-gold hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
            >
              <span className={isAr ? "font-arabic" : ""}>
                {mode === "signin" ? t("Create one", "أنشئ حساباً") : t("Sign in", "تسجيل الدخول")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function translateAuthError(message: string, isAr: boolean): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return isAr ? "بيانات الدخول غير صحيحة." : "Invalid email or password.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return isAr ? "هذا البريد مسجّل مسبقاً." : "This email is already registered.";
  }
  if (m.includes("password") && m.includes("6")) {
    return isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل." : "Password must be at least 6 characters.";
  }
  if (m.includes("pwned") || m.includes("compromised")) {
    return isAr
      ? "كلمة المرور هذه ظهرت في تسريبات بيانات. اختر كلمة أقوى."
      : "This password appeared in a data breach. Please choose a stronger one.";
  }
  if (m.includes("email") && m.includes("confirm")) {
    return isAr ? "يُرجى تأكيد بريدك الإلكتروني أولاً." : "Please confirm your email first.";
  }
  return isAr ? "تعذّر تسجيل الدخول. حاول مرة أخرى." : message;
}
