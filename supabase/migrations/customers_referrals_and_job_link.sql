-- End-customer identities (distinct from auth `profiles` staff records)
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  phone text,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_signup_ip text,
  last_signup_fingerprint text
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_ci ON public.customers (lower(trim(email)));
CREATE UNIQUE INDEX IF NOT EXISTS customers_referral_code_lower ON public.customers (lower(trim(referral_code)));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jobs_customer_id_idx ON public.jobs (customer_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referee_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referee_first_job_id bigint REFERENCES public.jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'validated'::text, 'flagged'::text])),
  referrer_code_used text,
  referee_signup_ip text,
  referee_signup_fingerprint text,
  referrer_snapshot_ip text,
  abuse_reason text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referee_unique UNIQUE (referee_customer_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_customer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);

-- RLS: no public anon access (admin uses service role)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role bypass customers" ON public.customers;
CREATE POLICY "service role bypass customers" ON public.customers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role bypass referrals" ON public.referrals;
CREATE POLICY "service role bypass referrals" ON public.referrals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
