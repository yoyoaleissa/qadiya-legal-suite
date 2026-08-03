import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Plan = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price: number;
  currency: string;
  trial_days: number;
};

export type MyPlan = {
  plan: Plan;
  status: string;
  trial_started_at: string;
  trial_ends_at: string | null;
} | null;

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  full_name_ar: string | null;
  title: string | null;
  email: string | null;
  signed_up_at: string | null;
  last_sign_in_at: string | null;
  sign_in_method: string;
  roles: string[];
  plan_name: string | null;
  plan_name_ar: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
};

/** Public catalogue of subscription plans. */
export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Plan[]> => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("id, code, name, name_ar, description, description_ar, price, currency, trial_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Plan[];
  });

/** The current user's plan / trial state. */
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPlan> => {
    const { data, error } = await context.supabase
      .from("user_plans")
      .select(
        "status, trial_started_at, trial_ends_at, plans(id, code, name, name_ar, description, description_ar, price, currency, trial_days)",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.plans) return null;
    return {
      plan: data.plans as unknown as Plan,
      status: data.status,
      trial_started_at: data.trial_started_at,
      trial_ends_at: data.trial_ends_at,
    };
  });

/** Admin-only: every signed-up member of the caller's firm, with plan + sign-in method. */
export const listSignedUpUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    // RLS keeps this scoped to the caller's firm.
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, full_name_ar, title, firm_id")
      .not("firm_id", "is", null);
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];

    const [{ data: roles }, { data: userPlans }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      supabase
        .from("user_plans")
        .select("user_id, status, trial_ends_at, plans(name, name_ar)")
        .in("user_id", ids),
    ]);

    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as string);
      rolesByUser.set(r.user_id, list);
    });

    const planByUser = new Map<string, (typeof userPlans extends null ? never : any)>();
    (userPlans ?? []).forEach((p) => planByUser.set(p.user_id, p));

    // Auth metadata (email, signup date, provider) needs admin access.
    const authByUser = new Map<
      string,
      { email: string | null; created_at: string | null; last_sign_in_at: string | null; providers: string[] }
    >();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let page = 1;
      // Small firms: a couple of pages is plenty.
      for (; page <= 5; page++) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (listErr || !list?.users?.length) break;
        for (const u of list.users) {
          authByUser.set(u.id, {
            email: u.email ?? null,
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
            providers: (u.identities ?? []).map((i) => i.provider),
          });
        }
        if (list.users.length < 200) break;
      }
    } catch {
      // Degrade gracefully — the list still renders without auth metadata.
    }

    return (profiles ?? []).map((p) => {
      const auth = authByUser.get(p.id);
      const plan = planByUser.get(p.id);
      const providers = auth?.providers ?? [];
      return {
        id: p.id,
        full_name: p.full_name,
        full_name_ar: p.full_name_ar,
        title: p.title,
        email: auth?.email ?? null,
        signed_up_at: auth?.created_at ?? null,
        last_sign_in_at: auth?.last_sign_in_at ?? null,
        sign_in_method: providers.length
          ? providers.map((x) => (x === "email" ? "email/password" : x)).join(", ")
          : "unknown",
        roles: rolesByUser.get(p.id) ?? [],
        plan_name: plan?.plans?.name ?? null,
        plan_name_ar: plan?.plans?.name_ar ?? null,
        plan_status: plan?.status ?? null,
        trial_ends_at: plan?.trial_ends_at ?? null,
      };
    });
  });
