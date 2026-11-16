# roomxdynamics.com

Website for RoomXDynamics, a qualitative room-climate simulation for iPhone (in development).

Static site built with Eleventy 3 and deployed to GitHub Pages via GitHub Actions. No JavaScript framework, no tracking, no cookies, no external fonts or scripts.

## Local preview

```bash
npm ci
npm run serve        # http://localhost:8083/
```

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`, which builds the site with Eleventy and publishes `_site/` to GitHub Pages. While `src/_data/site.json` has `"draft": true`, the workflow builds but does not deploy.

## Pages

English: `/`, `/method/`, `/faq/`, `/privacy/`, `/imprint/`. German: `/de/`, `/de/methode/`, `/de/fragen/`, `/de/datenschutz/`, `/de/impressum/`. Plus `404.html`, `llms.txt` and the sitemap. A plain "DE | EN" link switches to the same page in the other language (no cookie, no storage). Old German paths (`/methode/`, `/warteliste/`, `/datenschutz/`, `/impressum/`) redirect to the German pages, `/waitlist/` to the start page.

Text check: `npm run lint:text` after the build, tests with `npm run test:lint`.

© Jürgen Grönner. All rights reserved.
