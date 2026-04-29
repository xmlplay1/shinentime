-- Applied to project ShineNTime — extends `jobs` for Next.js booking + admin.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS car_make_model text,
  ADD COLUMN IF NOT EXISTS service_package text,
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS referred_by_phone text,
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS final_price numeric;

ALTER TABLE public.jobs
  ALTER COLUMN status SET DEFAULT 'Pending';
