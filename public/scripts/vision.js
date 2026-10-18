// Article viewer for vision.html. The sidebar links are the source of truth:
// each <a data-file='name.md'> points to public/articles/name.md, and their order
// sets the prev/next pagination. The route is the hash: vision.html#name.

const ARTICLES_DIR = '/articles/';

const sidebar = document.getElementById('article-list');
const content = document.getElementById('article-content');
const titleEl = document.getElementById('article-title');
const dateEl = document.getElementById('article-date');
const prevLink = document.getElementById('prev-article');
const nextLink = document.getElementById('next-article');
const baseTitle = document.title;
const articleCache = new Map();
let loadController = null;

const links = [...sidebar.querySelectorAll('a[data-file]')];
for (const link of links) {
  link.href = `#${slugOf(link)}`;
}

function slugOf(link) {
  return link.dataset.file.replace(/\.md$/i, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// From the old project's app.js; the frontmatter is optional here.
function parseArticleSource(source) {
  if (!window.jsyaml || !window.marked) {
    throw new Error('Markdown dependencies are unavailable.');
  }

  const normalizedSource = source.replace(/^﻿/, '');
  const match = normalizedSource.match(
    /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)([\s\S]*)$/,
  );

  let metadata = {};
  let markdown = normalizedSource;
  if (match) {
    const parsed = window.jsyaml.load(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) metadata = parsed;
    markdown = match[2];
  }

  // A leading # heading becomes the page title instead of being rendered twice.
  const tokens = window.marked.lexer(markdown.trimStart());
  let heading = '';
  if (tokens[0]?.type === 'heading' && tokens[0].depth === 1) {
    heading = tokens.shift().text;
  }

  return {
    metadata,
    heading,
    content: window.marked.parser(tokens),
  };
}

function formatDate(value) {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { iso: '', label: '' };
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return { iso: date, label };
}

function setPagerLink(anchor, link) {
  anchor.hidden = !link;
  if (!link) return;
  anchor.href = link.getAttribute('href');
  anchor.querySelector('.pager-title').textContent = link.textContent.trim();
}

function updateChrome(index) {
  links.forEach((link, i) => {
    if (i === index) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  setPagerLink(prevLink, links[index - 1]);
  setPagerLink(nextLink, links[index + 1]);
}

function showMessage(text, role = 'status') {
  content.innerHTML = `<p class='article-info' role='${role}'>${escapeHtml(text)}</p>`;
}

async function showArticle(index) {
  const link = links[index];
  if (!link) return;

  updateChrome(index);
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;

  const fallbackTitle = link.textContent.trim();
  titleEl.textContent = fallbackTitle;
  dateEl.hidden = true;

  const url = ARTICLES_DIR + link.dataset.file;
  try {
    let article = articleCache.get(url);
    if (!article) {
      showMessage('Chargement…');
      const response = await fetch(url, {
        headers: { Accept: 'text/markdown, text/plain;q=0.9' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Article request failed with ${response.status}.`);
      article = parseArticleSource(await response.text());
      articleCache.set(url, article);
    }
    if (controller !== loadController) return;

    const { metadata } = article;
    const title = (typeof metadata.title === 'string' && metadata.title.trim())
      || article.heading
      || fallbackTitle;
    titleEl.textContent = title;
    document.title = `${title} – ${baseTitle}`;

    const date = formatDate(metadata.date);
    dateEl.hidden = !date.iso;
    dateEl.dateTime = date.iso;
    dateEl.textContent = date.label;

    content.innerHTML = article.content;
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(`Article loading error: ${error.message}`);
    showMessage('Impossible de charger cet article pour le moment.', 'alert');
  } finally {
    if (controller === loadController) loadController = null;
  }
}

function syncFromRoute({ scroll = true } = {}) {
  const slug = decodeURIComponent(window.location.hash.slice(1));
  let index = links.findIndex((link) => slugOf(link) === slug);
  if (index < 0) {
    index = 0;
    if (slug && links[0]) history.replaceState(null, '', links[0].getAttribute('href'));
  }
  showArticle(index);
  if (scroll) window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', () => syncFromRoute());
syncFromRoute({ scroll: false });
