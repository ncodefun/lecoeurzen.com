# Le cœur Zen – lecoeurzen.com

Static site in French (fr-CA) for José Roux's contemplative coaching.

> Keep this file current: when a change adds a page, a convention or a workflow (or makes a line below wrong), update this file in the same change. Keep it short.

## Setup

- No build step: `public/` is served as is. Vite is for dev only, on http://localhost:5010, which is normally already running, so don't start it (`vite.config.js`, run with a global vite: `npm run dev`). Firebase Hosting (`cleanUrls`) serves `/presentation` → `presentation.html`.
- Every push to `main` deploys to production (`.github/workflows/firebase-hosting-merge.yml`). The user commits straight to `main`. Commit or push only when asked.
- No npm dependencies. Libraries come from a CDN with pinned versions (jsdelivr: `js-yaml@4.1.0`, `marked@16.4.2`). The Montserrat font comes from Google Fonts.
- The previous version of the site lives in `~/Sync/code/lecoeurzen.com` (it used Alpine and a Node build). It's a reference only.

## Pages

- `index.html`: home page (logo, subtitle, footer circle with meditator/egg, presentation modal). Script: `scripts/app.js`.
- `presentation.html`: long text page. Its FAQ is mirrored in the `FAQPage` JSON-LD in `<head>`, so keep both in sync.
- `vision.html`: Markdown article viewer (`scripts/vision.js`).
  - Articles are `public/articles/*.md`. Front matter is optional (`title`, `date`). A leading `# heading` becomes the page title.
  - `frenchSpacing()` in `vision.js` adds the hair space before `! ? : ;` in rendered articles and sidebar titles, so `.md` files can be written without it (`Bonjour!`). It skips code and `10:30`-style colons.
  - The user keeps the sidebar list by hand: `<li><a data-file='name.md'>Title</a></li>`. Its order sets the prev/next arrows, and the URL is `vision.html#name`.
  - Only `/vision` (the first article) can be indexed by Google. Articles reach AI tools through `llms.txt`.
- Every page uses `styles/styles.css` and `scripts/theme.js`. The `<head>` boilerplate (favicons, OG tags, inline theme script) is copied page to page. Use `presentation.html` as the template for a new text page (`<body class='page'>`).

## Conventions

- HTML: tabs, single-quoted attributes. French typography: `&hairsp;` before `? ! : ;`, `&thinsp;` inside « guillemets ».
- CSS: one global stylesheet with native nesting. The root font size follows the viewport height (`2.7dvh`), so layout breakpoints use `aspect-ratio`, not width. Dark mode is `html[data-theme='dark']`: the choice is saved in `localStorage` as `zen-theme`, which an inline `<head>` script reads before the page draws. Light/dark colors use `light-dark()`.
- Keep the JS small and vanilla. Prefer plain HTML that the user can edit to generated content.

## When adding or renaming a page or article

- `sitemap.xml`: add the clean URL with its `lastmod`.
- `llms.txt`: add the page under Pages. For an article, add its raw `.md` URL under Articles.
- Set the canonical and `og:url` without `.html`.
