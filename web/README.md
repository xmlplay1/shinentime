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

The gallery expects these files in `web/public/` (same names, case-sensitive, **WebP**). The Next.js app references them as **root paths** (e.g. `src="/B4CHEV1.webp"`):

- `B4CHEV1.webp`, `AFTCHEV4.webp` — Driver Side Deep Clean  
- `B4CHEV2.webp`, `AFTCHEV1.webp` — Rear Floor Extraction  
- `B4PAS2.webp`, `AFTPAS2.webp` — Full Interior Reset  

Optional smaller `*_sm.webp` copies can live in `public/` for faster loads; the app uses full-size files by default so production never 404s if only `.webp` (not `_sm`) is deployed.

Replace these WebPs with your real **B4\*** / **AFT\*** exports when you have them. Until then, the repo may ship **interior** placeholders derived from the `IMG_286*.PNG` set so the comparison strip stays on-message.

The static `index.html` site uses the same filenames at the repo root with **`?v=3`** on gallery URLs so CDNs refresh after you replace bytes.

**Do not** point gallery fallbacks at `IMG_2864.PNG` — in this repo that file is a **pricing flyer**, not a vehicle photo (it will show up inside a slider if a WebP 404s and a fallback swaps it in).

**Layout:** sliders stack on small screens; from ~900px up they sit in a **horizontal scroll-snap** row. Handles **auto-animate** (±20% around center) until the user drags.

**Interim placeholder mapping (replace with your real WebPs):** slot 1 = dash dirty → dash clean (2868 → 2867); slot 2 = rear fabric → rear leather (2866 → 2869); slot 3 = fabric → dash clean (2866 → 2867) until distinct `B4PAS2` / `AFTPAS2` files are provided.

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

- `NEXT_PUBLIC_SUPABASE_URL` — project API URL (e.g. `https://tjqbvafjhtwlujreluxr.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **anon** (legacy JWT) or **publishable** key from Supabase → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — **service_role** secret from the same screen (server-only; never expose to the client). Required for `/api/jobs` and `/admin` server actions to insert/update reliably under RLS.

**If production shows** “Server is missing Supabase configuration”, the Vercel project is missing one of the above (usually `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`). In Vercel: **Project → Settings → Environment Variables** → add all three for **Production** (and Preview if you use preview deploys) → **Redeploy**.

Automated sync from this repo to Vercel env is not available in the agent environment; use the Vercel dashboard or `vercel env add` locally with a `VERCEL_TOKEN`.

3. Referral progress in the footer counts rows in `jobs` where `referred_by_phone` matches the entered phone (goal: 5 for the progress bar UI).

## Deploy (Vercel)

- Root directory: **`web`**
- Framework: Next.js
- Add the same env vars in Project Settings → Environment Variables (Production + Preview).

## Static site in repo root

The legacy `index.html` site remains at the repository root. This Next app lives in **`web/`** and is the intended production stack for shinentime.net.
