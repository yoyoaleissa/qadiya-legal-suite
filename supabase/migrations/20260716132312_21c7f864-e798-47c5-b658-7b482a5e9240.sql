
-- Staff role helper (partner/associate/paralegal/admin)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('partner','associate','paralegal','admin')
  );
$$;

-- Restrict EXECUTE on SECURITY DEFINER functions; policies still evaluate them internally
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_legal_knowledge(vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_legal_knowledge(vector, integer) TO authenticated;
-- claim_first_admin must remain callable by any authenticated user (bootstrap)

-- Helper to drop-and-recreate policies cleanly
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'cases','hearings','judgments','court_levels','case_timeline',
        'execution_procedures','execution_receipts','generated_reports',
        'tasks','time_entries','workflow_templates',
        'invoices','client_messages','clients','legal_knowledge',
        'profiles','user_roles'
      )
      AND policyname NOT IN (
        'Bot can insert cases','Bot can update cases',
        'Bot can insert hearings','Bot can update hearings',
        'Bot can insert judgments','Bot can update judgments',
        'Users view own roles',
        'Users insert own profile','Users update own profile'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Staff-only full access tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cases','hearings','judgments','court_levels','case_timeline',
    'execution_procedures','execution_receipts','generated_reports',
    'tasks','time_entries','workflow_templates',
    'invoices','client_messages','clients'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "Staff can read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Staff can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Staff can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Staff can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));',
      t
    );
  END LOOP;
END $$;

-- legal_knowledge: staff read, admin write
CREATE POLICY "Staff can read legal_knowledge" ON public.legal_knowledge
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can insert legal_knowledge" ON public.legal_knowledge
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update legal_knowledge" ON public.legal_knowledge
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete legal_knowledge" ON public.legal_knowledge
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- profiles: self or admin can read
CREATE POLICY "Users read own profile or admins read all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));

-- user_roles: admin-only writes; users can still read their own (existing policy retained)
CREATE POLICY "Admins can insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
