/**
 * ECharts area chart component with stacking support.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as echarts from 'echarts';
import { booleanConverter, type QueryResult, type Column } from '../../types.js';

type EChartsInstance = ReturnType<typeof echarts.init>;
type EChartsOption = echarts.EChartsOption;

// Default palette
const CHART_COLORS = [
  '#236aa4', // Deep blue
  '#45a1bf', // Teal
  '#a5cdee', // Light blue
  '#8dacbf', // Grayish blue
  '#85c7c6', // Cyan
  '#d2c6ac', // Tan
  '#f4b548', // Golden amber
  '#8f3d56', // Burgundy
  '#71b9f4', // Sky blue
  '#46a485', // Green
];

/**
 * Area chart component with support for multiple series and stacking.
 */
@customElement('lence-area-chart')
export class EChartsAreaChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: var(--lence-chart-height, 300px);
      width: 100%;
      font-family: var(--lence-font-family, system-ui);
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
      color: var(--lence-text-muted, #6b7280);
    }

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--lence-negative, #ef4444);
      background: var(--lence-negative-bg, #fef2f2);
      border: 1px solid var(--lence-negative, #ef4444);
      border-radius: var(--lence-radius, 8px);
      padding: 1rem;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--lence-text-muted, #6b7280);
    }
  `;

  /**
   * Column name for x-axis values.
   */
  @property({ type: String })
  x = '';

  /**
   * Column name(s) for y-axis values.
   * For multiple series, use comma-separated names: "revenue,costs,profit"
   */
  @property({ type: String })
  y = '';

  /**
   * Optional chart title.
   */
  @property({ type: String })
  title = '';

  /**
   * Enable stacking for multiple series.
   */
  @property({ converter: booleanConverter })
  stacked = false;

  /**
   * Query result data, passed from page component.
   */
  @property({ attribute: false })
  data?: QueryResult;

  private error: string | null = null;
  private chart: EChartsInstance | null = null;
  private resizeObserver: ResizeObserver | null = null;

  firstUpdated() {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });

    const container = this.shadowRoot?.querySelector('.chart-container');
    if (container) {
      this.resizeObserver.observe(container);
    }
  }

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

  private getColumnValues(columnName: string): unknown[] {
    if (!this.data) return [];

    const index = this.data.columns.findIndex(
      (col: Column) => col.name === columnName
    );
    if (index === -1) {
      throw new Error(`Column not found: ${columnName}`);
    }

    return this.data.data.map((row: unknown[]) => row[index]);
  }

  private parseYColumns(): string[] {
    return this.y.split(',').map(s => s.trim()).filter(Boolean);
  }

  private renderChart(): void {
    if (!this.data || !this.x || !this.y) {
      return;
    }

    const container = this.shadowRoot?.querySelector('.chart-container');
    if (!container) return;

    if (!this.chart) {
      this.chart = echarts.init(container as HTMLElement);
    }

    const option = this.buildAreaOption();
    this.chart.setOption(option, true);
  }

  private buildAreaOption(): EChartsOption {
    const xValues = this.getColumnValues(this.x);
    const yColumns = this.parseYColumns();

    // Build series for each y column
    const series: echarts.SeriesOption[] = yColumns.map((colName, index) => {
      const values = this.getColumnValues(colName);
      return {
        name: colName,
        type: 'line',
        data: values as number[],
        areaStyle: {
          opacity: 0.7,
        },
        stack: this.stacked ? 'total' : undefined,
        emphasis: {
          focus: 'series',
        },
        smooth: true,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    const showLegend = yColumns.length > 1;

    return {
      animation: false,
      color: CHART_COLORS,
      title: this.title
        ? {
            text: this.title,
            left: 'center',
            textStyle: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: 16,
              color: '#060606',
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        textStyle: {
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
      legend: showLegend
        ? {
            data: yColumns,
            top: this.title ? 30 : 0,
            textStyle: {
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#6b7280',
            },
          }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: this.title ? (showLegend ? 80 : 50) : (showLegend ? 40 : 10),
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xValues as string[],
        axisLabel: {
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#6b7280',
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#6b7280',
        },
        splitLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
      },
      series,
      textStyle: {
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#6b7280',
      },
    };
  }

  private destroyChart(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }

  render() {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this.data) {
      return html`<div class="loading">Loading chart...</div>`;
    }

    if (this.data.row_count === 0) {
      return html`<div class="no-data">No data available</div>`;
    }

    return html`<div class="chart-container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-area-chart': EChartsAreaChart;
  }
}
