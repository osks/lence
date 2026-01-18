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
      font-family: var(--lence-font-family, system-ui);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--lence-font-size-sm, 0.875rem);
    }

    th,
    td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--lence-border, #e5e7eb);
    }

    th {
      background: var(--lence-bg-subtle, #f9fafb);
      font-weight: 600;
      font-size: var(--lence-font-size-xs, 0.75rem);
      color: var(--lence-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }

    th:hover {
      background: var(--lence-bg-muted, #f3f4f6);
    }

    th .sort-indicator {
      margin-left: 0.5rem;
      opacity: 0.4;
    }

    th .sort-indicator.active {
      opacity: 1;
      color: var(--lence-primary, #1d4ed8);
    }

    tbody tr:hover {
      background: var(--lence-bg-subtle, #f9fafb);
    }

    td {
      color: var(--lence-text, #2c2c2c);
    }

    td.numeric {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-family: var(--lence-font-mono, monospace);
    }

    .loading {
      padding: 2rem;
      text-align: center;
      color: var(--lence-text-muted, #6b7280);
    }

    .empty {
      padding: 2rem;
      text-align: center;
      color: var(--lence-text-muted, #6b7280);
    }

    .error {
      padding: 1rem;
      background: var(--lence-negative-bg, #fef2f2);
      color: var(--lence-negative, #ef4444);
      border: 1px solid var(--lence-negative, #ef4444);
      border-radius: var(--lence-radius, 8px);
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
