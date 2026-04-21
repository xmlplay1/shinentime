# Shine N Time Website

Minimal, modern, fast static website for Shine N Time Interior Detailing.

## Features

- Clean one-page layout (mobile + desktop)
- Photo gallery (hero collage + gallery section) with lightbox zoom
- Real business contact info
- Quote form that sends to Formspark
- "Edit Last Quote" button that reloads previous submission from browser storage
- Lightweight animations and fast load

## Business details currently set

- Phone: `734-419-1846`
- Instagram: `@shine_n_time`
- Form endpoint (Formspark): `https://submit-form.com/1Ybov8mSM` (set as the form `action` in `index.html`)

The quote form uses a **native browser POST** to Formspark after client-side validation (matches [Formspark’s HTML setup](https://documentation.formspark.io/setup/)). You can configure a thank-you redirect in the Formspark dashboard so users return to your site instead of staying on Formspark’s default page.

Optional photo fields use normal file inputs. If attachments do not appear in Formspark, use their [Uploadcare integration](https://documentation.formspark.io/setup/file-uploads.html) or DM photos instead.

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