INSERT INTO public.customers (email, full_name, phone, referral_code)
SELECT
  lower(trim(t.email)),
  t.name,
  t.phone,
  'SNT' || upper(substr(md5(lower(trim(t.email)) || 'snt'::text)::text, 3, 6))
FROM (
  SELECT email,
         name,
         phone,
         created_at,
         row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at DESC NULLS LAST) AS rn
  FROM public.jobs
  WHERE email IS NOT NULL AND length(trim(email)) > 3
) t
WHERE t.rn = 1
ON CONFLICT ((lower(trim(email)))) DO NOTHING;

UPDATE public.jobs j
SET customer_id = c.id
FROM public.customers c
WHERE lower(trim(j.email)) = c.email;
