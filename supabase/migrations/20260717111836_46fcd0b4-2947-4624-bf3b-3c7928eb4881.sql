
-- 1) Firm invitations: remove broad anon SELECT policy, add token-scoped RPC
DROP POLICY IF EXISTS "Public can look up invitation by token" ON public.firm_invitations;

CREATE OR REPLACE FUNCTION public.lookup_invitation_by_token(_token text)
RETURNS TABLE (
  email text,
  role app_role,
  firm_name_en text,
  firm_name_ar text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email, i.role, f.name_en, f.name_ar
  FROM public.firm_invitations i
  JOIN public.firms f ON f.id = i.firm_id
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_invitation_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(text) TO anon, authenticated;

-- 2) Firms: only allow INSERT when the caller has no firm yet
DROP POLICY IF EXISTS "Anyone can create a firm during signup" ON public.firms;

CREATE POLICY "Users without a firm can create one"
ON public.firms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (SELECT firm_id FROM public.profiles WHERE id = auth.uid()) IS NULL
);
