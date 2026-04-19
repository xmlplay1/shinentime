# Shine N Time Website

Fast, mobile-first GitHub Pages website for Shine N Time Interior Detailing.

## Features

- Premium, conversion-focused hero and section design
- Responsive design for phones, tablets, and desktop
- Quote request form with validation (customers can leave phone, email, or both)
- Call and meeting scheduling section
- FAQ and testimonials sections for stronger trust and lead conversion
- Lightweight scroll animations with reduced-motion support
- Optimized loading (lazy images, minimal JS, preloaded hero + flyer assets)

## Customize business details

Update these values in `index.html`:

- Phone number: search for `724-419-1846`
- Email: search for `quotes@shinentime.com` (or your preferred email)
- Instagram: search for `shine_n_time`
- Service area: search for `Your City, State`
- Scheduling link: search for `https://calendly.com/shine-n-time`

## Make the quote form actually deliver leads (recommended)

`mailto:` forms can fail on many phones/browsers. This site is ready for Formspree so leads reliably go to your inbox.

1. Create a free account at [formspree.io](https://formspree.io).
2. Create a new form and copy your endpoint URL (looks like `https://formspree.io/f/xxxxxx`).
3. In `script.js`, replace:
   - `const FORMSPREE_ENDPOINT = "https://formspree.io/f/your-form-id";`
   with your real endpoint.
4. Deploy again.

After this, quote requests submit directly from the website to your email inbox.

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