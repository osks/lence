/**
 * Page component - renders Markdoc content with embedded components.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fetchPage, executeQuery } from '../api.js';
import { pathToPageName } from '../router.js';
import {
  parseMarkdoc,
  extractComponents,
  getReferencedQueries,
  buildQueryMap,
  renderToHtml,
  type QueryDefinition,
  type DataDefinition,
} from '../markdoc/index.js';
import type { QueryResult } from '../types.js';

/**
 * Page component that loads and renders Markdoc content.
 * Handles:
 * - Loading markdown from API
 * - Parsing Markdoc to HTML
 * - Extracting and executing queries
 * - Passing data to embedded components
 */
export class LencePage extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 1200px;
      font-family: var(--lence-font-family, system-ui);
    }

    .loading {
      color: var(--lence-text-muted, #6b7280);
      padding: 2rem;
    }

    .error {
      padding: 1rem;
      background: var(--lence-negative-bg, #fef2f2);
      border: 1px solid var(--lence-negative, #ef4444);
      border-radius: var(--lence-radius, 8px);
      color: var(--lence-negative, #ef4444);
      margin: 1rem 0;
    }

    .content {
      line-height: 1.6;
      color: var(--lence-text, #2c2c2c);
    }

    .content h1 {
      font-size: var(--lence-font-size-2xl, 1.5rem);
      color: var(--lence-text-heading, #060606);
      font-weight: 600;
    }

    .content h1:first-child {
      margin-top: 0;
    }

    .content h2 {
      font-size: var(--lence-font-size-xl, 1.25rem);
      color: var(--lence-text-heading, #060606);
      font-weight: 600;
    }

    .content a {
      color: var(--lence-primary, #1d4ed8);
    }

    .content a:hover {
      color: var(--lence-primary-hover, #1e40af);
    }

    /* Style for component containers */
    .content lence-chart,
    .content lence-table {
      display: block;
      margin: 1.5rem 0;
    }
  `;

  @property({ type: String })
  path = '/';

  @state()
  private htmlContent = '';

  @state()
  private loading = true;

  @state()
  private error: string | null = null;

  @state()
  private queryData: Map<string, QueryResult> = new Map();

  @state()
  private queryErrors: Map<string, string> = new Map();

  private queryMap: Map<string, QueryDefinition> = new Map();

  connectedCallback() {
    super.connectedCallback();
    this.loadPage();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('path') && this.path) {
      this.loadPage();
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

    try {
      // Fetch Markdoc content
      const pageName = pathToPageName(this.path);
      const content = await fetchPage(pageName);

      // Parse Markdoc
      const parsed = parseMarkdoc(content);
      this.htmlContent = renderToHtml(parsed.content);
      this.queryMap = buildQueryMap(parsed.queries);

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
        const result = await executeQuery(query.source, query.sql);
        this.queryData = new Map(this.queryData).set(name, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Query failed';
        this.queryErrors = new Map(this.queryErrors).set(name, message);
      }
    });

    await Promise.all(promises);
  }

  /**
   * After rendering, find components and pass them their data.
   */
  private updateComponentData() {
    // Find all lence components in our shadow DOM
    const contentDiv = this.shadowRoot?.querySelector('.content');
    if (!contentDiv) return;

    // Find chart and table components
    const components = contentDiv.querySelectorAll('lence-chart, lence-table');

    for (const component of components) {
      // Markdoc uses 'data' attribute, but we also check 'query' for backwards compat
      const queryName = component.getAttribute('data') || component.getAttribute('query');
      if (queryName && this.queryData.has(queryName)) {
        // Pass data to component via property
        (component as any).data = this.queryData.get(queryName);
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

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading page...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    return html`
      ${this.renderQueryErrors()}
      <article class="content">
        ${unsafeHTML(this.htmlContent)}
      </article>
    `;
  }
}

customElements.define('lence-page', LencePage);
