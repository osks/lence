/**
 * Query editor component for editing SQL query files.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fetchQuery, saveQuery } from '../../api.js';
import { getRouter } from '../../router.js';
import { themeDefaults } from '../../styles/theme.js';

/**
 * Query editor component for viewing and editing SQL query files.
 */
export class LenceQueryEditor extends LitElement {
  static styles = [
    themeDefaults,
    css`
      :host {
        display: block;
        font-family: var(--lence-font-family);
        font-size: var(--lence-font-size-sm);
        line-height: 1.6;
      }

      .loading {
        color: var(--lence-text-muted);
        padding: 1.5rem;
      }

      .error {
        padding: 0.75rem;
        background: var(--lence-negative-bg);
        border: 1px solid var(--lence-negative);
        border-radius: var(--lence-radius);
        color: var(--lence-negative);
        margin: 0.75rem 0;
      }

      .toolbar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .header-button {
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
        background: none;
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        padding: 0.25rem 0.5rem;
        cursor: pointer;
      }

      .header-button:hover {
        background: var(--lence-bg-subtle);
        color: var(--lence-text);
      }

      .header-button:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .header-button:disabled:hover {
        background: none;
        color: var(--lence-text-muted);
      }

      .save-button:not(:disabled) {
        color: var(--lence-primary);
        border-color: var(--lence-primary);
      }

      .editor-container {
        height: calc(100vh - 6rem);
        width: calc(50% - 0.5rem);
        display: flex;
        flex-direction: column;
      }

      .source-editor {
        flex: 1;
        width: 100%;
        background: #fafafa;
        border: 1px solid var(--lence-border-strong, var(--lence-border));
        border-radius: var(--lence-radius);
        padding: 1rem;
        font-family: var(--lence-font-mono);
        font-size: var(--lence-font-size-xs);
        line-height: 1.5;
        resize: none;
        box-sizing: border-box;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
      }

      .source-editor:focus {
        outline: none;
        border-color: var(--lence-primary);
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06), 0 0 0 2px var(--lence-primary-bg);
      }

    `,
  ];

  @property({ type: String })
  path = '';

  @state()
  private content = '';

  @state()
  private loading = true;

  @state()
  private error: string | null = null;

  @state()
  private editMode = false;

  @state()
  private isDirty = false;

  @state()
  private saving = false;

  private originalContent = '';
  private boundKeyDown = this.handleKeyDown.bind(this);
  private boundBeforeUnload = this.handleBeforeUnload.bind(this);
  private clearNavigationGuard?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.loadQuery();
    document.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('beforeunload', this.boundBeforeUnload);
    if (this.clearNavigationGuard) {
      this.clearNavigationGuard();
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('path') && this.path) {
      this.loadQuery();
    }

    // Manage beforeunload and navigation guard based on dirty state
    if (changedProperties.has('isDirty')) {
      if (this.isDirty) {
        window.addEventListener('beforeunload', this.boundBeforeUnload);
        this.clearNavigationGuard = getRouter().setNavigationGuard(() => {
          return confirm('You have unsaved changes. Are you sure you want to leave?');
        });
      } else {
        window.removeEventListener('beforeunload', this.boundBeforeUnload);
        if (this.clearNavigationGuard) {
          this.clearNavigationGuard();
          this.clearNavigationGuard = undefined;
        }
      }
    }
  }

  private handleBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  }

  private async loadQuery() {
    this.loading = true;
    this.error = null;
    this.isDirty = false;

    try {
      // Fetch settings to check edit mode
      const settingsResponse = await fetch('/_api/v1/pages/settings');
      const settings = await settingsResponse.json();

      // Query editor only accessible in edit mode
      if (!settings.editMode) {
        getRouter().navigate('/');
        return;
      }

      this.editMode = settings.editMode;

      // Fetch query content
      const response = await fetchQuery(this.path);
      this.content = response.content;
      this.originalContent = response.content;

      // Update document title
      document.title = `${this.path}.sql - Lence`;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load query';
      this.content = '';
    } finally {
      this.loading = false;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      if (this.editMode && this.isDirty) {
        e.preventDefault();
        this.handleSave();
      }
    }
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.content = textarea.value;
    this.isDirty = this.content !== this.originalContent;
  }

  private async handleSave() {
    if (this.saving || !this.isDirty) return;

    this.saving = true;
    try {
      await saveQuery(this.path, this.content);
      this.originalContent = this.content;
      this.isDirty = false;
    } catch (err) {
      console.error('Save failed:', err);
      this.error = err instanceof Error ? err.message : 'Failed to save query';
    } finally {
      this.saving = false;
    }
  }

  private handleClose() {
    if (this.isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    getRouter().navigate('/');
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading query...</div>`;
    }

    if (this.error && !this.content) {
      return html`<div class="error">${this.error}</div>`;
    }

    return html`
      <div class="toolbar">
        ${this.editMode
          ? html`
              <button
                class="header-button save-button"
                @click=${this.handleSave}
                ?disabled=${!this.isDirty || this.saving}
              >
                ${this.saving ? 'Saving...' : this.isDirty ? 'Save' : 'Saved'}
              </button>
            `
          : null}
        <button class="header-button" @click=${this.handleClose}>Close</button>
      </div>
      ${this.error ? html`<div class="error">${this.error}</div>` : null}
      <div class="editor-container">
        <textarea
          class="source-editor"
          .value=${this.content}
          @input=${this.handleInput}
        ></textarea>
      </div>
    `;
  }
}

customElements.define('lence-query-editor', LenceQueryEditor);
