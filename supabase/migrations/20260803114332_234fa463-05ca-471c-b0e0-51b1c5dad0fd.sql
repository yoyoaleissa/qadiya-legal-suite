ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS judge_name text,
  ADD COLUMN IF NOT EXISTS judge_name_ar text,
  ADD COLUMN IF NOT EXISTS opposing_counsel text,
  ADD COLUMN IF NOT EXISTS opposing_counsel_ar text,
  ADD COLUMN IF NOT EXISTS opposing_party_ar text;