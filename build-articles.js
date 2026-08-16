import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import yaml from 'js-yaml'
import { marked } from 'marked'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const sourceDirectory = path.join(projectRoot, 'articles')
const publicDirectory = path.join(projectRoot, 'public')
const publishedMarkdownDirectory = path.join(publicDirectory, 'articles')
const siteUrl = 'https://lecoeurzen.com'
const supportedAlignments = new Set(['start', 'end', 'left', 'right', 'center', 'justify'])
const homeLinkLabels = {
  fr: 'Lire sur la page principale',
  en: 'Read on the home page',
}
const requiredFrontmatterFields = [
  'title',
  'slug',
  'date',
  'description',
  'tags',
  'lang',
  'draft',
]

function getCurrentDate() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function renderNewArticleSource() {
  return `---
title: New Article
slug: new-article
date: ${getCurrentDate()}
description:
tags:
lang: en
draft: true
---

# New Article
`
}

async function createNewArticleSource() {
  try {
    await writeFile(
      path.join(sourceDirectory, 'new-article.md'),
      renderNewArticleSource(),
      { encoding: 'utf8', flag: 'wx' },
    )
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeXml(value) {
  return escapeHtml(value)
}

function parseFrontmatter(fileName, source) {
  const normalizedSource = source.replace(/^\uFEFF/, '')
  const match = normalizedSource.match(
    /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)([\s\S]*)$/,
  )

  if (!match) {
    throw new Error(`${fileName}: missing or invalid YAML frontmatter`)
  }

  const metadata = yaml.load(match[1])
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${fileName}: frontmatter must be a YAML object`)
  }

  return { metadata, markdown: match[2].trimStart() }
}

function normalizeDate(fileName, value) {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : value

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fileName}: date must use YYYY-MM-DD format`)
  }

  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error(`${fileName}: date is not a valid calendar date`)
  }

  return date
}

function normalizeMetadata(fileName, metadata) {
  const missingFields = requiredFrontmatterFields.filter(
    (field) => !Object.hasOwn(metadata, field),
  )
  if (missingFields.length > 0) {
    throw new Error(
      `${fileName}: missing frontmatter field${missingFields.length === 1 ? '' : 's'}: ${missingFields.join(', ')}`,
    )
  }

  const title = typeof metadata.title === 'string' ? metadata.title.trim() : ''
  const slug = typeof metadata.slug === 'string' ? metadata.slug.trim() : ''

  if (!title) {
    throw new Error(`${fileName}: title must be a non-empty string`)
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `${fileName}: slug must contain lowercase letters, numbers, and single hyphens only`,
    )
  }
  if (typeof metadata.draft !== 'boolean') {
    throw new Error(`${fileName}: draft must be true or false`)
  }

  const description = metadata.description == null ? '' : metadata.description
  if (typeof description !== 'string') {
    throw new Error(`${fileName}: description must be a string or empty`)
  }

  const tags = metadata.tags == null ? [] : metadata.tags
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    throw new Error(`${fileName}: tags must be a list of strings or empty`)
  }

  const lang = metadata.lang
  if (!['fr', 'en'].includes(lang)) {
    throw new Error(`${fileName}: lang must be "fr" or "en"`)
  }

  const align = metadata.align == null ? 'left' : metadata.align
  if (typeof align !== 'string' || !supportedAlignments.has(align.trim())) {
    throw new Error(
      `${fileName}: align must be start, end, left, right, center, or justify`,
    )
  }

  const order = metadata.order
  if (order != null && (!Number.isInteger(order) || order < 1)) {
    throw new Error(`${fileName}: order must be a positive whole number`)
  }

  return {
    title,
    slug,
    date: normalizeDate(fileName, metadata.date),
    description: description.trim(),
    tags: tags.map((tag) => tag.trim()).filter(Boolean),
    lang,
    align: align.trim(),
    draft: metadata.draft,
    ...(order == null ? {} : { order }),
  }
}

function renderArticlePage(article) {
  const canonicalUrl = `${siteUrl}/${article.slug}`
  const appUrl = `/#${article.slug}`
  const homeLinkLabel = homeLinkLabels[article.lang]
  const tokens = marked.lexer(article.markdown)
  const beginsWithHeading = tokens[0]?.type === 'heading' && tokens[0].depth === 1
  const titleHeading = beginsWithHeading ? '' : `<h1>${escapeHtml(article.title)}</h1>`
  const tagList = article.tags.length
    ? `<ul class="article-tags" aria-label="Tags">${article.tags
        .map((tag) => `<li>${escapeHtml(tag)}</li>`)
        .join('')}</ul>`
    : ''

  return `<!doctype html>
<html lang="${article.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="/images/icons/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="192x192" href="/images/icons/android-chrome-192x192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/icons/apple-touch-icon.png">
    <title>${escapeHtml(article.title)} | Le cœur zen</title>
    <meta name="description" content="${escapeHtml(article.description)}">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="stylesheet" href="./styles/article-styles.css">
  </head>
  <body>
    <main class="article-shell">
      <a class="home-link" href="${appUrl}">${homeLinkLabel}</a>
      <article>
        <header class="article-header">
          ${titleHeading}
          <p class="article-date"><time datetime="${article.date}">${article.date}</time></p>
          ${tagList}
        </header>
        <div class="article-content" style="text-align: ${article.align}">
${marked.parse(article.markdown).trim()}
        </div>
      </article>
      <footer>
        <a href="${appUrl}">${homeLinkLabel}</a>
      </footer>
    </main>
  </body>
</html>
`
}

function renderSitemap(articles) {
  const urls = [
    '  <url>\n    <loc>https://lecoeurzen.com/</loc>\n  </url>',
    ...articles.map(
      (article) =>
        `  <url>\n    <loc>${escapeXml(`${siteUrl}/${article.slug}`)}</loc>\n    <lastmod>${article.date}</lastmod>\n  </url>`,
    ),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

async function readPreviousPublishedSlugs() {
  try {
    const previousIndex = JSON.parse(
      await readFile(path.join(publicDirectory, 'articles.json'), 'utf8'),
    )
    return previousIndex
      .map((article) => article?.slug)
      .filter((slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return []
    }
    throw error
  }
}

async function buildArticles() {
  await createNewArticleSource()

  const entries = await readdir(sourceDirectory, { withFileTypes: true })
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .sort()

  const articles = []
  const seenSlugs = new Set()

  for (const fileName of markdownFiles) {
    const sourcePath = path.join(sourceDirectory, fileName)
    const source = await readFile(sourcePath, 'utf8')
    const { metadata, markdown } = parseFrontmatter(fileName, source)

    if (metadata.draft === true) {
      continue
    }

    const articleMetadata = normalizeMetadata(fileName, metadata)

    if (seenSlugs.has(articleMetadata.slug)) {
      throw new Error(`${fileName}: duplicate slug "${articleMetadata.slug}"`)
    }
    seenSlugs.add(articleMetadata.slug)

    articles.push({ ...articleMetadata, fileName, markdown, source })
  }

  articles.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

  await mkdir(publishedMarkdownDirectory, { recursive: true })

  const currentSlugs = new Set(articles.map((article) => article.slug))
  const previousSlugs = await readPreviousPublishedSlugs()
  for (const slug of previousSlugs) {
    if (!currentSlugs.has(slug)) {
      await Promise.all([
        rm(path.join(publicDirectory, `${slug}.html`), { force: true }),
        rm(path.join(publishedMarkdownDirectory, `${slug}.md`), { force: true }),
      ])
    }
  }

  await Promise.all(
    articles.flatMap((article) => [
      writeFile(
        path.join(publicDirectory, `${article.slug}.html`),
        renderArticlePage(article),
        'utf8',
      ),
      writeFile(
        path.join(publishedMarkdownDirectory, `${article.slug}.md`),
        article.source,
        'utf8',
      ),
    ]),
  )

  const articleIndex = articles.map(({ title, slug, date, description, tags, lang, align, order }) => ({
    title,
    slug,
    date,
    description,
    tags,
    lang,
    align,
    ...(order == null ? {} : { order }),
    markdownUrl: `/articles/${slug}.md`,
    indexUrl: `/${slug}`,
    appUrl: `/#${slug}`,
  }))

  await Promise.all([
    writeFile(
      path.join(publicDirectory, 'articles.json'),
      `${JSON.stringify(articleIndex, null, 2)}\n`,
      'utf8',
    ),
    writeFile(path.join(publicDirectory, 'sitemap.xml'), renderSitemap(articles), 'utf8'),
  ])

  console.log(
    `Built ${articles.length} published article${articles.length === 1 ? '' : 's'} from ${markdownFiles.length} Markdown file${markdownFiles.length === 1 ? '' : 's'}.`,
  )
}

buildArticles().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
