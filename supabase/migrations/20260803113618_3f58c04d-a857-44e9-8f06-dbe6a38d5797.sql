DROP POLICY "Staff can mark MOJ updates reviewed" ON public.moj_updates;

CREATE POLICY "Staff can mark MOJ updates reviewed"
  ON public.moj_updates FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));