ALTER TABLE public.moj_updates
  ADD COLUMN IF NOT EXISTS explanation_en text,
  ADD COLUMN IF NOT EXISTS explanation_ar text;