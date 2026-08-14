const LANGUAGE_NAMES = {
  fr: 'French',
  en: 'English',
};

const DEFAULT_QUOTES = {
  fr: 'Respire, le silence est là.\nLe cœur connaît le chemin.\nLaisse la lumière entrer.',
  en: 'Breathe, the silence is here.\nThe heart already knows the way.\nLet the light come in.',
};

const TEST_ARTICLE_PARAGRAPHS = {
  fr: [
    'Au commencement, il n’y a rien à accomplir. Il y a seulement ce souffle qui entre, ce souffle qui sort, et l’espace tranquille qui les accueille. Lorsque l’attention revient au corps, les pensées ne disparaissent pas forcément, mais elles cessent peu à peu de diriger chaque mouvement intérieur.',
    'Nous pouvons alors écouter plus finement. Sous le bruit des habitudes se trouve une présence simple, sans urgence et sans jugement. Elle ne demande pas que la journée soit parfaite. Elle invite seulement à rencontrer ce qui est là avec assez de douceur pour ne pas ajouter une lutte à la difficulté du moment.',
    'Marcher dans cette présence transforme les gestes ordinaires. Une tasse tenue entre les mains, une fenêtre ouverte sur la pluie, quelques pas dans une pièce silencieuse deviennent des points d’ancrage. Le monde ne ralentit pas toujours, mais notre manière de l’habiter peut devenir plus vaste et plus souple.',
    'Quand une émotion monte, il est possible de lui faire une place sans la confondre avec toute notre histoire. Elle traverse le corps comme une météo passagère. En restant proche du souffle, nous découvrons qu’une sensation peut être intense sans être permanente, et qu’elle peut se dénouer sans être poussée ni retenue.',
    'Cette pratique n’est pas un retrait de la vie. Elle nous rend plus disponibles à ce qui compte vraiment : une parole honnête, une limite respectée, un silence partagé, un geste offert sans attente. La clarté naît rarement d’un grand effort; elle apparaît lorsque nous cessons un instant de nous éloigner de nous-mêmes.',
    'Puis vient le moment de reprendre la route. Rien de spectaculaire n’a peut-être changé, pourtant quelque chose s’est déplacé. Le regard est moins serré, le cœur un peu plus ouvert. Nous avançons avec la possibilité de revenir, encore et encore, à ce lieu intérieur qui n’a jamais cessé de nous attendre.',
  ],
  en: [
    'At the beginning, there is nothing to accomplish. There is only this breath entering, this breath leaving, and the quiet space that receives them both. When attention returns to the body, thoughts do not necessarily disappear, but little by little they stop directing every inner movement.',
    'We can then listen more carefully. Beneath the noise of habit is a simple presence, without urgency or judgment. It does not ask the day to be perfect. It only invites us to meet what is here with enough gentleness that we do not add another struggle to the difficulty of the moment.',
    'Moving within this presence changes ordinary gestures. A cup held between the hands, a window open to the rain, or a few steps through a quiet room become points of return. The world does not always slow down, but our way of inhabiting it can become wider and more flexible.',
    'When an emotion rises, we can make room for it without confusing it with our entire story. It moves through the body like passing weather. By staying close to the breath, we discover that a sensation can be intense without being permanent, and that it can loosen without being pushed away or held in place.',
    'This practice is not a retreat from life. It makes us more available to what truly matters: an honest word, a respected boundary, a shared silence, a gesture offered without expectation. Clarity rarely comes from great effort; it appears when, for a moment, we stop moving away from ourselves.',
    'Then the moment comes to continue on our way. Nothing spectacular may have changed, yet something has shifted. The gaze is less narrow and the heart a little more open. We move forward knowing we can return, again and again, to the inner place that never stopped waiting for us.',
  ],
};

const ARTICLE_TITLES = {
  fr: [
    'Respirer dans le silence',
    'Le seuil invisible du matin',
    'Lorsque le cœur cesse de chercher',
    'Marcher lentement sous la lune',
    "La tasse vide et l'esprit clair",
    'Habiter l’instant entre deux pensées',
    'Le jardin intérieur après la pluie',
    'La sagesse tranquille des pierres',
    'Écouter ce que le vent ne dit pas',
    'Revenir au souffle, revenir à soi',
    'Le lotus qui fleurit dans l’ombre',
    'Une lumière au centre du chaos',
    'L’art doux de ne rien retenir',
    'Quand la montagne devient chemin',
    'La présence comme unique refuge',
    'Ce que murmure la rivière immobile',
    'Les mille portes d’un seul instant',
  ],
  en: [
    'Breathing into the silence',
    'The invisible threshold of morning',
    'When the heart stops searching',
    'Walking slowly beneath the moon',
    'The empty cup and the clear mind',
    'Living between two thoughts',
    'The inner garden after rain',
    'The quiet wisdom of stones',
    'Listening to what the wind leaves unsaid',
    'Returning to the breath, returning home',
    'The lotus blooming in shadow',
    'A light at the center of chaos',
    'The gentle art of holding nothing',
    'When the mountain becomes the path',
    'Presence as the only refuge',
    'What the motionless river whispers',
    'A thousand doors in a single moment',
  ],
};

function slugify(title) {
  return title
    .normalize('NFD')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const ARTICLES = Object.fromEntries(
  Object.entries(ARTICLE_TITLES).map(([language, titles]) => [
    language,
    titles.map((title) => ({
      title,
      slug: slugify(title),
      source: `./articles/${language}/${slugify(title)}.md`,
    })),
  ]),
);

const initialPanelState = () => ({
  fr: false,
  en: false,
});

function fullscreenError(error) {
  console.error(`Fullscreen error: ${error.message}`);
}

function zenApp() {
  return {
    activeLanguage: '',
    collapsedMenus: initialPanelState(),
    articles: ARTICLES,
    testArticleParagraphs: TEST_ARTICLE_PARAGRAPHS,
    scrolledArticles: initialPanelState(),
    selectedArticleIndex: -1,
    selectedArticleLanguage: '',
    loadedArticle: null,

    init() {
      this.syncArticleFromRoute();
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
      const isOpening = !this.isLanguageOpen(language);
      if (isOpening) {
        this.closeArticle();
        this.activeLanguage = language;
        return;
      }

      this.activeLanguage = '';
    },

    hasSelectedArticle(language) {
      return this.selectedArticleLanguage === language && this.selectedArticleIndex >= 0;
    },

    selectArticle(language, index, updateRoute = true) {
      const article = this.articles[language]?.[index];
      if (!article) return;

      this.selectedArticleLanguage = language;
      this.selectedArticleIndex = index;
      this.activeLanguage = language;
      this.collapsedMenus.fr = language === 'fr';
      this.collapsedMenus.en = language === 'en';
      this.resetArticleScroll(language);

      if (updateRoute && window.location.hash !== `#${article.slug}`) {
        window.location.hash = article.slug;
      }

      this.loadArticle(language, index);
    },

    async loadArticle(language, index) {
      const article = this.articles[language]?.[index];
      if (!article) return;

      // File loading/parsing boundary: replace this placeholder with a fetch of
      // article.source and pass the response through the future Markdown parser.
      this.loadedArticle = {
        language,
        index,
        title: article.title,
        content: language === 'fr'
          ? `Le contenu de « ${article.title} » sera chargé depuis ${article.source}.`
          : `“${article.title}” will be loaded from ${article.source}.`,
      };
    },

    syncArticleFromRoute() {
      const slug = decodeURIComponent(window.location.hash.slice(1));

      if (!slug) {
        this.resetArticleSelection();
        return;
      }

      for (const language of Object.keys(LANGUAGE_NAMES)) {
        const index = this.articles[language].findIndex((article) => article.slug === slug);
        if (index >= 0) {
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

    setArticleScrolled(language, event) {
      this.scrolledArticles[language] = event.currentTarget.scrollTop > 8;
    },

    resetArticleScroll(language) {
      this.scrolledArticles[language] = false;
      this.$nextTick(() => {
        const article = this.$refs[language === 'fr' ? 'articleFr' : 'articleEn'];
        if (article) article.scrollTop = 0;
      });
    },

    resetArticleSelection() {
      this.selectedArticleIndex = -1;
      this.selectedArticleLanguage = '';
      this.loadedArticle = null;
      this.collapsedMenus.fr = false;
      this.collapsedMenus.en = false;
      this.resetArticleScroll('fr');
      this.resetArticleScroll('en');
    },

    articleHeading(language) {
      if (!this.hasSelectedArticle(language)) {
        return language === 'fr' ? 'Choisissez un article' : 'Choose an article';
      }

      return this.articles[language][this.selectedArticleIndex].title;
    },

    articleContent(language) {
      if (!this.hasSelectedArticle(language)) return DEFAULT_QUOTES[language];
      return this.loadedArticle?.language === language ? this.loadedArticle.content : '';
    },
  };
}

window.zenApp = zenApp;
