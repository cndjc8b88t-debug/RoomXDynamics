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

`/`, `/method/`, `/waitlist/`, `/privacy/`, `/imprint/`, `404.html`. Old paths (`/methode/`, `/warteliste/`, `/datenschutz/`, `/impressum/`) redirect to the English pages.

© Jürgen Grönner. All rights reserved.
