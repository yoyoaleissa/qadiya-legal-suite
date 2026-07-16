
-- =========================================================
-- 1. NEW TABLES: firms, firm_invitations
-- =========================================================

CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firms TO authenticated;
GRANT ALL ON public.firms TO service_role;

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_firms_updated
  BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.firm_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_firm_invitations_token ON public.firm_invitations(token);
CREATE INDEX idx_firm_invitations_firm ON public.firm_invitations(firm_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_invitations TO authenticated;
GRANT SELECT ON public.firm_invitations TO anon; -- needed for token lookup on public invite page
GRANT ALL ON public.firm_invitations TO service_role;

ALTER TABLE public.firm_invitations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. profiles.firm_id
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_firm ON public.profiles(firm_id);

-- =========================================================
-- 3. Create a "Legacy Firm" and assign every existing user + row to it
-- =========================================================

DO $$
DECLARE
  legacy_firm_id uuid;
  first_admin uuid;
BEGIN
  -- Pick first admin as the legacy firm owner; fall back to first user_role holder
  SELECT user_id INTO first_admin
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY user_id
  LIMIT 1;

  IF first_admin IS NULL THEN
    SELECT user_id INTO first_admin FROM public.user_roles ORDER BY user_id LIMIT 1;
  END IF;

  -- If there are no users at all, no legacy firm needed
  IF first_admin IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.firms (name_en, name_ar, slug, created_by)
  VALUES ('Legacy Firm', 'المكتب الأول', 'legacy-' || substr(gen_random_uuid()::text, 1, 8), first_admin)
  RETURNING id INTO legacy_firm_id;

  -- Every existing profile (if any) gets this firm
  UPDATE public.profiles SET firm_id = legacy_firm_id WHERE firm_id IS NULL;

  -- Every user with a role but no profile gets a profile in this firm
  INSERT INTO public.profiles (id, firm_id)
  SELECT DISTINCT ur.user_id, legacy_firm_id
  FROM public.user_roles ur
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id);
END $$;

-- =========================================================
-- 4. Helper functions
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_firm(_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _firm_id IS NOT NULL
    AND _firm_id = (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
$$;

-- Trigger function: auto-fill firm_id on insert from the current user's profile
CREATE OR REPLACE FUNCTION public.fill_firm_id_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.firm_id IS NULL THEN
    NEW.firm_id := (SELECT firm_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 5. Add firm_id to every business table + backfill + NOT NULL + trigger
-- =========================================================

DO $$
DECLARE
  t text;
  legacy_firm_id uuid;
  tables text[] := ARRAY[
    'cases','clients','invoices','tasks','hearings','judgments','court_levels',
    'case_documents','case_notes','case_timeline','case_reports','client_messages',
    'execution_procedures','execution_receipts','generated_reports','workflow_templates',
    'firm_settings','time_entries','trust_ledger','audit_log'
  ];
BEGIN
  SELECT id INTO legacy_firm_id FROM public.firms WHERE slug LIKE 'legacy-%' LIMIT 1;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE', t);

    IF legacy_firm_id IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET firm_id = %L WHERE firm_id IS NULL', t, legacy_firm_id);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN firm_id SET NOT NULL', t);
    END IF;

    EXECUTE format('CREATE INDEX idx_%I_firm ON public.%I(firm_id)', t, t);

    EXECUTE format(
      'CREATE TRIGGER trg_%I_firm_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_firm_id_from_profile()',
      t, t
    );
  END LOOP;
END $$;

-- =========================================================
-- 6. RLS: firms, firm_invitations, profiles
-- =========================================================

CREATE POLICY "Members can view their firm"
  ON public.firms FOR SELECT TO authenticated
  USING (id = current_firm_id());

CREATE POLICY "Anyone can create a firm during signup"
  ON public.firms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their firm"
  ON public.firms FOR UPDATE TO authenticated
  USING (id = current_firm_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Firm members can view firm invitations"
  ON public.firm_invitations FOR SELECT TO authenticated
  USING (firm_id = current_firm_id());

CREATE POLICY "Public can look up invitation by token"
  ON public.firm_invitations FOR SELECT TO anon
  USING (accepted_at IS NULL AND expires_at > now());

CREATE POLICY "Partners and admins can create invitations"
  ON public.firm_invitations FOR INSERT TO authenticated
  WITH CHECK (
    firm_id = current_firm_id()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
  );

CREATE POLICY "Partners and admins can update invitations"
  ON public.firm_invitations FOR UPDATE TO authenticated
  USING (
    firm_id = current_firm_id()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
  );

CREATE POLICY "Partners and admins can delete invitations"
  ON public.firm_invitations FOR DELETE TO authenticated
  USING (
    firm_id = current_firm_id()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
  );

-- Widen profiles read so firm members see each other (needed for Team page)
DROP POLICY "Users read own profile or admins read all" ON public.profiles;

CREATE POLICY "Users read own profile, admins all, firm members each other"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin')
    OR (firm_id IS NOT NULL AND firm_id = current_firm_id())
  );

-- =========================================================
-- 7. Drop all existing business-table policies and recreate with firm scoping
-- =========================================================

-- cases
DROP POLICY "Staff can read cases" ON public.cases;
DROP POLICY "Staff can insert cases" ON public.cases;
DROP POLICY "Staff can update cases" ON public.cases;
DROP POLICY "Staff can delete cases" ON public.cases;
DROP POLICY "Bot can insert cases" ON public.cases;
DROP POLICY "Bot can update cases" ON public.cases;

CREATE POLICY "Firm staff read cases" ON public.cases FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff insert cases" ON public.cases FOR INSERT TO authenticated
  WITH CHECK ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff update cases" ON public.cases FOR UPDATE TO authenticated
  USING ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff delete cases" ON public.cases FOR DELETE TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));

-- clients
DROP POLICY "Staff can read clients" ON public.clients;
DROP POLICY "Staff can insert clients" ON public.clients;
DROP POLICY "Staff can update clients" ON public.clients;
DROP POLICY "Staff can delete clients" ON public.clients;

CREATE POLICY "Firm staff read clients" ON public.clients FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff update clients" ON public.clients FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff delete clients" ON public.clients FOR DELETE TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));

-- hearings
DROP POLICY "Staff can read hearings" ON public.hearings;
DROP POLICY "Staff can insert hearings" ON public.hearings;
DROP POLICY "Staff can update hearings" ON public.hearings;
DROP POLICY "Staff can delete hearings" ON public.hearings;
DROP POLICY "Bot can insert hearings" ON public.hearings;
DROP POLICY "Bot can update hearings" ON public.hearings;

CREATE POLICY "Firm staff read hearings" ON public.hearings FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff insert hearings" ON public.hearings FOR INSERT TO authenticated
  WITH CHECK ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff update hearings" ON public.hearings FOR UPDATE TO authenticated
  USING ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff delete hearings" ON public.hearings FOR DELETE TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));

-- judgments
DROP POLICY "Staff can read judgments" ON public.judgments;
DROP POLICY "Staff can insert judgments" ON public.judgments;
DROP POLICY "Staff can update judgments" ON public.judgments;
DROP POLICY "Staff can delete judgments" ON public.judgments;
DROP POLICY "Bot can insert judgments" ON public.judgments;
DROP POLICY "Bot can update judgments" ON public.judgments;

CREATE POLICY "Firm staff read judgments" ON public.judgments FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff insert judgments" ON public.judgments FOR INSERT TO authenticated
  WITH CHECK ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff update judgments" ON public.judgments FOR UPDATE TO authenticated
  USING ((is_staff(auth.uid()) OR has_role(auth.uid(), 'bot')) AND belongs_to_firm(firm_id));
CREATE POLICY "Firm staff delete judgments" ON public.judgments FOR DELETE TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));

-- Simple staff-only tables: loop drop/create
DO $$
DECLARE
  t text;
  simple text[] := ARRAY[
    'court_levels','case_documents','case_notes','case_timeline',
    'client_messages','execution_procedures','execution_receipts',
    'generated_reports','workflow_templates','time_entries','tasks','invoices'
  ];
  policy_name text;
BEGIN
  FOREACH t IN ARRAY simple LOOP
    FOR policy_name IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Firm staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Firm staff insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND belongs_to_firm(firm_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Firm staff update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Firm staff delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id))',
      t
    );
  END LOOP;
END $$;

-- case_reports (user-scoped within firm)
DROP POLICY "Users read own reports" ON public.case_reports;
DROP POLICY "Users insert own reports" ON public.case_reports;
DROP POLICY "Users update own reports" ON public.case_reports;
DROP POLICY "Users delete own reports" ON public.case_reports;

CREATE POLICY "Firm staff read case_reports" ON public.case_reports FOR SELECT TO authenticated
  USING (belongs_to_firm(firm_id) AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users insert own case_reports" ON public.case_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND belongs_to_firm(firm_id));
CREATE POLICY "Users update own case_reports" ON public.case_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND belongs_to_firm(firm_id));
CREATE POLICY "Users delete own case_reports" ON public.case_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND belongs_to_firm(firm_id));

-- firm_settings
DROP POLICY "Staff can view firm settings" ON public.firm_settings;
DROP POLICY "Owner can insert firm settings" ON public.firm_settings;
DROP POLICY "Owner or admin can update firm settings" ON public.firm_settings;
DROP POLICY "Owner or admin can delete firm settings" ON public.firm_settings;

CREATE POLICY "Firm staff view firm_settings" ON public.firm_settings FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Admins insert firm_settings" ON public.firm_settings FOR INSERT TO authenticated
  WITH CHECK (belongs_to_firm(firm_id) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update firm_settings" ON public.firm_settings FOR UPDATE TO authenticated
  USING (belongs_to_firm(firm_id) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete firm_settings" ON public.firm_settings FOR DELETE TO authenticated
  USING (belongs_to_firm(firm_id) AND has_role(auth.uid(), 'admin'));

-- trust_ledger (partner/admin writes)
DROP POLICY "Staff can view trust ledger" ON public.trust_ledger;
DROP POLICY "Partners and admins can insert trust entries" ON public.trust_ledger;
DROP POLICY "Partners and admins can update trust entries" ON public.trust_ledger;
DROP POLICY "Admins can delete trust entries" ON public.trust_ledger;

CREATE POLICY "Firm staff view trust_ledger" ON public.trust_ledger FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND belongs_to_firm(firm_id));
CREATE POLICY "Partners insert trust_ledger" ON public.trust_ledger FOR INSERT TO authenticated
  WITH CHECK (belongs_to_firm(firm_id) AND (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'admin')));
CREATE POLICY "Partners update trust_ledger" ON public.trust_ledger FOR UPDATE TO authenticated
  USING (belongs_to_firm(firm_id) AND (has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins delete trust_ledger" ON public.trust_ledger FOR DELETE TO authenticated
  USING (belongs_to_firm(firm_id) AND has_role(auth.uid(), 'admin'));

-- audit_log (admin read, authenticated insert - within firm)
DROP POLICY "Admins can view audit log" ON public.audit_log;
DROP POLICY "Authenticated can insert audit entries" ON public.audit_log;

CREATE POLICY "Admins view firm audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND belongs_to_firm(firm_id));
CREATE POLICY "Authenticated insert audit_log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (belongs_to_firm(firm_id));

-- =========================================================
-- 8. Bootstrap function: create a firm during signup
-- =========================================================
-- Called by the signup flow. Creates a firm, assigns the caller as its
-- admin + partner, and links the profile. Runs SECURITY DEFINER so it can
-- write to user_roles (which is admin-write-only under RLS).

CREATE OR REPLACE FUNCTION public.create_firm_for_current_user(
  _name_en text,
  _name_ar text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_firm_id uuid;
  new_slug text;
  existing_firm uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in to create a firm';
  END IF;

  -- If the user already belongs to a firm, refuse
  SELECT firm_id INTO existing_firm FROM public.profiles WHERE id = auth.uid();
  IF existing_firm IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a firm';
  END IF;

  new_slug := lower(regexp_replace(_name_en, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.firms (name_en, name_ar, slug, created_by)
  VALUES (_name_en, _name_ar, new_slug, auth.uid())
  RETURNING id INTO new_firm_id;

  -- Upsert profile with firm_id
  INSERT INTO public.profiles (id, firm_id)
  VALUES (auth.uid(), new_firm_id)
  ON CONFLICT (id) DO UPDATE SET firm_id = EXCLUDED.firm_id;

  -- Grant admin + partner roles
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'partner')
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new_firm_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_firm_for_current_user(text, text) TO authenticated;

-- =========================================================
-- 9. Bootstrap function: accept an invitation
-- =========================================================

CREATE OR REPLACE FUNCTION public.accept_firm_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  existing_firm uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in to accept an invitation';
  END IF;

  SELECT * INTO inv FROM public.firm_invitations
  WHERE token = _token AND accepted_at IS NULL AND expires_at > now();

  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  SELECT firm_id INTO existing_firm FROM public.profiles WHERE id = auth.uid();
  IF existing_firm IS NOT NULL AND existing_firm <> inv.firm_id THEN
    RAISE EXCEPTION 'User already belongs to a different firm';
  END IF;

  INSERT INTO public.profiles (id, firm_id)
  VALUES (auth.uid(), inv.firm_id)
  ON CONFLICT (id) DO UPDATE SET firm_id = EXCLUDED.firm_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), inv.role)
    ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.firm_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = inv.id;

  RETURN inv.firm_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_firm_invitation(text) TO authenticated;
