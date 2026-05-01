-- Booking portal token + SMS/email reminder bookkeeping + persist address fields on jobs

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS customer_portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS reminder_sent_24h_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_2h_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_portal_token ON public.jobs(customer_portal_token)
  WHERE customer_portal_token IS NOT NULL;

UPDATE public.jobs
SET customer_portal_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE customer_portal_token IS NULL;
