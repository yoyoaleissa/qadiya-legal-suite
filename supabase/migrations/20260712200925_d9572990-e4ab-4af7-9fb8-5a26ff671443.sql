
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('partner', 'associate', 'paralegal');
CREATE TYPE public.court_level AS ENUM ('first_instance', 'appeal', 'cassation', 'execution', 'police_prosecution');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  full_name_ar TEXT,
  title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  email TEXT,
  phone TEXT,
  national_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients viewable by authenticated" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients manageable by authenticated" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CASES ============
CREATE TABLE public.cases (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  title TEXT,
  title_ar TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  case_type TEXT,
  case_type_ar TEXT,
  overall_status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cases public read" ON public.cases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Cases manageable by authenticated" ON public.cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COURT LEVELS ============
CREATE TABLE public.court_levels (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  level public.court_level NOT NULL,
  court_name TEXT,
  case_ref TEXT,
  registered_date DATE,
  status TEXT,
  ruling_summary TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.court_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.court_levels TO authenticated;
GRANT ALL ON public.court_levels TO service_role;
ALTER TABLE public.court_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Court levels public read" ON public.court_levels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Court levels manageable by authenticated" ON public.court_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ JUDGMENTS ============
CREATE TABLE public.judgments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  level public.court_level NOT NULL,
  judgment_date DATE,
  ruling_text TEXT,
  judgment_type TEXT,
  amount NUMERIC(14,3),
  payment_status TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.judgments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.judgments TO authenticated;
GRANT ALL ON public.judgments TO service_role;
ALTER TABLE public.judgments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Judgments public read" ON public.judgments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Judgments manageable by authenticated" ON public.judgments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ HEARINGS / SESSIONS ============
CREATE TABLE public.hearings (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  level public.court_level,
  session_date DATE,
  notes TEXT,
  status TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hearings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hearings TO authenticated;
GRANT ALL ON public.hearings TO service_role;
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hearings public read" ON public.hearings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Hearings manageable by authenticated" ON public.hearings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ EXECUTION PROCEDURES ============
CREATE TABLE public.execution_procedures (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_number TEXT,
  jurisdiction TEXT,
  opened_date DATE,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.execution_procedures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_procedures TO authenticated;
GRANT ALL ON public.execution_procedures TO service_role;
ALTER TABLE public.execution_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executions public read" ON public.execution_procedures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Executions manageable by authenticated" ON public.execution_procedures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ EXECUTION RECEIPTS ============
CREATE TABLE public.execution_receipts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.execution_procedures(id) ON DELETE CASCADE,
  amount NUMERIC(14,3),
  receipt_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.execution_receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_receipts TO authenticated;
GRANT ALL ON public.execution_receipts TO service_role;
ALTER TABLE public.execution_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receipts public read" ON public.execution_receipts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Receipts manageable by authenticated" ON public.execution_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ CASE TIMELINE ============
CREATE TABLE public.case_timeline (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_date DATE,
  level public.court_level,
  event_type TEXT,
  title TEXT,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_timeline TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_timeline TO authenticated;
GRANT ALL ON public.case_timeline TO service_role;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline public read" ON public.case_timeline FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Timeline manageable by authenticated" ON public.case_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ GENERATED REPORTS ============
CREATE TABLE public.generated_reports (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status_headline TEXT,
  report_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.generated_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports public read" ON public.generated_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reports insert anon" ON public.generated_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Reports manageable by authenticated" ON public.generated_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
