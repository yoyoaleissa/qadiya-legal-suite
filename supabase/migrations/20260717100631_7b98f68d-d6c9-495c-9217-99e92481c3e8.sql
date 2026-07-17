
ALTER TABLE public.legal_knowledge
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','firm')),
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE;

ALTER TABLE public.legal_knowledge
  DROP CONSTRAINT IF EXISTS legal_knowledge_scope_firm_chk;
ALTER TABLE public.legal_knowledge
  ADD CONSTRAINT legal_knowledge_scope_firm_chk
  CHECK ((scope = 'global' AND firm_id IS NULL) OR (scope = 'firm' AND firm_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS legal_knowledge_firm_id_idx
  ON public.legal_knowledge (firm_id) WHERE firm_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.legal_knowledge_set_firm_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.scope = 'firm' AND NEW.firm_id IS NULL THEN
    SELECT firm_id INTO NEW.firm_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_knowledge_set_firm_id_trg ON public.legal_knowledge;
CREATE TRIGGER legal_knowledge_set_firm_id_trg
  BEFORE INSERT ON public.legal_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.legal_knowledge_set_firm_id();

DROP POLICY IF EXISTS "Staff can read legal_knowledge" ON public.legal_knowledge;
DROP POLICY IF EXISTS "Admins can insert legal_knowledge" ON public.legal_knowledge;
DROP POLICY IF EXISTS "Admins can update legal_knowledge" ON public.legal_knowledge;
DROP POLICY IF EXISTS "Admins can delete legal_knowledge" ON public.legal_knowledge;

CREATE POLICY "Read global or own-firm knowledge"
  ON public.legal_knowledge FOR SELECT TO authenticated
  USING (
    is_staff(auth.uid()) AND (
      scope = 'global' OR (scope = 'firm' AND belongs_to_firm(firm_id))
    )
  );

CREATE POLICY "Insert firm knowledge for own firm"
  ON public.legal_knowledge FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND scope = 'firm' AND belongs_to_firm(firm_id));

CREATE POLICY "Update own-firm knowledge"
  ON public.legal_knowledge FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()) AND scope = 'firm' AND belongs_to_firm(firm_id))
  WITH CHECK (scope = 'firm' AND belongs_to_firm(firm_id));

CREATE POLICY "Delete own-firm knowledge"
  ON public.legal_knowledge FOR DELETE TO authenticated
  USING (is_staff(auth.uid()) AND scope = 'firm' AND belongs_to_firm(firm_id));

DROP FUNCTION IF EXISTS public.match_legal_knowledge(vector, int);

CREATE OR REPLACE FUNCTION public.match_legal_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid, title text, content text, metadata jsonb, similarity float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_firm uuid;
BEGIN
  SELECT p.firm_id INTO caller_firm FROM public.profiles p WHERE p.id = auth.uid();
  RETURN QUERY
  SELECT lk.id, lk.title, lk.content, lk.metadata,
    1 - (lk.embedding <=> query_embedding) AS similarity
  FROM public.legal_knowledge lk
  WHERE lk.scope = 'global'
     OR (lk.scope = 'firm' AND lk.firm_id = caller_firm)
  ORDER BY lk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_legal_knowledge(vector, int) TO authenticated, service_role;
