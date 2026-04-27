# Shine N Time — Next.js landing (`web/`)

High-end marketing site for **shinentime.net** built with **Next.js 16**, **Tailwind CSS v4**, **Framer Motion**, and **Supabase**.

## Local development

```bash
cd web
npm install
cp .env.example .env.local
# Fill in Supabase URL + keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Before / after gallery assets

The gallery expects these files in `web/public/` (same names, case-sensitive):

- `B4CHEV1.jpg`, `AFTCHEV4.jpg` — Driver Side Deep Clean  
- `B4CHEV2.jpg`, `AFTCHEV1.jpg` — Rear Floor Extraction  
- `B4PAS2.jpg`, `AFTPAS2.jpg` — Full Interior Reset  

The repo may ship **temporary copies** of existing shots under those filenames until you upload the real pairs.

## Supabase setup

1. Create a table `public.jobs` (example SQL):

```sql
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  car_make_model text not null,
  service_package text not null,
  preferred_date date not null,
  preferred_time text not null,
  referred_by_phone text,
  created_at timestamptz default now()
);

-- If you already have `jobs`, add columns:
-- alter table public.jobs add column if not exists preferred_date date;
-- alter table public.jobs add column if not exists preferred_time text;

-- Optional: enable RLS; API uses service role to insert
alter table public.jobs enable row level security;
```

2. Set environment variables in **Vercel** (or `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for `/api/jobs` inserts)

3. Referral progress in the footer counts rows in `jobs` where `referred_by_phone` matches the entered phone (goal: 5 for the progress bar UI).

## Deploy (Vercel)

- Root directory: **`web`**
- Framework: Next.js
- Add the same env vars in Project Settings → Environment Variables.

## Static site in repo root

The legacy `index.html` site remains at the repository root. This Next app lives in **`web/`** and is the intended production stack for shinentime.net.
