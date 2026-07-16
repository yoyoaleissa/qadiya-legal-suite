
-- Backfill: move existing objects into <firm_id>/... prefix based on the uploader's firm
UPDATE storage.objects o
SET name = p.firm_id::text || '/' || o.name
FROM public.profiles p
WHERE o.bucket_id = 'case-documents'
  AND o.owner = p.id
  AND p.firm_id IS NOT NULL
  AND (storage.foldername(o.name))[1] <> p.firm_id::text;

-- Keep case_documents.storage_path in sync with the moved objects
UPDATE public.case_documents cd
SET storage_path = p.firm_id::text || '/' || cd.storage_path
FROM public.profiles p
WHERE cd.uploaded_by = p.id
  AND p.firm_id IS NOT NULL
  AND split_part(cd.storage_path, '/', 1) <> p.firm_id::text;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Staff can view case documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload case documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update own case documents" ON storage.objects;
DROP POLICY IF EXISTS "Uploader or admin can delete case documents" ON storage.objects;

-- Firm-scoped policies (first path segment must equal caller's firm)
CREATE POLICY "Firm staff can view case documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-documents'
  AND public.is_staff(auth.uid())
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

CREATE POLICY "Firm staff can upload case documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-documents'
  AND public.is_staff(auth.uid())
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

CREATE POLICY "Firm staff can update own case documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'case-documents'
  AND public.is_staff(auth.uid())
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

CREATE POLICY "Firm uploader or admin can delete case documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'case-documents'
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);
