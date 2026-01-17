/**
 * Base chart component with shared functionality.
 */

import { LitElement, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { QueryResult, Column } from '../../types.js';

/**
 * Chart types supported by the base chart.
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area';

/**
 * Base chart component.
 * Provides common properties and data transformation helpers.
 * Extend this class to implement specific chart libraries.
 */
export abstract class BaseChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: var(--lence-chart-height, 300px);
      width: 100%;
    }

    .chart-container {
      width: 100%;
      height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pico-muted-color, #6c757d);
    }

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #c62828;
      background: var(--pico-del-color, #ffebee);
      border-radius: 0.25rem;
      padding: 1rem;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pico-muted-color, #6c757d);
    }
  `;

  /**
   * Query name to get data from.
   * Data is passed via the `data` property from the page component.
   */
  @property({ type: String })
  query = '';

  /**
   * Chart type: line, bar, pie, scatter, area.
   */
  @property({ type: String })
  type: ChartType = 'line';

  /**
   * Column name for x-axis values.
   */
  @property({ type: String })
  x = '';

  /**
   * Column name for y-axis values.
   */
  @property({ type: String })
  y = '';

  /**
   * Optional title for the chart.
   */
  @property({ type: String })
  title = '';

  /**
   * Query result data, passed from page component.
   */
  @property({ attribute: false })
  data?: QueryResult;

  /**
   * Error message if chart rendering fails.
   */
  protected error: string | null = null;

  /**
   * Extract a column's values from query result.
   */
  protected getColumnValues(columnName: string): unknown[] {
    if (!this.data) return [];

    const index = this.data.columns.findIndex(
      (col: Column) => col.name === columnName
    );
    if (index === -1) {
      throw new Error(`Column not found: ${columnName}`);
    }

    return this.data.data.map((row: unknown[]) => row[index]);
  }

  /**
   * Get column metadata by name.
   */
  protected getColumn(columnName: string): Column | undefined {
    return this.data?.columns.find((col: Column) => col.name === columnName);
  }

  /**
   * Check if data is numeric type.
   */
  protected isNumericType(type: string): boolean {
    const numericTypes = [
      'INTEGER',
      'BIGINT',
      'DOUBLE',
      'FLOAT',
      'DECIMAL',
      'NUMERIC',
      'REAL',
      'SMALLINT',
      'TINYINT',
      'HUGEINT',
    ];
    return numericTypes.some((t) => type.toUpperCase().includes(t));
  }

  /**
   * Format values based on column type.
   */
  protected formatValue(value: unknown, type: string): string | number {
    if (value === null || value === undefined) {
      return '';
    }

    if (this.isNumericType(type)) {
      const num = Number(value);
      // Format large numbers with commas
      if (Math.abs(num) >= 1000) {
        return num.toLocaleString();
      }
      // Format decimals
      if (!Number.isInteger(num)) {
        return num.toFixed(2);
      }
      return num;
    }

    return String(value);
  }

  /**
   * Abstract method to render the chart.
   * Implemented by specific chart library components.
   */
  protected abstract renderChart(): void;

  /**
   * Abstract method to destroy/cleanup the chart.
   */
  protected abstract destroyChart(): void;

  /**
   * Called when properties change.
   */
  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('data') && this.data) {
      try {
        this.error = null;
        this.renderChart();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Chart render failed';
        this.requestUpdate();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyChart();
  }
}
