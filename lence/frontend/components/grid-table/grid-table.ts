/**
 * Grid.js table component.
 * Full-featured table with search, pagination, and sorting powered by Grid.js.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Grid } from 'gridjs';
import 'gridjs/dist/theme/mermaid.css';
import type { QueryResult } from '../../types.js';

/**
 * Grid.js table component for displaying tabular data with search, pagination, and sorting.
 */
@customElement('lence-grid-table')
export class GridTable extends LitElement {
  // Disable shadow DOM so Grid.js styles work correctly
  protected createRenderRoot() {
    return this;
  }

  /**
   * Query name for this table.
   */
  @property({ type: String })
  query = '';

  /**
   * Query result data.
   */
  @property({ attribute: false })
  data?: QueryResult;

  /**
   * Enable search functionality.
   */
  @property({ type: Boolean })
  search = false;

  /**
   * Rows per page. Set to enable pagination.
   */
  @property({ type: Number })
  pagination?: number;

  /**
   * Enable column sorting (default: true).
   */
  @property({ type: Boolean })
  sort = true;

  /**
   * Grid.js instance.
   */
  @state()
  private grid?: Grid;

  /**
   * Container element for Grid.js.
   */
  private container?: HTMLDivElement;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.grid?.destroy();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('data') && this.data) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => this.renderGrid());
    }
  }

  private renderGrid() {
    if (!this.data) return;

    // Destroy existing grid if present
    if (this.grid) {
      this.grid.destroy();
      this.grid = undefined;
    }

    // Get container (should exist after render)
    this.container = this.querySelector('.grid-container') as HTMLDivElement;

    if (!this.container) {
      console.warn('Grid container not found');
      return;
    }

    // Build Grid.js config
    const config: Record<string, unknown> = {
      columns: this.data.columns.map((col) => col.name),
      data: this.data.data,
      sort: this.sort,
      className: {
        table: 'lence-grid-table',
        thead: 'lence-grid-thead',
        tbody: 'lence-grid-tbody',
        th: 'lence-grid-th',
        td: 'lence-grid-td',
      },
    };

    if (this.search) {
      config.search = {
        enabled: true,
        server: undefined,  // ensure client-side search
      };
    }

    if (this.pagination !== undefined && this.pagination > 0) {
      config.pagination = {
        limit: this.pagination,
      };
    }

    // Create and render Grid.js
    console.log('Grid.js config:', config);
    this.grid = new Grid(config);
    this.grid.render(this.container);
    console.log('Grid.js rendered');
  }

  render() {
    if (!this.data) {
      return html`<div class="lence-grid-loading">Loading table...</div>`;
    }

    if (this.data.row_count === 0) {
      return html`<div class="lence-grid-empty">No data available</div>`;
    }

    return html`<div class="grid-container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-grid-table': GridTable;
  }
}
