# Shine N Time Website

Minimal, modern, fast static website for Shine N Time Interior Detailing.

## Features

- Clean one-page layout (mobile + desktop)
- Photo gallery (hero collage + gallery section) with lightbox zoom
- Real business contact info
- Quote form: **Formspree** (primary, AJAX + JSON) plus a **Formspark** mirror when `data-formspark-endpoint` is set (same quote, two inboxes)
- "Edit Last Quote" button that reloads previous submission from browser storage
- Lightweight animations and fast load

## Business details currently set

- Phone: `734-419-1846`
- Instagram: `@shine_n_time`
- **Formspree (default):** `https://formspree.io/f/mgorzwbw` — good free tier, simple setup, **AJAX** so visitors never leave your site after submit.
- **Formspark (mirror):** `https://submit-form.com/1Ybov8mSM` — set on `data-formspark-endpoint`. After Formspree succeeds, the site tries Formspark in order: **full multipart fetch** (includes photos), then **sendBeacon** / fetch with **text fields only** plus a note that photos went to Formspree, then a **hidden iframe POST** as a last resort. Check the Formspark dashboard for at least one row per quote (photo files may only appear on Formspree unless the first step succeeds).

### Formspark only (no Formspree)

On the `<form id="quoteForm">` in `index.html`, set `data-quote-backend="formspark"` and point `action` or `data-formspark-endpoint` at Formspark.

### Formspree only (no Formspark mirror)

Remove `data-formspark-endpoint` from the form (or leave it empty).

Photo uploads: Formspree handles file fields on the free tier; Formspark often wants [Uploadcare](https://documentation.formspark.io/setup/file-uploads.html) for reliable file links — either works with this form’s `multipart` POST.

**Estimate extras:** pet hair, sand/mud, road salt, bio, and mold default to **light = no extra charge**; medium/heavy add to the estimate.

## Logo files (optional)

Add a square-ish logo image and commit it to the **same branch Vercel deploys** (usually `main`). The script tries these folders in order: repo root, `assets/`, `images/`, `img/`, `public/`, with names like `logo.png`, `Logo.png`, `shine-n-time-logo.png`, etc.

**Override (any filename):** in `index.html` head, uncomment and set:

```html
<meta name="site-logo" content="./assets/my-logo.png" />
```

If nothing loads, the header shows **SNT** (no random interior photo).

**GitHub tip:** If your default branch is not `main`, either merge your changes into the branch Vercel uses or change Vercel’s production branch under **Settings → Git**.

## How "Edit Last Quote" works

When someone sends a quote request, their data is saved in their browser.
Clicking **Edit Last Quote** auto-fills the form so they can quickly update and re-submit.

## Run locally

Open `index.html` in a browser, or run any static server.

## Free hosting

### Option 1: GitHub Pages (free)
1. Push to GitHub.
2. In repo: **Settings -> Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main`, folder `/ (root)`.

### Option 2: Vercel (free tier)
1. Connect your GitHub repo in Vercel.
2. In project **Settings -> Git**, set **Production Branch** to `main`.
3. Redeploy.

## Free domain options

- `yourname.vercel.app` (free, instant)
- `yourname.github.io` (free, instant)
- `is-a.dev` free subdomain request
- `eu.org` free domain request (approval-based)