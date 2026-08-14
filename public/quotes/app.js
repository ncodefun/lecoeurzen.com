import { LitElement, html } from 'https://esm.sh/lit@3.2.1';
import { quotesDb } from './db.js';
import './sidebar.js';
import './editor.js';

const DEBOUNCE_MS = 500;

function makeId() {
  return crypto.randomUUID();
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(rawTags.map((tag) => String(tag).trim()).filter(Boolean))];
}

function sortQuotes(quotes) {
  return [...quotes].sort((a, b) => b.updatedAt - a.updatedAt);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read the selected file.'));
    reader.readAsText(file);
  });
}

export class QuotesApp extends LitElement {
  static properties = {
    quotes: { type: Array },
    selectedId: { type: String },
    search: { type: String },
    error: { type: String },
    loading: { type: Boolean },
  };

  constructor() {
    super();
    this.quotes = [];
    this.selectedId = '';
    this.search = '';
    this.error = '';
    this.loading = true;
    this.saveTimers = new Map();
    this.dirtyIds = new Set();
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      this.quotes = sortQuotes(await quotesDb.getAll());
    } catch (error) {
      this.error = 'Your quotes could not be loaded from this browser.';
      console.error(error);
    } finally {
      this.loading = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const timer of this.saveTimers.values()) clearTimeout(timer);
  }

  get selectedQuote() {
    return this.quotes.find((quote) => quote.id === this.selectedId) || null;
  }

  get filteredQuotes() {
    const query = this.search.trim().toLocaleLowerCase();
    if (!query) return this.quotes;
    return this.quotes.filter((quote) => [quote.title, quote.text, quote.author, ...quote.tags]
      .some((value) => String(value).toLocaleLowerCase().includes(query)));
  }

  render() {
    return html`
      <main class="app-shell">
        <header class="topbar">
          <a class="brand" href="./" aria-label="Quotes home">Quotes</a>
          <div class="topbar-actions">
            <button class="quiet-button" type="button" @click=${this.exportQuotes}>Export</button>
            <button class="quiet-button" type="button" @click=${this.openImport}>Import</button>
            <input class="file-input" type="file" accept="application/json,.json" @change=${this.importQuotes} />
          </div>
        </header>

        ${this.error ? html`<p class="notice" role="alert">${this.error}</p>` : ''}

        <div class="workspace ${this.loading ? 'is-loading' : ''}">
          <quotes-sidebar
            .quotes=${this.filteredQuotes}
            .selectedId=${this.selectedId}
            .search=${this.search}
            .hasSearch=${Boolean(this.search.trim())}
            @search-changed=${this.setSearch}
            @quote-selected=${this.selectQuote}
            @quote-created=${this.createQuote}
          ></quotes-sidebar>

          <quote-editor
            .quote=${this.selectedQuote}
            @quote-changed=${this.updateQuote}
            @quote-deleted=${this.deleteQuote}
            @quote-created=${this.createQuote}
          ></quote-editor>
        </div>
      </main>
    `;
  }

  setSearch(event) {
    this.search = event.detail;
  }

  selectQuote(event) {
    this.selectedId = event.detail;
  }

  async createQuote() {
    const now = Date.now();
    const quote = { id: makeId(), title: '', text: '', author: '', tags: [], createdAt: now, updatedAt: now };
    this.quotes = [quote, ...this.quotes];
    this.selectedId = quote.id;
    this.error = '';
    try {
      await quotesDb.put(quote);
    } catch (error) {
      this.error = 'This quote could not be saved.';
      console.error(error);
    }
  }

  updateQuote(event) {
    const { id, field, value } = event.detail;
    const quote = this.quotes.find((item) => item.id === id);
    if (!quote) return;

    const nextQuote = {
      ...quote,
      [field]: field === 'tags' ? normalizeTags(value) : value,
      updatedAt: Date.now(),
    };
    this.quotes = sortQuotes(this.quotes.map((item) => item.id === id ? nextQuote : item));
    this.dirtyIds.add(id);
    this.queueSave(id);
  }

  queueSave(id) {
    clearTimeout(this.saveTimers.get(id));
    this.saveTimers.set(id, setTimeout(() => this.saveQuote(id), DEBOUNCE_MS));
  }

  async saveQuote(id) {
    clearTimeout(this.saveTimers.get(id));
    this.saveTimers.delete(id);
    const quote = this.quotes.find((item) => item.id === id);
    if (!quote || !this.dirtyIds.has(id)) return;
    this.dirtyIds.delete(id);
    try {
      await quotesDb.put(quote);
    } catch (error) {
      this.dirtyIds.add(id);
      this.error = 'Changes could not be saved. Please try again.';
      console.error(error);
    }
  }

  async flushSaves() {
    const ids = [...this.dirtyIds];
    for (const id of ids) {
      clearTimeout(this.saveTimers.get(id));
      this.saveTimers.delete(id);
    }
    await Promise.all(ids.map((id) => this.saveQuote(id)));
  }

  async deleteQuote(event) {
    const id = event.detail;
    const quote = this.quotes.find((item) => item.id === id);
    if (!quote || !confirm('Delete this quote? This cannot be undone.')) return;

    clearTimeout(this.saveTimers.get(id));
    this.saveTimers.delete(id);
    this.dirtyIds.delete(id);
    try {
      await quotesDb.delete(id);
      const remaining = this.quotes.filter((item) => item.id !== id);
      this.quotes = remaining;
      this.selectedId = remaining[0]?.id || '';
      this.error = '';
    } catch (error) {
      this.error = 'This quote could not be deleted.';
      console.error(error);
    }
  }

  openImport() {
    this.renderRoot.querySelector('.file-input').click();
  }

  async exportQuotes() {
    try {
      await this.flushSaves();
      const quotes = await quotesDb.getAll();
      const blob = new Blob([JSON.stringify(quotes)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `quotes-backup-${date}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.error = '';
    } catch (error) {
      this.error = 'Your quotes could not be exported.';
      console.error(error);
    }
  }

  async importQuotes(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let imported;
    try {
      imported = JSON.parse(await readFileAsText(file));
    } catch (error) {
      this.error = 'That file is not valid JSON. Your existing quotes were not changed.';
      return;
    }

    if (!Array.isArray(imported)) {
      this.error = 'A backup must contain an array of quotes. Your existing quotes were not changed.';
      return;
    }

    const validById = new Map();
    for (const item of imported) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || typeof item.text !== 'string') continue;
      const now = Date.now();
      validById.set(item.id, {
        id: item.id,
        title: typeof item.title === 'string' ? item.title : '',
        text: item.text,
        author: typeof item.author === 'string' ? item.author : '',
        tags: normalizeTags(item.tags),
        createdAt: Number.isFinite(item.createdAt) ? item.createdAt : now,
        updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : now,
      });
    }
    const valid = [...validById.values()];
    if (!valid.length) {
      this.error = 'No valid quotes were found in that file. Your existing quotes were not changed.';
      return;
    }
    if (!confirm(`Replace all ${this.quotes.length} current quote${this.quotes.length === 1 ? '' : 's'} with ${valid.length} imported quote${valid.length === 1 ? '' : 's'}?`)) return;

    try {
      for (const timer of this.saveTimers.values()) clearTimeout(timer);
      this.saveTimers.clear();
      this.dirtyIds.clear();
      await quotesDb.replaceAll(valid);
      this.quotes = sortQuotes(valid);
      this.selectedId = this.quotes[0]?.id || '';
      this.search = '';
      const skipped = imported.length - valid.length;
      this.error = skipped ? `${skipped} malformed or duplicate entr${skipped === 1 ? 'y was' : 'ies were'} skipped during import.` : '';
    } catch (error) {
      this.error = 'The import could not be saved. Your current view has not been changed.';
      console.error(error);
    }
  }
}

customElements.define('quotes-app', QuotesApp);
