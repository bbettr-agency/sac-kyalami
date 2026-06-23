# SAC Kyalami — Growth Strategy Presentation

A premium, interactive HTML consulting presentation for **SAC Kyalami**, built by BBettr Agency.

23 slides covering the trust legacy, digital diagnosis, the recoverable opportunity, the
Reclaim → Retain → Acquire strategy, the systems in action, a live business-case calculator,
the engagement comparison, and the implementation roadmap.

## Stack

Static front-end only — no build step:

- `index.html` — all 23 slides
- `css/style.css` — design system (dark charcoal, red accent, Inter + JetBrains Mono)
- `js/app.js` — GSAP-driven navigation, choreography, and the live calculators (Slides 8 · 9 · 20)
- GSAP loaded from CDN

## Run locally

Any static server works. A tiny one is included:

```bash
node server.js          # serves on http://localhost:4321
```

…or open `index.html` directly.

## Navigation

Arrow keys / Space / Page Up–Down, Home / End, the side dots, the on-screen arrows,
mouse wheel, or horizontal swipe on touch devices.

## Deploy

Static deploy, no build step. `vercel.json` pins this explicitly:
framework `null`, no build/install command, output directory `.` (repo root).
`index.html` is the entry point; `css/` and `js/` are served as-is.

> **Important — public access:** if the deployment shows the page but with no styling
> (raw HTML / serif font / 401 on `css/style.css`), **Vercel Deployment Protection** is enabled.
> In the Vercel project: **Settings → Deployment Protection → Vercel Authentication → Disabled**
> (and ensure Password Protection is off) so visitors without a Vercel account can load the deck
> and all its assets. This is a project setting, not a code change.

## Notes

All financial figures and example data are clearly labelled **illustrative** in-deck and are
intended to be replaced with, or driven live by, the client's real numbers via the on-slide calculators.
