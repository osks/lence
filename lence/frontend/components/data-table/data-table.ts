/**
 * Data Table component.
 * Full-featured table with search, pagination, and sorting powered by TanStack Table.
 * Works correctly in shadow DOM unlike Grid.js.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  TableController,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/lit-table';
import { booleanConverter, type QueryResult } from '../../types.js';
import { themeDefaults } from '../../styles/theme.js';

// Row type is a record with column names as keys
type RowData = Record<string, unknown>;

/**
 * Data Table component for displaying tabular data with search, pagination, and sorting.
 */
@customElement('lence-data-table')
export class DataTable extends LitElement {
  static styles = [
    themeDefaults,
    css`
      :host {
        display: block;
        font-family: var(--lence-font-family);
        font-size: var(--lence-font-size-sm);
      }

      .table-container {
        overflow-x: auto;
      }

      .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .search-input {
        padding: 0.375rem 0.625rem;
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        font-size: var(--lence-font-size-sm);
        min-width: 200px;
        background: var(--lence-bg);
        color: var(--lence-text);
      }

      .search-input:focus {
        outline: none;
        border-color: var(--lence-primary);
        box-shadow: 0 0 0 2px var(--lence-primary-bg);
      }

      .search-input::placeholder {
        color: var(--lence-text-muted);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 0.375rem 0.5rem;
        text-align: left;
        border-bottom: 1px solid var(--lence-border);
      }

      th {
        background: var(--lence-bg-subtle);
        font-weight: 500;
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
      }

      th.sortable {
        cursor: pointer;
        user-select: none;
      }

      th.sortable:hover {
        background: var(--lence-bg-muted);
      }

      th .sort-indicator {
        display: inline-flex;
        flex-direction: column;
        margin-left: 0.25rem;
        vertical-align: middle;
        gap: 1px;
      }

      th .sort-indicator svg {
        width: 8px;
        height: 6px;
        fill: var(--lence-text-muted);
        opacity: 0.5;
      }

      th .sort-indicator svg.active {
        fill: var(--lence-primary);
        opacity: 1;
      }

      tbody tr:hover {
        background: var(--lence-bg-subtle);
      }

      td {
        color: var(--lence-text);
      }

      td.numeric {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-family: var(--lence-font-mono);
      }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.75rem;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .pagination-info {
        color: var(--lence-text-muted);
        font-size: var(--lence-font-size-xs);
      }

      .pagination-buttons {
        display: flex;
        gap: 0.25rem;
      }

      .pagination-btn {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        background: var(--lence-bg);
        color: var(--lence-text);
        font-size: var(--lence-font-size-xs);
        cursor: pointer;
        min-width: 2rem;
      }

      .pagination-btn:hover:not(:disabled) {
        background: var(--lence-bg-subtle);
        border-color: var(--lence-border-strong);
      }

      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pagination-btn.active {
        background: var(--lence-primary);
        color: white;
        border-color: var(--lence-primary);
      }

      .page-size-select {
        padding: 0.25rem 0.375rem;
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        font-size: var(--lence-font-size-xs);
        background: var(--lence-bg);
        color: var(--lence-text);
      }

      .loading,
      .empty {
        padding: 1.5rem;
        text-align: center;
        color: var(--lence-text-muted);
        font-size: var(--lence-font-size-sm);
      }
    `,
  ];

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
  @property({ converter: booleanConverter })
  search = false;

  /**
   * Rows per page. Set to enable pagination.
   */
  @property({ type: Number })
  pagination?: number;

  /**
   * Enable column sorting (default: true).
   */
  @property({ converter: booleanConverter })
  sort = true;

  /**
   * Current sorting state.
   */
  @state()
  private sorting: SortingState = [];

  /**
   * Global filter (search) value.
   */
  @state()
  private globalFilter = '';

  /**
   * Current pagination state.
   */
  @state()
  private paginationState: PaginationState = {
    pageIndex: 0,
    pageSize: 10,
  };

  /**
   * TanStack Table controller.
   */
  private tableController = new TableController<RowData>(this);

  /**
   * Cached row model functions (must be stable across renders).
   */
  private coreRowModel = getCoreRowModel<RowData>();
  private sortedRowModel = getSortedRowModel<RowData>();
  private filteredRowModel = getFilteredRowModel<RowData>();
  private paginationRowModel = getPaginationRowModel<RowData>();

  /**
   * Cached data and columns (updated when data prop changes).
   */
  private cachedRowData: RowData[] = [];
  private cachedColumns: ColumnDef<RowData>[] = [];

  /**
   * Update cached data when data prop changes.
   */
  private updateCachedData() {
    if (!this.data) {
      this.cachedRowData = [];
      this.cachedColumns = [];
      return;
    }

    // Convert to row objects
    this.cachedRowData = this.data.data.map((row) => {
      const obj: RowData = {};
      this.data!.columns.forEach((col, i) => {
        obj[col.name] = row[i];
      });
      return obj;
    });

    // Generate column definitions
    this.cachedColumns = this.data.columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: (info: { getValue: () => unknown }) => this.formatCell(info.getValue(), col.type),
      meta: {
        type: col.type,
        isNumeric: this.isNumericType(col.type),
      },
    }));
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

  private handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.globalFilter = input.value;
    // Reset to first page when searching
    this.paginationState = { ...this.paginationState, pageIndex: 0 };
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    // Update page size when pagination prop changes
    if (changedProperties.has('pagination') && this.pagination !== undefined) {
      this.paginationState = {
        ...this.paginationState,
        pageSize: this.pagination,
        pageIndex: 0,
      };
    }
    // Reset state and update cached data when data changes
    if (changedProperties.has('data')) {
      this.sorting = [];
      this.globalFilter = '';
      this.paginationState = {
        pageIndex: 0,
        pageSize: this.pagination || 10,
      };
      this.updateCachedData();
    }
  }

  render() {
    if (!this.data) {
      return html`<div class="loading">Loading table...</div>`;
    }

    if (this.data.row_count === 0) {
      return html`<div class="empty">No data available</div>`;
    }

    const table = this.tableController.table({
      data: this.cachedRowData,
      columns: this.cachedColumns,
      state: {
        sorting: this.sorting,
        globalFilter: this.globalFilter,
        pagination: this.paginationState,
      },
      onSortingChange: (updater) => {
        this.sorting = typeof updater === 'function' ? updater(this.sorting) : updater;
      },
      onGlobalFilterChange: (updater) => {
        this.globalFilter = typeof updater === 'function' ? updater(this.globalFilter) : updater;
      },
      onPaginationChange: (updater) => {
        this.paginationState = typeof updater === 'function' ? updater(this.paginationState) : updater;
      },
      getCoreRowModel: this.coreRowModel,
      getSortedRowModel: this.sort ? this.sortedRowModel : undefined,
      getFilteredRowModel: this.search ? this.filteredRowModel : undefined,
      getPaginationRowModel: this.pagination ? this.paginationRowModel : undefined,
      enableSorting: this.sort,
      enableGlobalFilter: this.search,
    });

    const showPagination = this.pagination !== undefined && this.pagination > 0;

    return html`
      ${this.search
        ? html`
            <div class="controls">
              <input
                type="text"
                class="search-input"
                placeholder="Search..."
                .value=${this.globalFilter}
                @input=${this.handleSearchInput}
              />
            </div>
          `
        : nothing}

      <div class="table-container">
        <table>
          <thead>
            ${table.getHeaderGroups().map(
              (headerGroup) => html`
                <tr>
                  ${headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    const meta = header.column.columnDef.meta as { isNumeric?: boolean } | undefined;
                    return html`
                      <th
                        class=${canSort ? 'sortable' : ''}
                        @click=${canSort ? () => header.column.toggleSorting() : nothing}
                      >
                        ${flexRender(header.column.columnDef.header, header.getContext())}
                        ${this.sort
                          ? html`
                              <span class="sort-indicator">
                                <svg viewBox="0 0 8 6" class=${sortDir === 'asc' ? 'active' : ''}>
                                  <path d="M4 0L8 6H0L4 0Z"/>
                                </svg>
                                <svg viewBox="0 0 8 6" class=${sortDir === 'desc' ? 'active' : ''}>
                                  <path d="M4 6L0 0H8L4 6Z"/>
                                </svg>
                              </span>
                            `
                          : nothing}
                      </th>
                    `;
                  })}
                </tr>
              `
            )}
          </thead>
          <tbody>
            ${table.getRowModel().rows.map(
              (row) => html`
                <tr>
                  ${row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { isNumeric?: boolean } | undefined;
                    return html`
                      <td class=${meta?.isNumeric ? 'numeric' : ''}>
                        ${flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    `;
                  })}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>

      ${showPagination ? this.renderPagination(table) : nothing}
    `;
  }

  private renderPagination(table: ReturnType<typeof this.tableController.table>) {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    const totalRows = table.getFilteredRowModel().rows.length;
    const pageSize = table.getState().pagination.pageSize;
    const startRow = currentPage * pageSize + 1;
    const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

    // Generate page buttons
    const pageButtons: number[] = [];
    const maxButtons = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(pageCount, startPage + maxButtons);
    if (endPage - startPage < maxButtons) {
      startPage = Math.max(0, endPage - maxButtons);
    }
    for (let i = startPage; i < endPage; i++) {
      pageButtons.push(i);
    }

    return html`
      <div class="pagination">
        <span class="pagination-info">
          Showing ${startRow}-${endRow} of ${totalRows} rows
        </span>

        <div class="pagination-buttons">
          <button
            class="pagination-btn"
            @click=${() => table.setPageIndex(0)}
            ?disabled=${!table.getCanPreviousPage()}
          >
            «
          </button>
          <button
            class="pagination-btn"
            @click=${() => table.previousPage()}
            ?disabled=${!table.getCanPreviousPage()}
          >
            ‹
          </button>

          ${pageButtons.map(
            (page) => html`
              <button
                class="pagination-btn ${page === currentPage ? 'active' : ''}"
                @click=${() => table.setPageIndex(page)}
              >
                ${page + 1}
              </button>
            `
          )}

          <button
            class="pagination-btn"
            @click=${() => table.nextPage()}
            ?disabled=${!table.getCanNextPage()}
          >
            ›
          </button>
          <button
            class="pagination-btn"
            @click=${() => table.setPageIndex(pageCount - 1)}
            ?disabled=${!table.getCanNextPage()}
          >
            »
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-data-table': DataTable;
  }
}
