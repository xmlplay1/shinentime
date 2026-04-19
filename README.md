# Shine N Time Website

Fast, mobile-first GitHub Pages website for Shine N Time Interior Detailing.

## Features

- Flyer-inspired visual style using your provided assets
- Responsive design for phones, tablets, and desktop
- Quote request form with validation (customers can leave phone, email, or both)
- Call and meeting scheduling section
- Lightweight scroll animations with reduced-motion support
- Optimized loading (lazy images, minimal JS, preloaded hero asset)

## Customize business details

Update these values in `index.html`:

- Phone number: search for `(555) 555-1234`
- Email: search for `quotes@shinentime.com`
- Service area: search for `Your City, State`
- Scheduling link: search for `https://calendly.com/shine-n-time`

## Run locally

Open `index.html` directly in your browser, or run any static file server.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In GitHub: **Settings -> Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your preferred branch), `/ (root)`
4. Save and wait for GitHub to publish.

Your site will be available at:

`https://<your-username>.github.io/<repo-name>/`

## Deploy to Vercel (easy live preview)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New... -> Project**.
3. Import this repository.
4. Keep defaults (Framework Preset: **Other**, Root: `./`).
5. Click **Deploy**.

Your live site will be hosted on a Vercel URL like:

`https://your-project-name.vercel.app`

### Vercel CLI option

If you want to deploy from terminal:

1. Install CLI: `npm i -g vercel`
2. Run in repo: `vercel`
3. Follow prompts to link + deploy
4. For production deploy: `vercel --prod`