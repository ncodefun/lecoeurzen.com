# Le cœur Zen – lecoeurzen.com

Static site in French (fr-CA) for José Roux's contemplative coaching.

> Keep this file current: when a change adds a page, a convention or a workflow (or makes a line below wrong), update this file in the same change. Keep it short.

## Setup

- No build step: `public/` is served as is. Vite is for dev only, on http://localhost:5010, which is normally already running, so don't start it (`vite.config.js`, run with a global vite: `npm run dev`). Firebase Hosting (`cleanUrls`) serves `/name` → `name.html`.
- Every push to `main` deploys to production (`.github/workflows/firebase-hosting-merge.yml`). The user commits straight to `main`. Commit or push only when asked.
- No npm dependencies. Libraries come from a CDN with pinned versions (jsdelivr: `js-yaml@4.1.0`, `marked@16.4.2`, used by the retired Vision page). The Montserrat font comes from Google Fonts.
- The previous version of the site lives in `~/Sync/code/lecoeurzen.com` (it used Alpine and a Node build). It's a reference only.

## Pages

- `index.html` is the only page: logo, subtitle (no longer a link), footer circle with meditator/egg, presentation modal. Script: `scripts/app.js`. Its meta/OG description and the `WebSite` JSON-LD description share the same text; keep them in sync with `llms.txt` and `site.webmanifest`.
- `aside/` holds retired pages, kept for reference and not served: `presentation.html` (long text + FAQ), `vision.html` + `scripts/vision.js` + `articles/*.md` (Markdown article viewer, see git history for its conventions). Their CSS (`.page`, `.vision`, `#vision-layout`) is still in `styles.css`. To bring one back, move it into `public/` (restoring script/article paths) and follow the checklist below; `firebase.json` still sends `X-Robots-Tag: noindex` for `/vision` and `/articles/**`.
- `node prosify.mjs <file.md> [out.md]` (repo root) cleans a raw text: capitalizes each line, drops trailing commas, `...` → `…`.
- Every page uses `styles/styles.css` and `scripts/theme.js`. The `<head>` boilerplate (favicons, OG tags, inline theme script) is copied page to page. Use `aside/presentation.html` as the template for a new text page (`<body class='page'>`).

## Conventions

- HTML: tabs, single-quoted attributes. French typography: `&hairsp;` before `? ! : ;`, `&thinsp;` inside « guillemets ».
- CSS: one global stylesheet with native nesting. The root font size follows the viewport height (`2.7dvh`), so layout breakpoints use `aspect-ratio`, not width. Dark mode is `html[data-theme='dark']`: the choice is saved in `localStorage` as `zen-theme`, which an inline `<head>` script reads before the page draws. Light/dark colors use `light-dark()`.
- Arrows (pager, back links): `<span class='arrow-icon'></span>` (`.left` flips it). It's `images/arrow.svg` used as a CSS mask, so it takes the text color.
- Keep the JS small and vanilla. Prefer plain HTML that the user can edit to generated content.

## When adding or renaming a page or article

- `sitemap.xml`: add the clean URL with its `lastmod`.
- `llms.txt`: add the page under Pages. For an article, add its raw `.md` URL under Articles.
- Set the canonical and `og:url` without `.html`.
