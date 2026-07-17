import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Firm = {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
};

export type FirmMember = {
  id: string;
  full_name: string | null;
  full_name_ar: string | null;
  title: string | null;
  avatar_url: string | null;
  roles: string[];
};

export type FirmInvitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

/** Return the firm the current user belongs to, or null if they haven't joined one yet. */
export const getMyFirm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Firm | null> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("firm_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.firm_id) return null;
    const { data: firm, error } = await supabase
      .from("firms")
      .select("id, name_en, name_ar, slug")
      .eq("id", profile.firm_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return firm;
  });

/** Create a brand-new firm and assign the current user as its admin + partner. */
export const createFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name_en: string; name_ar: string }) => {
    if (!input?.name_en?.trim() || !input?.name_ar?.trim()) {
      throw new Error("Firm name is required in both languages");
    }
    return { name_en: input.name_en.trim(), name_ar: input.name_ar.trim() };
  })
  .handler(async ({ data, context }): Promise<{ firm_id: string }> => {
    const { supabase } = context;
    const { data: firmId, error } = await supabase.rpc("create_firm_for_current_user", {
      _name_en: data.name_en,
      _name_ar: data.name_ar,
    });
    if (error) throw new Error(error.message);
    return { firm_id: firmId as string };
  });

/** Accept a pending firm invitation using its token. */
export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    if (!input?.token) throw new Error("Invitation token is required");
    return { token: input.token };
  })
  .handler(async ({ data, context }): Promise<{ firm_id: string }> => {
    const { supabase } = context;
    const { data: firmId, error } = await supabase.rpc("accept_firm_invitation", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return { firm_id: firmId as string };
  });

/** List every member of the current user's firm along with their roles. */
export const listFirmMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FirmMember[]> => {
    const { supabase } = context;
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, full_name_ar, title, avatar_url, firm_id")
      .not("firm_id", "is", null);
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);

    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as string);
      rolesByUser.set(r.user_id, list);
    });

    return (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      full_name_ar: p.full_name_ar,
      title: p.title,
      avatar_url: p.avatar_url,
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });

/** List every pending and past invitation for the current user's firm. */
export const listFirmInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FirmInvitation[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("firm_invitations")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FirmInvitation[];
  });

/** Create a new invitation. RLS enforces partner/admin-only. */
export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: "partner" | "associate" | "paralegal" | "admin" }) => {
    const email = input?.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Valid email required");
    if (!["partner", "associate", "paralegal", "admin"].includes(input.role)) {
      throw new Error("Invalid role");
    }
    return { email, role: input.role };
  })
  .handler(async ({ data, context }): Promise<FirmInvitation> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("firm_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.firm_id) throw new Error("You must belong to a firm first");
    const { data: inv, error } = await supabase
      .from("firm_invitations")
      .insert({
        firm_id: profile.firm_id,
        email: data.email,
        role: data.role,
        invited_by: userId,
      })
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return inv as FirmInvitation;
  });

/** Revoke (delete) a pending invitation. */
export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Invitation id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("firm_invitations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Look up an invitation by its token without needing to be signed in. */
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    if (!input?.token) throw new Error("Token required");
    return { token: input.token };
  })
  .handler(async ({ data }) => {
    // Use anon publishable client to call the token-scoped SECURITY DEFINER RPC.
    // Direct SELECT on firm_invitations is no longer allowed for anon.
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("lookup_invitation_by_token", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    const inv = Array.isArray(rows) ? rows[0] : rows;
    if (!inv) return null;
    return {
      email: inv.email as string,
      role: inv.role as string,
      firm_name_en: (inv.firm_name_en as string) ?? "",
      firm_name_ar: (inv.firm_name_ar as string) ?? "",
    };
  });
