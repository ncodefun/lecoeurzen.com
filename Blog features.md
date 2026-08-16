# Blog features

Implement a lightweight static Markdown article system for this existing Alpine app / Firebase project.

Assume this structure:

```text
articles/
  dreams.md
  meditation.md

public/
  index.html
  articles.json
  articles/
    dreams.md
    meditation.md
  dreams.html
  meditation.html
  sitemap.xml
```

## Node build

Markdown files in `/articles` are the source of truth for articles, with YAML frontmatter for at least:

```yaml
title:
slug:
date:
description:
tags:
draft:
```

There are two representations of every published article:

1. The normal user experience is the existing Web app at the root.
2. A generated plain HTML page exists primarily so search engines can crawl and index the article content.

The generated static indexing pages should use normal crawlable URLs such as:

```text
https://lecoeurzen.com/dreams
https://lecoeurzen.com/meditation
```

Configure Firebase Hosting with `cleanUrls: true` if needed so `/dreams` serves `dreams.html`.

Do NOT attempt to make `/#dreams` etc. the canonical URLs of the generated pages. URL fragments should not be used as canonical article URLs for SEO.

The generated `/dreams` page should instead be self-canonical and contain a clear link back to the SPA experience at `/#dreams`.


The generated `/dreams` page is primarily for crawling/indexing. Keep it semantic, lightweight and JS-free, with:

- title and description metadata
- self-canonical URL `/dreams`
- full rendered article content
- publication metadata where available
- a link css file: ./article-styles.css
- a prominent link to the preferred interactive experience at `/#dreams`: "Lire sur la page principale" | "Read on the home page"


Build steps and details:

- scan `articles/*.md`
- parse frontmatter and Markdown (use marked, js-yaml)
- ignore drafts completely
- generate a plain standalone HTML page for each article, e.g. `public/dreams.html`
- copy published raw Markdown to `public/articles/`
- generate `public/articles.json` with article metadata and URLs
- generate/update `public/sitemap.xml`
- integrate all of this into the existing `npm run build`


`articles.json` entries should contain enough information for the app to render article listings and load an article.

For example:

```json
[
  {
    "title": "Dreams",
    "slug": "dreams",
    "date": "2026-08-14",
    "description": "Reflections on dreams and their place in inner exploration.",
    "tags": ["dreams", "psychology"],
    "markdownUrl": "/content/dreams.md",
    "indexUrl": "/dreams",
    "appUrl": "/#dreams"
  }
]

Sort the index newest-first.


## App loading of articles-index.json and md files on demand and data rendering & handling

Load article .md file on demand from ./articles, parse the md and frontmatter metadata and display…

TODO: detail this as a complete plan before implementation
