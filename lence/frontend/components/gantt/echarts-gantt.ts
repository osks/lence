/**
 * ECharts Gantt chart component.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as echarts from 'echarts';
import { booleanConverter, type QueryResult, type Column } from '../../types.js';
import { inputs } from '../../stores/inputs.js';

type EChartsInstance = ReturnType<typeof echarts.init>;
type EChartsOption = echarts.EChartsOption;

// Height constants for auto-sizing
const BAR_HEIGHT = 32; // pixels per bar
const TOP_PADDING = 30; // space for axis
const BOTTOM_PADDING = 80; // space for x-axis labels + dataZoom slider
const TITLE_HEIGHT = 30; // additional space when title is present

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
 * Parse a date string, supporting relative formats like "-30d", "+3m", "-1y".
 * Returns timestamp in milliseconds.
 */
function parseDate(value: string): number {
  const relativeMatch = value.match(/^([+-]?\d+)([dmy])$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + amount);
        break;
      case 'm':
        now.setMonth(now.getMonth() + amount);
        break;
      case 'y':
        now.setFullYear(now.getFullYear() + amount);
        break;
    }
    return now.getTime();
  }

  // Try parsing as ISO date
  return new Date(value).getTime();
}

// Regex to extract input name from ${inputs.foo.value} syntax
const INPUT_REF_REGEX = /^\$\{inputs\.(\w+)\.value\}$/;

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
   * Optional column name for URLs (makes bars clickable).
   */
  @property({ type: String })
  url = '';

  /**
   * Show a vertical marker for today's date.
   */
  @property({ converter: booleanConverter })
  showToday = false;

  /**
   * View start date. Can be:
   * - Literal: "-30d", "-3m", "2024-01-01"
   * - Input reference: "${inputs.my_input.value}"
   */
  @property({ type: String })
  viewStart?: string;

  /**
   * View end date. Can be:
   * - Literal: "+30d", "+3m", "2024-12-31"
   * - Input reference: "${inputs.my_input.value}"
   */
  @property({ type: String })
  viewEnd?: string;

  /**
   * Maximum height in pixels. If content exceeds this, a vertical scrollbar appears.
   */
  @property({ type: Number })
  maxHeight?: number;

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
  private unsubscribeInputs?: () => void;

  /**
   * Extract input name from ${inputs.foo.value} syntax, or null if not a reference.
   */
  private extractInputName(value: string | undefined): string | null {
    if (!value) return null;
    const match = value.match(INPUT_REF_REGEX);
    return match ? match[1] : null;
  }

  connectedCallback() {
    super.connectedCallback();

    // Subscribe to input changes for dynamic viewStart/viewEnd
    this.unsubscribeInputs = inputs.onChange((name) => {
      const startInputName = this.extractInputName(this.viewStart);
      const endInputName = this.extractInputName(this.viewEnd);
      if ((startInputName === name || endInputName === name) && this.data) {
        this.renderChart();
      }
    });
  }

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
      // If we depend on an input that's not set yet, defer rendering
      // to give dropdowns time to initialize
      const pendingInput = this.hasPendingInputDependency();
      if (pendingInput) {
        // Wait for input to be set, then render
        requestAnimationFrame(() => {
          try {
            this.error = null;
            this.renderChart();
          } catch (err) {
            this.error = err instanceof Error ? err.message : 'Chart render failed';
            this.requestUpdate();
          }
        });
      } else {
        try {
          this.error = null;
          this.renderChart();
        } catch (err) {
          this.error = err instanceof Error ? err.message : 'Chart render failed';
          this.requestUpdate();
        }
      }
    }
  }

  /**
   * Check if we depend on an input that hasn't been set yet.
   */
  private hasPendingInputDependency(): boolean {
    const startInputName = this.extractInputName(this.viewStart);
    const endInputName = this.extractInputName(this.viewEnd);

    if (startInputName && !inputs.get(startInputName).value) {
      return true;
    }
    if (endInputName && !inputs.get(endInputName).value) {
      return true;
    }
    return false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyChart();
    this.unsubscribeInputs?.();
  }

  /**
   * Resolve a value that may be a literal or ${inputs.foo.value} reference.
   */
  private resolveValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const inputName = this.extractInputName(value);
    if (inputName) {
      return inputs.get(inputName).value ?? undefined;
    }
    return value;
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

  private calculateHeight(): { height: number; needsYScroll: boolean } {
    const itemCount = this.countValidItems();
    const titlePadding = this.title ? TITLE_HEIGHT : 0;
    const naturalHeight = Math.max(
      100, // minimum height
      itemCount * BAR_HEIGHT + TOP_PADDING + BOTTOM_PADDING + titlePadding
    );

    if (this.maxHeight && naturalHeight > this.maxHeight) {
      return { height: this.maxHeight, needsYScroll: true };
    }
    return { height: naturalHeight, needsYScroll: false };
  }

  private renderChart(): void {
    if (!this.data || !this.label || !this.start || !this.end) {
      return;
    }

    const container = this.shadowRoot?.querySelector('.chart-container') as HTMLElement;
    if (!container) return;

    // Set container height based on data
    const { height } = this.calculateHeight();
    container.style.height = `${height}px`;

    // Set cursor style based on whether URLs are present
    if (this.url) {
      container.style.cursor = 'pointer';
    }

    if (!this.chart) {
      this.chart = echarts.init(container);

      // Add click handler for URLs
      this.chart.on('click', (params: unknown) => {
        const p = params as { data?: { url?: string } };
        if (p.data?.url) {
          window.open(p.data.url, '_blank');
        }
      });
    } else {
      // Resize if height changed
      this.chart.resize();
    }

    const option = this.buildGanttOption();
    this.chart.setOption(option, true);

    // Apply view range after a microtask to ensure ECharts has finished rendering
    queueMicrotask(() => this.applyViewRange());
  }

  private applyViewRange(): void {
    if (!this.chart) return;

    const viewStart = this.resolveValue(this.viewStart);
    const viewEnd = this.resolveValue(this.viewEnd);

    // Skip if neither is set
    if (!viewStart && !viewEnd) return;

    // Apply via dispatchAction (more reliable than setOption for dataZoom)
    if (viewStart && viewEnd) {
      this.chart.dispatchAction({
        type: 'dataZoom',
        startValue: parseDate(viewStart),
        endValue: parseDate(viewEnd),
      });
    } else if (viewStart) {
      this.chart.dispatchAction({
        type: 'dataZoom',
        startValue: parseDate(viewStart),
        end: 100,
      });
    } else if (viewEnd) {
      this.chart.dispatchAction({
        type: 'dataZoom',
        start: 0,
        endValue: parseDate(viewEnd),
      });
    }
  }

  private buildGanttOption(): EChartsOption {
    const { needsYScroll } = this.calculateHeight();
    const labels = this.getColumnValues(this.label);
    const starts = this.getColumnValues(this.start);
    const ends = this.getColumnValues(this.end);
    const urls = this.url ? this.getColumnValues(this.url) : [];

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
      url?: string;
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

      const item: typeof dataItems[number] = {
        value: [validIndex, startTime, endTime],
        name: labelVal,
        itemStyle: {
          color: CHART_COLORS[validIndex % CHART_COLORS.length],
          opacity: isOpenEnded ? 0.5 : 0.85,
        },
      };

      // Add URL if present
      if (urls.length > 0 && urls[i] != null) {
        item.url = String(urls[i]);
      }

      dataItems.push(item);

      validIndex++;
    }

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
        left: 10,
        right: needsYScroll ? 50 : '5%',
        top: this.title ? 60 : 30,
        bottom: 70,
        containLabel: false,
      },
      dataZoom: [
        // X-axis slider (always present)
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 20,
          bottom: 10,
          borderColor: 'transparent',
          backgroundColor: '#f3f4f6',
          fillerColor: 'rgba(37, 99, 235, 0.15)',
          handleStyle: {
            color: '#2563eb',
            borderColor: '#2563eb',
          },
          moveHandleSize: 0,
          textStyle: {
            color: '#6b7280',
            fontSize: 10,
          },
        },
        // Y-axis slider (only when content overflows maxHeight)
        ...(needsYScroll ? [{
          type: 'slider' as const,
          yAxisIndex: 0,
          filterMode: 'none' as const,
          width: 20,
          right: 10,
          borderColor: 'transparent',
          backgroundColor: '#f3f4f6',
          fillerColor: 'rgba(37, 99, 235, 0.15)',
          handleStyle: {
            color: '#2563eb',
            borderColor: '#2563eb',
          },
          moveHandleSize: 0,
          startValue: 0,
          endValue: Math.floor((this.maxHeight! - TOP_PADDING - BOTTOM_PADDING - (this.title ? TITLE_HEIGHT : 0)) / BAR_HEIGHT) - 1,
        }] : []),
      ],
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
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
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
            const barWidth = end[0] - start[0];

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
                width: barWidth,
                height: height,
              },
              {
                x: coordSys.x,
                y: coordSys.y,
                width: coordSys.width,
                height: coordSys.height,
              }
            );

            if (!rectShape) return null;

            const label = validLabels[categoryIndex] || '';
            const fillColor = (api.style() as { fill?: string }).fill || CHART_COLORS[categoryIndex % CHART_COLORS.length];

            return {
              type: 'group',
              children: [
                {
                  type: 'rect',
                  shape: rectShape,
                  style: {
                    ...api.style(),
                    fill: fillColor,
                  },
                },
                {
                  type: 'text',
                  style: {
                    x: rectShape.x + 6,
                    y: rectShape.y + rectShape.height / 2,
                    text: label,
                    fill: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    verticalAlign: 'middle',
                    truncate: {
                      outerWidth: Math.max(0, rectShape.width - 12),
                      ellipsis: '…',
                    },
                  },
                },
              ],
            };
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data: dataItems,
          markLine: this.showToday
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: {
                  color: '#ef4444',
                  width: 2,
                  type: 'solid',
                },
                label: {
                  show: true,
                  position: 'start',
                  formatter: 'Today',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 11,
                  color: '#ef4444',
                },
                data: [
                  {
                    xAxis: new Date().getTime(),
                  },
                ],
              }
            : undefined,
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
