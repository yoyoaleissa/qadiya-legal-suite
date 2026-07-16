-- 1. firm_settings: single row per firm (partner-owned) storing profile + Kuwait holidays + invoice config
CREATE TABLE public.firm_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  firm_name TEXT NOT NULL DEFAULT 'Qadiya Law Firm',
  firm_name_ar TEXT NOT NULL DEFAULT 'مكتب قضية للمحاماة',
  vat_number TEXT,
  address TEXT,
  address_ar TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_next_seq INTEGER NOT NULL DEFAULT 1,
  working_hours_start TIME NOT NULL DEFAULT '08:30',
  working_hours_end TIME NOT NULL DEFAULT '17:00',
  holidays JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_currency TEXT NOT NULL DEFAULT 'KWD',
  bank_name TEXT,
  bank_iban TEXT,
  knet_merchant_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_settings TO authenticated;
GRANT ALL ON public.firm_settings TO service_role;

ALTER TABLE public.firm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view firm settings"
  ON public.firm_settings FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Owner can insert firm settings"
  ON public.firm_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'partner'));

CREATE POLICY "Owner or admin can update firm settings"
  ON public.firm_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can delete firm settings"
  ON public.firm_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER firm_settings_updated_at
  BEFORE UPDATE ON public.firm_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. trust_ledger: client trust/escrow deposits and drawdowns (Kuwait Bar compliance)
CREATE TABLE public.trust_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'drawdown', 'refund', 'adjustment')),
  amount NUMERIC(12, 3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KWD',
  description TEXT,
  description_ar TEXT,
  reference_number TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_ledger_client ON public.trust_ledger(client_id);
CREATE INDEX idx_trust_ledger_case ON public.trust_ledger(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_ledger TO authenticated;
GRANT ALL ON public.trust_ledger TO service_role;

ALTER TABLE public.trust_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view trust ledger"
  ON public.trust_ledger FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Partners and admins can insert trust entries"
  ON public.trust_ledger FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners and admins can update trust entries"
  ON public.trust_ledger FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete trust entries"
  ON public.trust_ledger FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trust_ledger_updated_at
  BEFORE UPDATE ON public.trust_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. audit_log: basic activity trail for compliance
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert audit entries"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 4. case_notes: internal comments/notes thread per case for team collaboration
CREATE TABLE public.case_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_notes_case ON public.case_notes(case_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_notes TO authenticated;
GRANT ALL ON public.case_notes TO service_role;

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view internal case notes"
  ON public.case_notes FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert case notes"
  ON public.case_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Authors or admins can update case notes"
  ON public.case_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors or admins can delete case notes"
  ON public.case_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER case_notes_updated_at
  BEFORE UPDATE ON public.case_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. case_documents: metadata for files uploaded to storage bucket
CREATE TABLE public.case_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT,
  description TEXT,
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_documents_case ON public.case_documents(case_id);
CREATE INDEX idx_case_documents_client ON public.case_documents(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_documents TO authenticated;
GRANT ALL ON public.case_documents TO service_role;

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view case documents"
  ON public.case_documents FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert case documents"
  ON public.case_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = uploaded_by);

CREATE POLICY "Staff can update case documents"
  ON public.case_documents FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Uploader or admin can delete case documents"
  ON public.case_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER case_documents_updated_at
  BEFORE UPDATE ON public.case_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();