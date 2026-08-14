import { LitElement, html } from 'https://esm.sh/lit@3.2.1';

export class QuotesSidebar extends LitElement {
  static properties = {
    quotes: { type: Array },
    selectedId: { type: String },
    search: { type: String },
    hasSearch: { type: Boolean },
  };

  createRenderRoot() {
    return this;
  }

  quoteLabel(quote) {
    return quote.title.trim() || quote.text.trim() || '(empty quote)';
  }

  render() {
    return html`
      <aside class="sidebar" aria-label="Quotes">
        <div class="search-wrap">
          <label class="sr-only" for="quote-search">Search quotes</label>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
          <input
            id="quote-search"
            type="search"
            placeholder="Search your quotes"
            .value=${this.search || ''}
            @input=${this.onSearch}
          />
        </div>

        <div class="quote-list" aria-live="polite">
          ${this.quotes?.length
            ? this.quotes.map((quote) => html`
                <button
                  class="quote-list-item ${quote.id === this.selectedId ? 'is-active' : ''}"
                  type="button"
                  title=${this.quoteLabel(quote)}
                  @click=${() => this.selectQuote(quote.id)}
                >
                  <span>${this.quoteLabel(quote)}</span>
                </button>
              `)
            : html`<p class="list-message">${this.hasSearch ? 'No quotes match your search.' : 'No quotes yet.'}</p>`}
        </div>

        <button class="new-quote-button" type="button" @click=${this.createQuote}>
          <span aria-hidden="true">+</span> New quote
        </button>
      </aside>
    `;
  }

  onSearch(event) {
    this.dispatchEvent(new CustomEvent('search-changed', {
      detail: event.target.value,
      bubbles: true,
      composed: true,
    }));
  }

  selectQuote(id) {
    this.dispatchEvent(new CustomEvent('quote-selected', {
      detail: id,
      bubbles: true,
      composed: true,
    }));
  }

  createQuote() {
    this.dispatchEvent(new CustomEvent('quote-created', { bubbles: true, composed: true }));
  }
}

customElements.define('quotes-sidebar', QuotesSidebar);
