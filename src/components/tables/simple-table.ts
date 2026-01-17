/**
 * Simple table component.
 * Displays query results in a basic HTML table with sorting.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { QueryResult, Column } from '../../types.js';

type SortDirection = 'asc' | 'desc' | null;

/**
 * Simple table component for displaying tabular data.
 */
@customElement('lence-table')
export class SimpleTable extends LitElement {
  static styles = css`
    :host {
      display: block;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    th,
    td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--lence-table-border-color, #dee2e6);
    }

    th {
      background: var(--pico-secondary-background, #f8f9fa);
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }

    th:hover {
      background: var(--pico-muted-border-color, #dee2e6);
    }

    th .sort-indicator {
      margin-left: 0.5rem;
      opacity: 0.5;
    }

    th .sort-indicator.active {
      opacity: 1;
    }

    tbody tr:nth-child(even) {
      background: var(--lence-table-stripe-color, #f8f9fa);
    }

    tbody tr:hover {
      background: var(--pico-primary-background, #e3f2fd);
    }

    td.numeric {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      color: var(--pico-muted-color, #6c757d);
    }

    .empty {
      padding: 2rem;
      text-align: center;
      color: var(--pico-muted-color, #6c757d);
    }

    .error {
      padding: 1rem;
      background: var(--pico-del-color, #ffebee);
      color: #c62828;
      border-radius: 0.25rem;
    }
  `;

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
   * Currently sorted column.
   */
  @state()
  private sortColumn: string | null = null;

  /**
   * Sort direction.
   */
  @state()
  private sortDirection: SortDirection = null;

  /**
   * Sorted data rows.
   */
  @state()
  private sortedData: unknown[][] = [];

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('data') && this.data) {
      this.sortedData = [...this.data.data];
      // Reset sort when data changes
      this.sortColumn = null;
      this.sortDirection = null;
    }
  }

  private handleSort(column: Column) {
    const columnIndex = this.data?.columns.indexOf(column);
    if (columnIndex === undefined || columnIndex === -1) return;

    // Toggle sort direction
    if (this.sortColumn === column.name) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = null;
        this.sortColumn = null;
      }
    } else {
      this.sortColumn = column.name;
      this.sortDirection = 'asc';
    }

    // Sort data
    if (this.sortDirection && this.data) {
      const isNumeric = this.isNumericType(column.type);
      const dir = this.sortDirection === 'asc' ? 1 : -1;

      this.sortedData = [...this.data.data].sort((a, b) => {
        const aVal = a[columnIndex];
        const bVal = b[columnIndex];

        if (aVal === null || aVal === undefined) return 1 * dir;
        if (bVal === null || bVal === undefined) return -1 * dir;

        if (isNumeric) {
          return (Number(aVal) - Number(bVal)) * dir;
        }

        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    } else if (this.data) {
      // Reset to original order
      this.sortedData = [...this.data.data];
    }
  }

  private isNumericType(type: string): boolean {
    const numericTypes = [
      'INTEGER',
      'BIGINT',
      'DOUBLE',
      'FLOAT',
      'DECIMAL',
      'NUMERIC',
      'REAL',
    ];
    return numericTypes.some((t) => type.toUpperCase().includes(t));
  }

  private formatCell(value: unknown, type: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (this.isNumericType(type)) {
      const num = Number(value);
      if (Math.abs(num) >= 1000) {
        return num.toLocaleString();
      }
      if (!Number.isInteger(num)) {
        return num.toFixed(2);
      }
      return String(num);
    }

    return String(value);
  }

  private getSortIndicator(column: Column): string {
    if (this.sortColumn !== column.name) {
      return '↕';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  render() {
    if (!this.data) {
      return html`<div class="loading">Loading table...</div>`;
    }

    if (this.data.row_count === 0) {
      return html`<div class="empty">No data available</div>`;
    }

    return html`
      <table>
        <thead>
          <tr>
            ${this.data.columns.map(
              (col) => html`
                <th @click=${() => this.handleSort(col)}>
                  ${col.name}
                  <span
                    class="sort-indicator ${this.sortColumn === col.name
                      ? 'active'
                      : ''}"
                  >
                    ${this.getSortIndicator(col)}
                  </span>
                </th>
              `
            )}
          </tr>
        </thead>
        <tbody>
          ${this.sortedData.map(
            (row) => html`
              <tr>
                ${row.map((cell, i) => {
                  const col = this.data!.columns[i];
                  const isNumeric = this.isNumericType(col.type);
                  return html`
                    <td class=${isNumeric ? 'numeric' : ''}>
                      ${this.formatCell(cell, col.type)}
                    </td>
                  `;
                })}
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-table': SimpleTable;
  }
}
