CREATE TABLE public.moj_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  title_ar text NOT NULL,
  content text,
  content_ar text,
  source_url text NOT NULL,
  category text NOT NULL DEFAULT 'announcement',
  published_at date,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moj_updates_status_check CHECK (status IN ('new','reviewed')),
  CONSTRAINT moj_updates_source_url_key UNIQUE (source_url),
  CONSTRAINT moj_updates_content_hash_key UNIQUE (content_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moj_updates TO authenticated;
GRANT ALL ON public.moj_updates TO service_role;

ALTER TABLE public.moj_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view MOJ updates"
  ON public.moj_updates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Bot or admin can insert MOJ updates"
  ON public.moj_updates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'bot') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can mark MOJ updates reviewed"
  ON public.moj_updates FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Bot or admin can delete MOJ updates"
  ON public.moj_updates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'bot') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX moj_updates_detected_at_idx ON public.moj_updates (detected_at DESC);
CREATE INDEX moj_updates_status_idx ON public.moj_updates (status);

CREATE TRIGGER update_moj_updates_updated_at
  BEFORE UPDATE ON public.moj_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();