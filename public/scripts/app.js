const LANGUAGE_NAMES = {
  fr: 'French',
  en: 'English',
};

const DEFAULT_QUOTES = {
  fr: `Y en aura toujours 
pour redire que ça se peut juste pas
que c'est rien que du grand n'importe quoi
et d'autres encore 
pour voir que déjà
tout est là, milles fois

Encore et encore, c'est le même refrain
qui t'emmène au même ciel des perdus
qui essaye de t'emmener plus haut
et te faire voir le petit monde illuminé
ce qu'il brasse en bas, dans ses trippes
la nuit, détaché, comme un mort, tu vois…

C'est à l'infini que je le redit
c'est pas deux, c'est pas brisé
l'autre c'est le grand Soi
En haut comme en bas.
`,
  en: 'Breathe, the silence is here.\nThe heart already knows the way.\nLet the light come in.',
};

const ARTICLE_INDEX_URL = '../articles.json';
const ARTICLE_ALIGNMENTS = new Set(['start', 'end', 'left', 'right', 'center', 'justify']);

const ARTICLE_MESSAGES = {
  loading: {
    fr: 'Chargement de l’article…',
    en: 'Loading article…',
  },
  loadError: {
    fr: 'Impossible de charger cet article pour le moment.',
    en: 'This article could not be loaded right now.',
  },
  indexError: {
    fr: 'Impossible de charger la liste des articles pour le moment.',
    en: 'The article list could not be loaded right now.',
  },
};

const initialPanelState = () => ({
  fr: false,
  en: false,
});

const initialArticleState = () => ({
  fr: [],
  en: [],
});

function applyArticleOrder(articles) {
  const orderedArticles = [...articles];
  const pinnedArticles = articles
    .filter((article) => Number.isInteger(article.order) && article.order > 0)
    .sort((a, b) => a.order - b.order);

  for (const article of pinnedArticles) {
    const currentIndex = orderedArticles.indexOf(article);
    orderedArticles.splice(currentIndex, 1);
    orderedArticles.splice(Math.min(article.order - 1, orderedArticles.length), 0, article);
  }

  return orderedArticles;
}

function parseArticleSource(source) {
  if (!window.jsyaml || !window.marked) {
    throw new Error('Markdown dependencies are unavailable.');
  }

  const normalizedSource = source.replace(/^\uFEFF/, '');
  const match = normalizedSource.match(
    /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)([\s\S]*)$/,
  );

  if (!match) {
    throw new Error('Article frontmatter is missing or invalid.');
  }

  const metadata = window.jsyaml.load(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Article frontmatter must be an object.');
  }

  const tokens = window.marked.lexer(match[2].trimStart());
  if (tokens[0]?.type === 'heading' && tokens[0].depth === 1) {
    tokens.shift();
  }

  return {
    metadata,
    content: window.marked.parser(tokens),
  };
}

function fullscreenError(error) {
  console.error(`Fullscreen error: ${error.message}`);
}

function zenApp() {
  const pendingArticleScrolls = new Map();
  const articleSpotlights = new WeakMap();
  const languageResetTimers = new Map();
  const articleCache = new Map();
  let articleLoadController = null;
  let articleLoadRequest = 0;

  function cancelArticleLoad() {
    articleLoadRequest += 1;
    articleLoadController?.abort();
    articleLoadController = null;
  }

  function cancelLanguageReset(language) {
    const timer = languageResetTimers.get(language);
    if (timer === undefined) return;

    window.clearTimeout(timer);
    languageResetTimers.delete(language);
  }

  function scheduleLanguageReset(language, callback) {
    cancelLanguageReset(language);
    languageResetTimers.set(language, window.setTimeout(() => {
      languageResetTimers.delete(language);
      callback();
    }, 400));
  }

  function articleSpotlightState(content) {
    let state = articleSpotlights.get(content);
    if (state) return state;

    state = {
      active: false,
      frame: 0,
      clientX: 0,
      clientY: 0,
    };
    articleSpotlights.set(content, state);
    return state;
  }

  function queueArticleSpotlightPosition(content, state) {
    if (state.frame) return;

    state.frame = window.requestAnimationFrame(() => {
      state.frame = 0;
      if (!state.active) return;

      const bounds = content.getBoundingClientRect();
      content.style.setProperty('--article-spotlight-x', `${state.clientX - bounds.left}px`);
      content.style.setProperty('--article-spotlight-y', `${state.clientY - bounds.top}px`);
    });
  }

  function clearArticleSpotlight(content) {
    if (!content) return;

    const state = articleSpotlights.get(content);
    if (state?.frame) window.cancelAnimationFrame(state.frame);
    if (state) {
      state.active = false;
      state.frame = 0;
    }
    content.classList.remove('is-spotlit');
  }

  return {
    activeLanguage: '',
    darkMode: document.documentElement.dataset.theme === 'dark',
    exitingArticleLanguage: '',
    articles: initialArticleState(),
    articlesReady: false,
    articleIndexError: false,
    scrolledArticles: initialPanelState(),
    selectedArticleIndex: -1,
    selectedArticleLanguage: '',
    loadedArticle: null,

    init() {
      this.applyTheme(this.darkMode);
      this.loadArticleIndex();
    },

    applyTheme(isDark) {
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    },

    toggleTheme() {
      this.darkMode = !this.darkMode;
      this.applyTheme(this.darkMode);

      if (!this.darkMode) {
        clearArticleSpotlight(this.$refs.articleFr?.querySelector('.article-content'));
        clearArticleSpotlight(this.$refs.articleEn?.querySelector('.article-content'));
      }

      try {
        localStorage.setItem('zen-theme', this.darkMode ? 'dark' : 'light');
      } catch {
        // The theme still works when storage is unavailable.
      }
    },

    async loadArticleIndex() {
      try {
        const response = await fetch(ARTICLE_INDEX_URL, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`Article index request failed with ${response.status}.`);
        }

        const articleIndex = await response.json();
        if (!Array.isArray(articleIndex)) {
          throw new Error('Article index must be an array.');
        }

        const articles = initialArticleState();
        for (const article of articleIndex) {
          const language = article.lang;
          if (!Object.hasOwn(LANGUAGE_NAMES, language)) {
            console.warn(`Ignoring article with unsupported language: ${article.slug ?? 'unknown'}`);
            continue;
          }
          if (
            typeof article.title !== 'string'
            || typeof article.slug !== 'string'
            || typeof article.markdownUrl !== 'string'
          ) {
            console.warn('Ignoring invalid article index entry.', article);
            continue;
          }

          articles[language].push(article);
        }

        this.articles = {
          fr: applyArticleOrder(articles.fr),
          en: applyArticleOrder(articles.en),
        };
      } catch (error) {
        console.error(`Article index error: ${error.message}`);
        this.articleIndexError = true;
      } finally {
        this.articlesReady = true;
        this.syncArticleFromRoute();
      }
    },

    async toggleFullscreen() {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        fullscreenError(error);
      }
    },

    isLanguageOpen(language) {
      return this.activeLanguage === language;
    },

    toggleLanguage(language) {
      if (this.isLanguageOpen(language)) {
        this.activeLanguage = '';
        scheduleLanguageReset(language, () => this.resetLanguageState(language));
        return;
      }

      const closingLanguage = this.activeLanguage;
      this.activeLanguage = language;
      cancelLanguageReset(language);
      if (closingLanguage) {
        scheduleLanguageReset(closingLanguage, () => this.resetLanguageState(closingLanguage));
      }
    },

    hasSelectedArticle(language) {
      return this.selectedArticleLanguage === language && this.selectedArticleIndex >= 0;
    },

    selectArticle(language, index, updateRoute = true) {
      const article = this.articles[language]?.[index];
      if (!article) return;

      cancelLanguageReset(language);
      this.exitingArticleLanguage = '';
      this.selectedArticleLanguage = language;
      this.selectedArticleIndex = index;
      this.activeLanguage = language;
      this.resetArticleScroll(language);

      if (updateRoute && window.location.hash !== `#${article.slug}`) {
        window.location.hash = article.slug;
      }

      this.loadArticle(language, index);
    },

    async loadArticle(language, index) {
      const article = this.articles[language]?.[index];
      if (!article) return;

      cancelArticleLoad();
      const request = articleLoadRequest;
      this.loadedArticle = {
        language,
        index,
        title: article.title,
        metadata: article,
        status: 'loading',
        content: '',
      };

      try {
        let parsedArticle = articleCache.get(article.markdownUrl);
        if (!parsedArticle) {
          articleLoadController = new AbortController();
          const response = await fetch(article.markdownUrl, {
            headers: { Accept: 'text/markdown, text/plain;q=0.9' },
            signal: articleLoadController.signal,
          });
          if (!response.ok) {
            throw new Error(`Article request failed with ${response.status}.`);
          }

          parsedArticle = parseArticleSource(await response.text());
          articleCache.set(article.markdownUrl, parsedArticle);
        }

        if (
          request !== articleLoadRequest
          || this.selectedArticleLanguage !== language
          || this.selectedArticleIndex !== index
        ) return;

        const parsedTitle = typeof parsedArticle.metadata.title === 'string'
          ? parsedArticle.metadata.title.trim()
          : '';
        this.loadedArticle = {
          language,
          index,
          title: parsedTitle || article.title,
          metadata: {
            ...parsedArticle.metadata,
            ...article,
            title: parsedTitle || article.title,
          },
          status: 'ready',
          content: parsedArticle.content,
        };
      } catch (error) {
        if (error.name === 'AbortError' || request !== articleLoadRequest) return;

        console.error(`Article loading error: ${error.message}`);
        this.loadedArticle = {
          language,
          index,
          title: article.title,
          metadata: article,
          status: 'error',
          content: '',
        };
      } finally {
        if (request === articleLoadRequest) {
          articleLoadController = null;
        }
      }
    },

    syncArticleFromRoute() {
      if (!this.articlesReady) return;

      const slug = decodeURIComponent(window.location.hash.slice(1));

      if (!slug) {
        this.resetArticleSelection();
        return;
      }

      for (const language of Object.keys(LANGUAGE_NAMES)) {
        const index = this.articles[language].findIndex((article) => article.slug === slug);
        if (index >= 0) {
          if (this.selectedArticleLanguage === language && this.selectedArticleIndex === index) return;
          this.selectArticle(language, index, false);
          return;
        }
      }

      this.resetArticleSelection();
    },

    closeArticle() {
      if (window.location.hash) {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
      }

      this.resetArticleSelection();
    },

    queueArticleScroll(language, article) {
      if (pendingArticleScrolls.has(language)) return;

      pendingArticleScrolls.set(language, window.requestAnimationFrame(() => {
        pendingArticleScrolls.delete(language);
        const isScrolled = article.scrollTop > 8;
        if (this.scrolledArticles[language] !== isScrolled) {
          this.scrolledArticles[language] = isScrolled;
        }

        const content = article.querySelector('.article-content');
        const spotlight = content && articleSpotlights.get(content);
        if (spotlight?.active) queueArticleSpotlightPosition(content, spotlight);
      }));
    },

    moveArticleSpotlight(event) {
      if (event.pointerType === 'touch' || document.documentElement.dataset.theme !== 'dark') return;

      const content = event.currentTarget;
      const state = articleSpotlightState(content);
      state.active = true;
      state.clientX = event.clientX;
      state.clientY = event.clientY;
      content.classList.add('is-spotlit');
      queueArticleSpotlightPosition(content, state);
    },

    endArticleSpotlight(event) {
      clearArticleSpotlight(event.currentTarget);
    },

    resetArticleScroll(language) {
      const pendingScroll = pendingArticleScrolls.get(language);
      if (pendingScroll) {
        window.cancelAnimationFrame(pendingScroll);
        pendingArticleScrolls.delete(language);
      }

      this.scrolledArticles[language] = false;
      this.$nextTick(() => {
        const article = this.$refs[language === 'fr' ? 'articleFr' : 'articleEn'];
        if (article) {
          clearArticleSpotlight(article.querySelector('.article-content'));
          article.scrollTop = 0;
        }
      });
    },

    resetArticleSelection() {
      const exitingLanguage = this.selectedArticleLanguage || this.loadedArticle?.language;
      cancelArticleLoad();
      this.exitingArticleLanguage = exitingLanguage || '';
      this.selectedArticleIndex = -1;
      this.selectedArticleLanguage = '';
      this.resetArticleScroll('fr');
      this.resetArticleScroll('en');

      if (!exitingLanguage || this.loadedArticle?.language !== exitingLanguage) {
        this.exitingArticleLanguage = '';
      }
    },

    resetLanguageState(language) {
      this.resetArticleScroll(language);

      if (this.selectedArticleLanguage !== language) return;

      cancelArticleLoad();
      this.exitingArticleLanguage = '';
      this.selectedArticleIndex = -1;
      this.selectedArticleLanguage = '';
      if (window.location.hash) {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    },

    articleTitle(language) {
      if (this.loadedArticle?.language === language) {
        const title = this.loadedArticle.metadata?.title;
        if (typeof title === 'string' && title.trim()) return title.trim();
      }

      if (this.selectedArticleLanguage !== language) return '';
      return this.articles[language]?.[this.selectedArticleIndex]?.title ?? '';
    },

    quoteContent(language) {
      if (this.articleIndexError) return ARTICLE_MESSAGES.indexError[language];
      return DEFAULT_QUOTES[language];
    },

    articleContent(language) {
      if (this.loadedArticle?.language !== language) return '';
      if (this.loadedArticle.status === 'loading') {
        return `<p class="article-info" role="status">${ARTICLE_MESSAGES.loading[language]}</p>`;
      }
      if (this.loadedArticle.status === 'error') {
        return `<p class="article-info" role="alert">${ARTICLE_MESSAGES.loadError[language]}</p>`;
      }
      return this.loadedArticle.content;
    },

    articleAlignment(language) {
      const loadedAlignment = this.loadedArticle?.language === language
        ? this.loadedArticle.metadata?.align
        : null;
      const selectedAlignment = this.selectedArticleLanguage === language
        ? this.articles[language]?.[this.selectedArticleIndex]?.align
        : null;
      const alignment = loadedAlignment ?? selectedAlignment ?? 'left';

      return ARTICLE_ALIGNMENTS.has(alignment) ? alignment : 'left';
    },

    isArticleLoading(language) {
      return this.loadedArticle?.language === language
        && this.loadedArticle.status === 'loading';
    },

    isArticleRendered(language) {
      return this.hasSelectedArticle(language)
        || this.exitingArticleLanguage === language;
    },

    isArticleExiting(language) {
      return this.exitingArticleLanguage === language;
    },

    finishArticleExit(language, event) {
      if (
        event.target !== event.currentTarget
        || event.propertyName !== 'opacity'
        || this.exitingArticleLanguage !== language
        || this.hasSelectedArticle(language)
      ) return;

      this.exitingArticleLanguage = '';
    },
  };
}

window.zenApp = zenApp;
