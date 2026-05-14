-- Booking: SMS-first contact — optional email; persist add-ons + service address.

ALTER TABLE public.jobs
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS booking_addons jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS service_address text;
