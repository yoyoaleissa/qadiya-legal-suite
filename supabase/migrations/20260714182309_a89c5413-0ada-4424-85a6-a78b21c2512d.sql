CREATE POLICY "Bot can insert cases"
  ON public.cases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'bot'));

CREATE POLICY "Bot can update cases"
  ON public.cases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'bot'))
  WITH CHECK (public.has_role(auth.uid(), 'bot'));

CREATE POLICY "Bot can insert hearings"
  ON public.hearings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'bot'));

CREATE POLICY "Bot can update hearings"
  ON public.hearings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'bot'))
  WITH CHECK (public.has_role(auth.uid(), 'bot'));

CREATE POLICY "Bot can insert judgments"
  ON public.judgments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'bot'));

CREATE POLICY "Bot can update judgments"
  ON public.judgments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'bot'))
  WITH CHECK (public.has_role(auth.uid(), 'bot'));