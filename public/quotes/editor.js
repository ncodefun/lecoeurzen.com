import { LitElement, html } from 'https://esm.sh/lit@3.2.1';

export class QuoteEditor extends LitElement {
  static properties = {
    quote: { type: Object },
  };

  createRenderRoot() {
    return this;
  }

  render() {
    if (!this.quote) {
      return html`
        <section class="empty-state" aria-live="polite">
          <div class="empty-state-mark">“</div>
          <h2>No quote selected</h2>
          <p>Create your first quote to give the words you want to keep a home.</p>
          <button type="button" class="primary-button" @click=${this.createQuote}>Create a quote</button>
        </section>
      `;
    }

    return html`
      <section class="editor" aria-label="Quote editor">
        <div class="editor-main">
          <label class="editor-label" for="quote-title">Title <span>optional</span></label>
          <input
            class="title-input"
            id="quote-title"
            type="text"
            placeholder="Give this quote a title"
            .value=${this.quote.title}
            @input=${(event) => this.change('title', event.target.value)}
          />

          <label class="editor-label" for="quote-text">Quote</label>
          <textarea
            id="quote-text"
            placeholder="Write the words you want to remember…"
            .value=${this.quote.text}
            @input=${(event) => this.change('text', event.target.value)}
          ></textarea>
        </div>

        <div class="metadata-panel">
          <div class="metadata-heading">
            <div>
              <p class="eyebrow">Details</p>
              <h2>Metadata</h2>
            </div>
            <button class="delete-button" type="button" @click=${this.deleteQuote}>Delete</button>
          </div>

          <label class="editor-label" for="quote-author">Author</label>
          <input
            id="quote-author"
            type="text"
            placeholder="Who said it?"
            .value=${this.quote.author}
            @input=${(event) => this.change('author', event.target.value)}
          />

          <label class="editor-label" for="quote-tags">Tags</label>
          <input
            id="quote-tags"
            type="text"
            placeholder="wisdom, work, love"
            .value=${this.quote.tags.join(', ')}
            @input=${(event) => this.change('tags', event.target.value)}
          />
          ${this.quote.tags.length ? html`
            <div class="tag-chips" aria-label="Current tags">
              ${this.quote.tags.map((tag) => html`<span>${tag}</span>`)}
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  change(field, value) {
    this.dispatchEvent(new CustomEvent('quote-changed', {
      detail: { id: this.quote.id, field, value },
      bubbles: true,
      composed: true,
    }));
  }

  deleteQuote() {
    this.dispatchEvent(new CustomEvent('quote-deleted', {
      detail: this.quote.id,
      bubbles: true,
      composed: true,
    }));
  }

  createQuote() {
    this.dispatchEvent(new CustomEvent('quote-created', { bubbles: true, composed: true }));
  }
}

customElements.define('quote-editor', QuoteEditor);
