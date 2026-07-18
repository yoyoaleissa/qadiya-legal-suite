
ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS title_ar text;

ALTER TABLE public.hearings ALTER COLUMN case_id DROP NOT NULL;
