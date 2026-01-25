/**
 * Page component - renders Markdoc content with embedded components.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fetchPage, executeQuery, fetchSettings, type PageResponse } from '../../api.js';
import { inputs } from '../../stores/inputs.js';
import { pathToPageName } from '../../router.js';
import {
  parseMarkdoc,
  extractComponents,
  getReferencedQueries,
  buildQueryMap,
  renderToHtml,
  type QueryDefinition,
  type DataDefinition,
} from '../../markdoc/index.js';
import type { QueryResult } from '../../types.js';
import { themeDefaults } from '../../styles/theme.js';

/**
 * Page component that loads and renders Markdoc content.
 * Handles:
 * - Loading markdown from API
 * - Parsing Markdoc to HTML
 * - Extracting and executing queries
 * - Passing data to embedded components
 */
export class LencePage extends LitElement {
  static styles = [
    themeDefaults,
    css`
      :host {
        display: block;
        position: relative;
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

      .content {
        color: var(--lence-text);
      }

      .content p {
        margin: 1rem 0;
      }

      .content h1 {
        font-size: var(--lence-font-size-xl);
        color: var(--lence-text-heading);
        font-weight: 600;
        margin: 0 0 1rem 0;
      }

      .content h1:first-child {
        margin-top: 0;
      }

      .content h2 {
        font-size: var(--lence-font-size-lg);
        color: var(--lence-text-heading);
        font-weight: 600;
        margin: 1.5rem 0 0.75rem 0;
      }

      .content h3 {
        font-size: var(--lence-font-size-base);
        color: var(--lence-text-heading);
        font-weight: 600;
        margin: 1.25rem 0 0.5rem 0;
      }

      .content a {
        color: var(--lence-primary);
        text-decoration: none;
      }

      .content a:hover {
        text-decoration: underline;
      }

      .content ul,
      .content ol {
        margin: 0.75rem 0;
        padding-left: 1.5rem;
      }

      .content li {
        margin: 0.375rem 0;
      }

      .content pre {
        background: var(--lence-bg-subtle);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        padding: 0.75rem 1rem;
        overflow-x: auto;
        font-size: var(--lence-font-size-xs);
        line-height: 1.5;
      }

      .content code {
        font-family: var(--lence-font-mono);
        font-size: 0.9em;
      }

      .content table {
        border-collapse: collapse;
        margin: 0.75rem 0;
        font-size: var(--lence-font-size-sm);
        width: 100%;
      }

      .content th,
      .content td {
        padding: 0.375rem 0.5rem;
        text-align: left;
        border-bottom: 1px solid var(--lence-border);
      }

      .content th {
        background: var(--lence-bg-subtle);
        font-weight: 500;
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      /* Style for component containers */
      .content lence-chart,
      .content lence-area-chart,
      .content lence-data-table,
      .content lence-gantt {
        display: block;
        margin: 1rem 0;
      }

      .content lence-dropdown,
      .content lence-checkbox {
        display: inline-block;
        margin: 0.5rem 0.5rem 0.5rem 0;
      }

      .page-header {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
        display: flex;
        gap: 0.5rem;
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

      .source-view {
        background: var(--lence-bg-subtle);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        padding: 1rem;
        overflow-x: auto;
        font-family: var(--lence-font-mono);
        font-size: var(--lence-font-size-xs);
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .split-view {
        display: flex;
        gap: 1rem;
        height: calc(100vh - 6rem);
      }

      .split-view .editor-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .split-view .preview-pane {
        flex: 1;
        overflow-y: auto;
        min-width: 0;
      }

      .source-editor {
        flex: 1;
        width: 100%;
        background: var(--lence-bg-subtle);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        padding: 1rem;
        font-family: var(--lence-font-mono);
        font-size: var(--lence-font-size-xs);
        line-height: 1.5;
        resize: none;
        box-sizing: border-box;
      }

      .source-editor:focus {
        outline: none;
        border-color: var(--lence-primary);
      }
    `,
  ];

  @property({ type: String })
  path = '/';

  @state()
  private htmlContent = '';

  @state()
  private rawContent = '';

  @state()
  private loading = true;

  @state()
  private error: string | null = null;

  @state()
  private queryData: Map<string, QueryResult> = new Map();

  @state()
  private queryErrors: Map<string, string> = new Map();

  /** Whether source view is enabled (from frontmatter) */
  @state()
  private showSourceEnabled = false;

  /** Whether we're viewing source (read-only) */
  @state()
  private viewingSource = false;

  /** Whether edit mode is enabled (from server settings) */
  @state()
  private editMode = false;

  /** Whether we're currently editing (split view active) */
  @state()
  private editing = false;

  private queryMap: Map<string, QueryDefinition> = new Map();

  /** Current page path for secure query API */
  private pagePath = '';

  /** Maps input name -> array of query names that depend on it */
  private inputDependencies: Map<string, string[]> = new Map();

  /** Unsubscribe function for inputs store */
  private unsubscribeInputs?: () => void;

  /** Debounce timer for edit updates */
  private editDebounceTimer?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeInputs = inputs.onChange((name) => this.handleInputChange(name));
    this.loadSettings();
    this.loadPage();
  }

  private async loadSettings() {
    try {
      const settings = await fetchSettings();
      this.showSourceEnabled = settings.showSource;
      this.editMode = settings.editMode;
    } catch {
      // Ignore settings errors
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeInputs) {
      this.unsubscribeInputs();
    }
    if (this.editDebounceTimer) {
      clearTimeout(this.editDebounceTimer);
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('path') && this.path) {
      this.loadPage();
    }

    // Dispatch event when editing state changes
    if (changedProperties.has('editing')) {
      this.dispatchEvent(new CustomEvent('lence-editing-change', {
        detail: { editing: this.editing },
        bubbles: true,
        composed: true,
      }));
    }

    // After render, pass data to components (use requestAnimationFrame to ensure DOM is ready)
    if (changedProperties.has('queryData') || changedProperties.has('htmlContent')) {
      requestAnimationFrame(() => this.updateComponentData());
    }
  }

  private async loadPage() {
    this.loading = true;
    this.error = null;
    this.queryData = new Map();
    this.queryErrors = new Map();
    this.inputDependencies = new Map();
    this.viewingSource = false;
    this.editing = false;
    inputs.clear();

    try {
      // Fetch page content with frontmatter
      const pageName = pathToPageName(this.path);
      const page = await fetchPage(pageName);

      // Store page path for secure query API (with leading slash)
      this.pagePath = '/' + pageName + '.md';

      // Store raw content and update title from frontmatter
      this.rawContent = page.content;
      this.updateDocumentTitle(page.frontmatter.title);

      // Parse Markdoc
      const parsed = parseMarkdoc(page.content);
      this.htmlContent = renderToHtml(parsed.content);
      this.queryMap = buildQueryMap(parsed.queries);

      // Build input dependency map from queries
      this.buildInputDependencies();

      // Process inline data definitions first
      this.processInlineData(parsed.data);

      // Extract components and their query references
      const components = extractComponents(parsed.content);
      const queryNames = getReferencedQueries(components);

      // Execute queries for data not provided inline
      const queriesToExecute = queryNames.filter(name => !this.queryData.has(name));
      await this.executeQueries(queriesToExecute);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load page';
      this.htmlContent = '';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Build a map of input name -> dependent query names by parsing SQL.
   */
  private buildInputDependencies() {
    const inputPattern = /\$\{inputs\.(\w+)\.value\}/g;

    for (const [queryName, query] of this.queryMap) {
      let match;
      while ((match = inputPattern.exec(query.sql)) !== null) {
        const inputName = match[1];
        const deps = this.inputDependencies.get(inputName) || [];
        if (!deps.includes(queryName)) {
          deps.push(queryName);
        }
        this.inputDependencies.set(inputName, deps);
      }
    }
  }

  /**
   * Handle input value changes by re-executing dependent queries.
   */
  private async handleInputChange(inputName: string) {
    const dependentQueries = this.inputDependencies.get(inputName);
    if (!dependentQueries || dependentQueries.length === 0) return;

    // Clear errors for dependent queries
    for (const name of dependentQueries) {
      this.queryErrors.delete(name);
    }

    // Re-execute dependent queries
    await this.executeQueries(dependentQueries);
  }

  /**
   * Process inline data definitions and add to queryData.
   */
  private processInlineData(dataDefinitions: DataDefinition[]) {
    for (const def of dataDefinitions) {
      try {
        const parsed = JSON.parse(def.json);
        // Ensure row_count is set
        const result: QueryResult = {
          columns: parsed.columns || [],
          data: parsed.data || [],
          row_count: parsed.row_count ?? parsed.data?.length ?? 0,
        };
        this.queryData = new Map(this.queryData).set(def.name, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid JSON';
        this.queryErrors = new Map(this.queryErrors).set(def.name, `Data "${def.name}": ${message}`);
      }
    }
  }

  private async executeQueries(queryNames: string[]) {
    // Execute queries in parallel
    const promises = queryNames.map(async (name) => {
      const query = this.queryMap.get(name);
      if (!query) {
        this.queryErrors.set(name, `Query not defined: ${name}`);
        return;
      }

      try {
        // Collect params from inputs
        const params = this.collectQueryParams(query);
        // Send all query info - backend decides what to use based on mode
        const result = await executeQuery(
          this.pagePath,
          name,
          params,
          query.source,
          query.sql,
        );
        this.queryData = new Map(this.queryData).set(name, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Query failed';
        this.queryErrors = new Map(this.queryErrors).set(name, message);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Collect parameter values from inputs for a query.
   * Extracts values for all ${inputs.X.value} references in the query SQL.
   */
  private collectQueryParams(query: QueryDefinition): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const inputPattern = /\$\{inputs\.(\w+)\.value\}/g;
    let match;
    while ((match = inputPattern.exec(query.sql)) !== null) {
      const inputName = match[1];
      if (!(inputName in params)) {
        const input = inputs.get(inputName);
        params[inputName] = input.value ?? '';
      }
    }
    return params;
  }

  /**
   * After rendering, find components and pass them their data.
   */
  private updateComponentData() {
    // Find all lence components in our shadow DOM
    // When editing, look in the preview pane; otherwise in the content div
    const contentDiv = this.shadowRoot?.querySelector('.preview-pane .content, .content');
    if (!contentDiv) return;

    // Find chart, table, and gantt components
    const dataComponents = contentDiv.querySelectorAll('lence-chart, lence-area-chart, lence-data-table, lence-gantt');

    for (const component of dataComponents) {
      // Markdoc uses 'data' attribute, but we also check 'query' for backwards compat
      const queryName = component.getAttribute('data') || component.getAttribute('query');
      if (queryName && this.queryData.has(queryName)) {
        // Pass data to component via property
        (component as any).data = this.queryData.get(queryName);
      }
    }

    // Find dropdown components and pass their data
    const dropdowns = contentDiv.querySelectorAll('lence-dropdown');
    for (const dropdown of dropdowns) {
      const dataAttr = dropdown.getAttribute('data');
      if (dataAttr && this.queryData.has(dataAttr)) {
        (dropdown as any).queryData = this.queryData.get(dataAttr);
      }
    }
  }

  private renderQueryErrors() {
    if (this.queryErrors.size === 0) return null;

    return html`
      ${Array.from(this.queryErrors.entries()).map(
        ([name, error]) => html`
          <div class="error">Query "${name}" failed: ${error}</div>
        `
      )}
    `;
  }

  private toggleSource() {
    this.viewingSource = !this.viewingSource;
  }

  private toggleEditing() {
    this.editing = !this.editing;
  }

  private updateDocumentTitle(title?: string) {
    document.title = title || 'Lence';
  }

  /**
   * Handle edits to the source markdown.
   * Debounces to avoid re-parsing on every keystroke.
   */
  private handleSourceEdit(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.rawContent = textarea.value;

    // Debounce re-parsing
    if (this.editDebounceTimer) {
      clearTimeout(this.editDebounceTimer);
    }
    this.editDebounceTimer = setTimeout(() => {
      this.reprocessContent();
    }, 300);
  }

  /**
   * Re-parse the current rawContent and re-execute queries.
   */
  private async reprocessContent() {
    try {
      // Re-parse the markdown (includes frontmatter parsing)
      const parsed = parseMarkdoc(this.rawContent);
      this.htmlContent = renderToHtml(parsed.content);
      this.queryMap = buildQueryMap(parsed.queries);

      // Update document title from frontmatter
      this.updateDocumentTitle(parsed.frontmatter.title as string | undefined);

      // Rebuild input dependencies
      this.inputDependencies = new Map();
      this.buildInputDependencies();

      // Process inline data
      this.queryData = new Map();
      this.queryErrors = new Map();
      this.processInlineData(parsed.data);

      // Extract and execute queries
      const components = extractComponents(parsed.content);
      const queryNames = getReferencedQueries(components);
      const queriesToExecute = queryNames.filter(name => !this.queryData.has(name));
      await this.executeQueries(queriesToExecute);
    } catch (err) {
      // Don't show parse errors as page errors - just log them
      console.error('Parse error:', err);
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading page...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    // Split view when editing
    if (this.editing) {
      return html`
        <div class="page-header">
          <button class="header-button" @click=${this.toggleEditing}>Done</button>
        </div>
        ${this.renderQueryErrors()}
        <div class="split-view">
          <div class="editor-pane">
            <textarea
              class="source-editor"
              .value=${this.rawContent}
              @input=${this.handleSourceEdit}
            ></textarea>
          </div>
          <div class="preview-pane">
            <article class="content">
              ${unsafeHTML(this.htmlContent)}
            </article>
          </div>
        </div>
      `;
    }

    // Viewing source - show X to close
    if (this.viewingSource) {
      return html`
        <div class="page-header">
          <button class="header-button" @click=${this.toggleSource}>✕</button>
        </div>
        ${this.renderQueryErrors()}
        <pre class="source-view">${this.rawContent}</pre>
      `;
    }

    // Normal view
    const showHeader = this.showSourceEnabled || this.editMode;
    return html`
      ${showHeader
        ? html`
            <div class="page-header">
              ${this.showSourceEnabled
                ? html`<button class="header-button" @click=${this.toggleSource}>Source</button>`
                : null}
              ${this.editMode
                ? html`<button class="header-button" @click=${this.toggleEditing}>Edit</button>`
                : null}
            </div>
          `
        : null}
      ${this.renderQueryErrors()}
      <article class="content">${unsafeHTML(this.htmlContent)}</article>
    `;
  }
}

customElements.define('lence-page', LencePage);
