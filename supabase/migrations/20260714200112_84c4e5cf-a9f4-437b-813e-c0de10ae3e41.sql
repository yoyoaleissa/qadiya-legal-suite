-- Create case_reports table for persisting generated reports
CREATE TABLE public.case_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  json_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX case_reports_user_created_idx ON public.case_reports (user_id, created_at DESC);
CREATE INDEX case_reports_user_case_idx ON public.case_reports (user_id, case_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_reports TO authenticated;
GRANT ALL ON public.case_reports TO service_role;

ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reports"
  ON public.case_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reports"
  ON public.case_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reports"
  ON public.case_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reports"
  ON public.case_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_case_reports_updated_at
  BEFORE UPDATE ON public.case_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();