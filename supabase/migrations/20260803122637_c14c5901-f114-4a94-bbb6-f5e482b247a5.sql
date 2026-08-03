DROP POLICY "Admins can update firm member plans" ON public.user_plans;
CREATE POLICY "Admins can update firm member plans" ON public.user_plans
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_plans.user_id AND public.belongs_to_firm(p.firm_id)
    )
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_plans.user_id AND public.belongs_to_firm(p.firm_id)
    )
  );