-- Referral rewards: $10 referee discount on booking; $10 referrer credit when job completes.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 0 CHECK (credit_balance >= 0);

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_credit_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_discount_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewards_settled_at timestamptz;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS referral_discount_amount numeric NOT NULL DEFAULT 0 CHECK (referral_discount_amount >= 0);

CREATE INDEX IF NOT EXISTS jobs_referred_by_code_idx ON public.jobs (referred_by_code) WHERE referred_by_code IS NOT NULL;
