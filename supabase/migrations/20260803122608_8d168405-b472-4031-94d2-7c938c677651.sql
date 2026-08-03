CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KWD',
  trial_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active plans" ON public.plans
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (code, name, name_ar, description, description_ar, price, trial_days, sort_order)
VALUES
  ('free_trial', 'Free Trial', 'فترة تجريبية مجانية', 'Full access for 14 days.', 'وصول كامل لمدة أربعة عشر يوماً.', 0, 14, 1),
  ('firm', 'Firm', 'باقة المكتب', 'Full practice suite, billed per user monthly.', 'المنظومة الكاملة، تُحتسب لكل مستخدم شهرياً.', 49, 0, 2);

CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing',
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plan" ON public.user_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read firm member plans" ON public.user_plans
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_plans.user_id AND public.belongs_to_firm(p.firm_id)
    )
  );
CREATE POLICY "Users can insert own plan" ON public.user_plans
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update firm member plans" ON public.user_plans
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_plans.user_id AND public.belongs_to_firm(p.firm_id)
    )
  ) WITH CHECK (true);

CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.start_default_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.plans%ROWTYPE;
BEGIN
  SELECT * INTO _plan FROM public.plans WHERE code = 'free_trial' LIMIT 1;
  IF _plan.id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.user_plans (user_id, plan_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, _plan.id, 'trialing', now(), now() + (_plan.trial_days || ' days')::interval)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_start_trial
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.start_default_trial();

INSERT INTO public.user_plans (user_id, plan_id, status, trial_started_at, trial_ends_at)
SELECT p.id, (SELECT id FROM public.plans WHERE code = 'free_trial'), 'trialing', now(), now() + interval '14 days'
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;