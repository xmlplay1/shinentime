ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS lead_source text;
