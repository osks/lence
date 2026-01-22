/**
 * Page component - renders Markdoc content with embedded components.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fetchPage, executeQuerySecure, type PageResponse } from '../../api.js';
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
      }

      .source-toggle {
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
        background: none;
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        padding: 0.25rem 0.5rem;
        cursor: pointer;
      }

      .source-toggle:hover {
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

  @state()
  private showSourceEnabled = false;

  @state()
  private viewingSource = false;

  private queryMap: Map<string, QueryDefinition> = new Map();

  /** Current page path for secure query API */
  private pagePath = '';

  /** Maps input name -> array of query names that depend on it */
  private inputDependencies: Map<string, string[]> = new Map();

  /** Unsubscribe function for inputs store */
  private unsubscribeInputs?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeInputs = inputs.onChange((name) => this.handleInputChange(name));
    this.loadPage();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeInputs) {
      this.unsubscribeInputs();
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('path') && this.path) {
      this.loadPage();
    }

    // After render, pass data to components (use requestAnimationFrame to ensure DOM is ready)
    // Also trigger when switching from source view back to rendered view
    const switchedToRendered = changedProperties.has('viewingSource') && !this.viewingSource;
    if (changedProperties.has('queryData') || changedProperties.has('htmlContent') || switchedToRendered) {
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
    inputs.clear();

    try {
      // Fetch page content with frontmatter
      const pageName = pathToPageName(this.path);
      const page = await fetchPage(pageName);

      // Store page path for secure query API (with leading slash)
      this.pagePath = '/' + pageName + '.md';

      // Store raw content and frontmatter settings
      this.rawContent = page.content;
      this.showSourceEnabled = page.frontmatter.showSource === true;

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
        // Use secure API - backend handles interpolation
        const result = await executeQuerySecure(this.pagePath, name, params);
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
    const contentDiv = this.shadowRoot?.querySelector('.content');
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

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading page...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    return html`
      ${this.showSourceEnabled
        ? html`
            <div class="page-header">
              <button class="source-toggle" @click=${this.toggleSource}>
                ${this.viewingSource ? 'Rendered' : 'Source'}
              </button>
            </div>
          `
        : null}
      ${this.renderQueryErrors()}
      ${this.viewingSource
        ? html`<pre class="source-view">${this.rawContent}</pre>`
        : html`
            <article class="content">
              ${unsafeHTML(this.htmlContent)}
            </article>
          `}
    `;
  }
}

customElements.define('lence-page', LencePage);
