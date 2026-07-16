CREATE POLICY "Staff can view case documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-documents' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can upload case documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'case-documents' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update own case documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'case-documents' AND public.is_staff(auth.uid()) AND owner = auth.uid());

CREATE POLICY "Uploader or admin can delete case documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'case-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));