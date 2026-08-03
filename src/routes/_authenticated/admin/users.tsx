import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { listSignedUpUsers } from "@/lib/plans.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User accounts — Qadiya OS admin" },
      {
        name: "description",
        content: "Admin view of signed-up users, their plan, sign-up date and sign-in method.",
      },
      { property: "og:title", content: "User accounts — Qadiya OS admin" },
      {
        property: "og:description",
        content: "Admin view of signed-up users, their plan, sign-up date and sign-in method.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AdminUsersPage() {
  const { t, lang } = useApp();
  const isAr = lang === "ar";
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const run = useServerFn(listSignedUpUsers);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => run(),
    enabled: isAdmin,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              <span className={isAr ? "font-arabic" : ""}>
                {t("User accounts", "حسابات المستخدمين")}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className={isAr ? "font-arabic" : ""}>
                {t(
                  "Sign-ups, subscription package and sign-in method.",
                  "التسجيلات والباقة المشترك بها وطريقة تسجيل الدخول.",
                )}
              </span>
            </p>
          </div>
        </div>

        {roleLoading || (isAdmin && isLoading) ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : !isAdmin ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <span className={isAr ? "font-arabic" : ""}>
                {t(
                  "This page is restricted to firm administrators.",
                  "هذه الصفحة مقصورة على مديري المكتب.",
                )}
              </span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <span className={isAr ? "font-arabic" : ""}>
                  {t("Signed-up users", "المستخدمون المسجّلون")}
                </span>{" "}
                <span className="text-muted-foreground">({data?.length ?? 0})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("User", "المستخدم")}</th>
                    <th className="px-4 py-3 text-start">{t("Signed up", "تاريخ التسجيل")}</th>
                    <th className="px-4 py-3 text-start">{t("Plan", "الباقة")}</th>
                    <th className="px-4 py-3 text-start">
                      {t("Sign-in method", "طريقة الدخول")}
                    </th>
                    <th className="px-4 py-3 text-start">{t("Roles", "الصلاحيات")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {(isAr ? u.full_name_ar : u.full_name) ?? u.full_name ?? "—"}
                        </div>
                        <div dir="ltr" className="text-xs text-muted-foreground">
                          {u.email ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmt(u.signed_up_at)}</td>
                      <td className="px-4 py-3">
                        <div className={isAr ? "font-arabic" : ""}>
                          {(isAr ? u.plan_name_ar : u.plan_name) ?? "—"}
                        </div>
                        {u.plan_status && (
                          <div className="text-xs text-muted-foreground">
                            {u.plan_status}
                            {u.trial_ends_at ? ` · ${fmt(u.trial_ends_at)}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {u.sign_in_method}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length ? (
                            u.roles.map((r) => (
                              <Badge key={r} variant="secondary" className="capitalize">
                                {r}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <span className={isAr ? "font-arabic" : ""}>
                          {t("No users yet.", "لا يوجد مستخدمون بعد.")}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
