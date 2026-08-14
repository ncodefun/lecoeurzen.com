# Build Prompt: Quotes

Create a web app called **Quotes** — a minimal, elegant notes app for saving short quotes with metadata.

## Tech stack & constraints

- **Lit**, loaded from a CDN (e.g. `https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js` or `esm.sh/lit`) via native ES module `<script type="module">`. No build step, no bundler.
- Use `LitElement` with **plain class fields, no decorators** (`static properties = {...}` instead of `@property`).
- **Disable shadow DOM** on every component (`createRenderRoot() { return this; }`) so a single global stylesheet can drive the rem/em sizing and theme — avoids duplicating CSS custom properties per shadow root.
- Plain JS, ES modules, no TypeScript, no framework beyond Lit.
- Persistence: **IndexedDB** (no wrapper library — use the native API directly, or a ~50-line promise-wrapped helper if you want to keep call sites clean).

## Data model

Each quote record:

```js
{
  id: string,        // crypto.randomUUID()
  title: string,      // falls back to clipped `text` in the list if empty
  text: string,        // the quote itself
  author: string,
  tags: string[],       // simple array of strings
  createdAt: number,     // Date.now()
  updatedAt: number
}
```

*(Assumption: `id`, `createdAt`, `updatedAt` are implicit fields you didn't list but are needed for stable list rendering, sort order, and future search/undo. Flag if you'd rather generate IDs differently.)*

## IndexedDB

- One database (e.g. `quotes-db`), one object store `quotes`, `keyPath: 'id'`.
- No extra indices needed at this scale — filtering happens in-memory over the full loaded array (fine up to thousands of quotes).
- Load all quotes into memory on app init; keep IndexedDB and in-memory state in sync on every write (add/update/delete/import/clear).

## Layout

Full-viewport app shell, two-pane:

```
┌─────────────────────────────────────────────┐
│  Quotes            [Export] [Import]         │  <- top bar
├───────────────┬───────────────────────────────┤
│ [search input] │                               │
│ ┌───────────┐ │      Quote editor              │
│ │ Quote btn │ │   (title + text fields)        │
│ │ Quote btn │ │                                 │
│ │ Quote btn │ ├───────────────────────────────┤
│ │   ...     │ │      Metadata                  │
│ │ (scrolls) │ │   (author, tags)                │
│ └───────────┘ │                                 │
│  [+ New]      │                                 │
└───────────────┴───────────────────────────────┘
```

- **Left sidebar**: search input pinned at top; below it, a scrollable list of quotes rendered as wide full-width buttons. Button label = `title`, or if title is empty, the quote text clipped with `text-overflow: ellipsis` (single line). Active/selected quote gets a distinct highlight state. A "+ New quote" button at the bottom of the sidebar (or top, your call) creates a blank quote and selects it.
- **Right main section**: quote editor on top (title input, text `<textarea>`), metadata panel below (author input, tags input). A delete button lives here too (with a confirm step — see Edge cases).
- If no quote is selected (fresh load, or list is empty), show an empty state in the main section instead of a blank editor.

## Search / filter

- Single text input, filters live (on `input` event, no submit button) as the user types.
- Case-insensitive substring match across `title`, `text`, `author`, and each tag in `tags`.


## Editing behavior

- Autosave: debounce ~400–600ms on input in title/text/author/tags fields, write to IndexedDB and update `updatedAt` automatically.
- Tags input: simple comma-separated text field, split/trim into an array on save; render as small pill/chip elements when not focused (optional polish).

## Export

- Button in the top bar. On click:
  1. Read all records from IndexedDB.
  2. `JSON.stringify` **without whitespace** (compact, no `null, 2` indentation) to keep the backup small.
  3. Wrap in a `Blob` (`type: 'application/json'`), create an object URL, trigger download via a temporary `<a download>` element.
  4. Filename: `quotes-backup-YYYY-MM-DD.json` (date-stamped).

## Import

- Button in the top bar, triggers a hidden `<input type="file" accept="application/json">`.
- On file selection: read via `FileReader`, `JSON.parse`, validate it's an array of objects with at least `id` and `text` fields (skip/report malformed entries rather than crashing).
- **Replaces** all existing data: clear the `quotes` object store, then bulk-insert the imported records.
- Confirm before overwrite (see Edge cases) since this is destructive.

## Styling

- `html { font-size: 2.5vh; }` as specified — all component sizing in `rem`/`em` so the whole UI scales with viewport height.
- Big, simple, elegant: generous padding, clear type hierarchy (larger serif or distinct font for the quote `text` itself vs. UI chrome), plenty of whitespace, soft borders/shadows rather than heavy lines, one accent color for the selected state and buttons.
- Since shadow DOM is off, define the palette and spacing scale as CSS custom properties on `:root` once, and every component just uses them.
- Consider `clamp()` as a safety net on `html` font-size (e.g. `clamp(14px, 2.5vh, 22px)`) so extreme viewport heights (ultra-short or ultra-tall windows) don't produce unusable text sizes.

## File structure

Since it's CDN-based with no bundler, keep it flat:

```
/index.html         <- loads Lit from CDN, imports app.js, global CSS
/styles.css          <- root variables, layout, typography
/db.js                <- IndexedDB helper (open/get/put/delete/clear/bulkPut)
/app.js                <- <quotes-app> root component (state, wiring)
/sidebar.js             <- <quotes-sidebar> (search + list)
/editor.js                <- <quote-editor> (title/text/metadata/delete)
```

*(One root component with all state is fine at this scale — sidebar and editor just receive props and emit custom events like `quote-selected`, `quote-changed`, `quote-deleted` up to the parent.)*

## Edge cases to handle

- Empty list state ("No quotes yet — create your first one").
- No search results state ("No quotes match your search").
- Confirm before **delete** and before **import overwrite** (both destructive) — a simple `confirm()` is fine at this scope, doesn't need a custom modal.
- Malformed/corrupt import file: show an inline error, don't wipe existing data if parsing fails.
- Quote with empty title *and* empty text shouldn't render a blank sidebar button — fall back to something like "(empty quote)".