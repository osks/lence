/**
 * ECharts Gantt chart component.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { QueryResult, Column } from '../../types.js';

type EChartsInstance = ReturnType<typeof echarts.init>;
type EChartsOption = echarts.EChartsOption;

// Height constants for auto-sizing
const BAR_HEIGHT = 32; // pixels per bar
const TOP_PADDING = 30; // space for axis
const BOTTOM_PADDING = 40; // space for x-axis labels
const TITLE_HEIGHT = 30; // additional space when title is present

// Evidence.dev template default palette
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
 * Gantt chart component for visualizing timeline data.
 */
@customElement('lence-gantt')
export class EChartsGantt extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--lence-font-family, system-ui);
    }

    .chart-container {
      width: 100%;
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
   * Query name to get data from.
   */
  @property({ type: String })
  query = '';

  /**
   * Column name for task labels.
   */
  @property({ type: String })
  label = '';

  /**
   * Column name for start dates.
   */
  @property({ type: String })
  start = '';

  /**
   * Column name for end dates.
   */
  @property({ type: String })
  end = '';

  /**
   * Optional chart title.
   */
  @property({ type: String })
  title = '';

  /**
   * Query result data, passed from page component.
   */
  @property({ attribute: false })
  data?: QueryResult;

  /**
   * Error message if rendering fails.
   */
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

  private countValidItems(): number {
    if (!this.data) return 0;

    const starts = this.getColumnValues(this.start);
    const ends = this.getColumnValues(this.end);

    let count = 0;
    for (let i = 0; i < starts.length; i++) {
      // Count items where at least one date is present
      if (starts[i] != null || ends[i] != null) {
        count++;
      }
    }
    return count;
  }

  private calculateHeight(): number {
    const itemCount = this.countValidItems();
    const titlePadding = this.title ? TITLE_HEIGHT : 0;
    return Math.max(
      100, // minimum height
      itemCount * BAR_HEIGHT + TOP_PADDING + BOTTOM_PADDING + titlePadding
    );
  }

  private renderChart(): void {
    if (!this.data || !this.label || !this.start || !this.end) {
      return;
    }

    const container = this.shadowRoot?.querySelector('.chart-container') as HTMLElement;
    if (!container) return;

    // Set container height based on data
    const height = this.calculateHeight();
    container.style.height = `${height}px`;

    if (!this.chart) {
      this.chart = echarts.init(container);
    } else {
      // Resize if height changed
      this.chart.resize();
    }

    const option = this.buildGanttOption();
    this.chart.setOption(option, true);
  }

  private buildGanttOption(): EChartsOption {
    const labels = this.getColumnValues(this.label);
    const starts = this.getColumnValues(this.start);
    const ends = this.getColumnValues(this.end);

    // Filter and collect valid time values for chart range
    const validTimes: number[] = [];
    for (let i = 0; i < labels.length; i++) {
      const startVal = starts[i];
      const endVal = ends[i];
      if (startVal != null) {
        validTimes.push(new Date(startVal as string).getTime());
      }
      if (endVal != null) {
        validTimes.push(new Date(endVal as string).getTime());
      }
    }

    if (validTimes.length === 0) {
      throw new Error('No valid dates found in data');
    }

    const chartMin = Math.min(...validTimes);
    const chartMax = Math.max(...validTimes);

    // Add some padding to the range (5% on each side)
    const range = chartMax - chartMin;
    const padding = range * 0.05;
    const paddedMin = chartMin - padding;
    const paddedMax = chartMax + padding;

    // Build data items, filtering out rows where both dates are null
    const validLabels: string[] = [];
    const dataItems: {
      value: [number, number, number];
      name: string;
      itemStyle: { color: string; opacity: number };
    }[] = [];

    let validIndex = 0;
    for (let i = 0; i < labels.length; i++) {
      const labelVal = String(labels[i] ?? '');
      const startVal = starts[i];
      const endVal = ends[i];

      // Skip if both dates are null
      if (startVal == null && endVal == null) {
        continue;
      }

      validLabels.push(labelVal);

      const startTime = startVal != null
        ? new Date(startVal as string).getTime()
        : paddedMin;
      const endTime = endVal != null
        ? new Date(endVal as string).getTime()
        : paddedMax;

      // Visual distinction: open-ended bars have lower opacity
      const isOpenEnded = startVal == null || endVal == null;

      dataItems.push({
        value: [validIndex, startTime, endTime],
        name: labelVal,
        itemStyle: {
          color: CHART_COLORS[validIndex % CHART_COLORS.length],
          opacity: isOpenEnded ? 0.5 : 0.85,
        },
      });

      validIndex++;
    }

    return {
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
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as {
            name: string;
            value: [number, number, number];
            data: { itemStyle: { opacity: number } };
          };
          const startDate = new Date(p.value[1]);
          const endDate = new Date(p.value[2]);
          const isOpenEnded = p.data.itemStyle.opacity < 0.8;

          const formatDate = (d: Date) =>
            d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

          const startStr = isOpenEnded && p.value[1] === paddedMin
            ? '(open)'
            : formatDate(startDate);
          const endStr = isOpenEnded && p.value[2] === paddedMax
            ? '(open)'
            : formatDate(endDate);

          // Calculate duration in days
          const durationMs = p.value[2] - p.value[1];
          const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

          return `
            <strong>${p.name}</strong><br/>
            Start: ${startStr}<br/>
            End: ${endStr}<br/>
            Duration: ${durationDays} days
          `;
        },
        textStyle: {
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      },
      grid: {
        left: '20%',
        right: '5%',
        top: this.title ? 60 : 30,
        bottom: 40,
        containLabel: false,
      },
      xAxis: {
        type: 'time',
        min: paddedMin,
        max: paddedMax,
        axisLabel: {
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#6b7280',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: validLabels,
        inverse: true,
        axisLabel: {
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#374151',
          overflow: 'truncate',
          width: 150,
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'custom',
          renderItem: (
            params: echarts.CustomSeriesRenderItemParams,
            api: echarts.CustomSeriesRenderItemAPI
          ) => {
            const categoryIndex = api.value(0) as number;
            const start = api.coord([api.value(1), categoryIndex]);
            const end = api.coord([api.value(2), categoryIndex]);
            const height = (api.size?.([0, 1]) as number[])?.[1] * 0.6 || 20;

            const coordSys = params.coordSys as unknown as {
              x: number;
              y: number;
              width: number;
              height: number;
            };

            const rectShape = echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height,
              },
              {
                x: coordSys.x,
                y: coordSys.y,
                width: coordSys.width,
                height: coordSys.height,
              }
            );

            return (
              rectShape && {
                type: 'rect',
                shape: rectShape,
                style: {
                  ...api.style(),
                  fill: (api.style() as { fill?: string }).fill || CHART_COLORS[categoryIndex % CHART_COLORS.length],
                },
              }
            );
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data: dataItems,
        },
      ],
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
    'lence-gantt': EChartsGantt;
  }
}
