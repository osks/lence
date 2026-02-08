/**
 * ECharts Gantt chart component.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as echarts from 'echarts';
import { booleanConverter, type QueryResult, type Column } from '../../types.js';
import { inputs } from '../../stores/inputs.js';
import { themeDefaults } from '../../styles/theme.js';

type EChartsInstance = ReturnType<typeof echarts.init>;
type EChartsOption = echarts.EChartsOption;

// Height constants for auto-sizing
const BAR_HEIGHT = 32; // pixels per bar
const TOP_PADDING = 30; // space for axis
const BOTTOM_PADDING = 40; // space for x-axis labels (dataZoom is separate when scrolling)
const BOTTOM_PADDING_WITH_ZOOM = 80; // space when dataZoom is inline
const TITLE_HEIGHT = 30; // additional space when title is present
const ZOOM_CONTROL_HEIGHT = 50; // height of separate zoom control

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
  static styles = [
    themeDefaults,
    css`
      :host {
        display: block;
        width: 100%;
        font-family: var(--lence-font-family);
      }

      .chart-wrapper {
        width: 100%;
      }

      .chart-wrapper.scrollable {
        overflow-y: auto;
      }

      .chart-container {
        width: 100%;
      }

      .zoom-control {
        width: 100%;
        height: 50px;
        border-top: 1px solid #e5e7eb;
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--lence-text-muted);
      }

      .error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--lence-negative);
        background: var(--lence-negative-bg);
        border: 1px solid var(--lence-negative);
        border-radius: var(--lence-radius);
        padding: 1rem;
      }

      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--lence-text-muted);
      }
    `,
  ];

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
   * Optional column name for progress (0-1 or 0-100).
   * When set, bars show a filled portion indicating completion.
   */
  @property({ type: String })
  progress = '';

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
   * Fixed height in pixels. Content scrolls if it exceeds this height.
   * When not set, height adjusts automatically to fit content.
   */
  @property({ type: Number })
  height?: number;

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
  private zoomChart: EChartsInstance | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeInputs?: () => void;

  // Cached chart range for zoom control
  private chartRange: { min: number; max: number } | null = null;

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

  private calculateHeight(): number {
    const itemCount = this.countValidItems();
    const titlePadding = this.title ? TITLE_HEIGHT : 0;
    // Use smaller bottom padding when zoom is separate (fixed height set)
    const bottomPadding = this.height ? BOTTOM_PADDING : BOTTOM_PADDING_WITH_ZOOM;
    const naturalHeight = Math.max(
      100, // minimum height
      itemCount * BAR_HEIGHT + TOP_PADDING + bottomPadding + titlePadding
    );

    // Always use natural height - CSS overflow handles scrolling when fixed height is set
    return naturalHeight;
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

    // Set up separate zoom control if fixed height is set
    if (this.height) {
      this.renderZoomControl();
    }

    // Apply view range after a microtask to ensure ECharts has finished rendering
    queueMicrotask(() => this.applyViewRange());
  }

  private renderZoomControl(): void {
    const zoomContainer = this.shadowRoot?.querySelector('.zoom-control') as HTMLElement;
    if (!zoomContainer || !this.chartRange) return;

    if (!this.zoomChart) {
      this.zoomChart = echarts.init(zoomContainer);

      // Sync zoom from control to main chart by updating xAxis range
      this.zoomChart.on('datazoom', (params: unknown) => {
        const p = params as { start?: number; end?: number; batch?: { start: number; end: number }[] };
        if (this.chart && this.chartRange) {
          const startPct = (p.batch?.[0]?.start ?? p.start ?? 0) / 100;
          const endPct = (p.batch?.[0]?.end ?? p.end ?? 100) / 100;
          const range = this.chartRange.max - this.chartRange.min;
          const newMin = this.chartRange.min + range * startPct;
          const newMax = this.chartRange.min + range * endPct;
          this.chart.setOption({
            xAxis: [
              { min: newMin, max: newMax },
              { min: newMin, max: newMax },
            ],
          });
        }
      });
    }

    const zoomOption = this.buildZoomOption();
    this.zoomChart.setOption(zoomOption, true);
  }

  private buildZoomOption(): EChartsOption {
    if (!this.chartRange) return {};

    return {
      animation: false,
      grid: {
        left: 10,
        right: '5%',
        top: 5,
        bottom: 25,
      },
      xAxis: {
        type: 'time',
        min: this.chartRange.min,
        max: this.chartRange.max,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 20,
          bottom: 5,
          borderColor: 'transparent',
          backgroundColor: '#f3f4f6',
          fillerColor: 'rgba(35, 106, 164, 0.15)',
          handleSize: 16,
          handleStyle: {
            color: '#236aa4',
            borderColor: '#236aa4',
          },
          moveHandleSize: 8,
          brushSelect: false,
          textStyle: {
            color: '#6b7280',
            fontSize: 10,
          },
        },
      ],
      series: [],
    };
  }

  private applyViewRange(): void {
    if (!this.chart || !this.chartRange) return;

    const viewStart = this.resolveValue(this.viewStart);
    const viewEnd = this.resolveValue(this.viewEnd);

    // Skip if neither is set
    if (!viewStart && !viewEnd) return;

    // Calculate the actual min/max values
    const newMin = viewStart ? parseDate(viewStart) : this.chartRange.min;
    const newMax = viewEnd ? parseDate(viewEnd) : this.chartRange.max;

    if (this.height) {
      // When fixed height is set, update both xAxis directly (no dataZoom on main chart)
      this.chart.setOption({
        xAxis: [
          { min: newMin, max: newMax },
          { min: newMin, max: newMax },
        ],
      });

      // Update zoom control slider position
      if (this.zoomChart) {
        const range = this.chartRange.max - this.chartRange.min;
        const startPct = ((newMin - this.chartRange.min) / range) * 100;
        const endPct = ((newMax - this.chartRange.min) / range) * 100;
        this.zoomChart.dispatchAction({
          type: 'dataZoom',
          start: startPct,
          end: endPct,
        });
      }
    } else {
      // Normal mode with inline dataZoom
      this.chart.dispatchAction({
        type: 'dataZoom',
        startValue: newMin,
        endValue: newMax,
      });
    }
  }

  private buildGanttOption(): EChartsOption {
    const labels = this.getColumnValues(this.label);
    const starts = this.getColumnValues(this.start);
    const ends = this.getColumnValues(this.end);
    const urls = this.url ? this.getColumnValues(this.url) : [];
    const progressValues = this.progress ? this.getColumnValues(this.progress) : [];

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

    // Store for zoom control
    this.chartRange = { min: paddedMin, max: paddedMax };

    // Build data items, filtering out rows where both dates are null
    const validLabels: string[] = [];
    const dataItems: {
      value: [number, number, number];
      name: string;
      itemStyle: { color: string; opacity: number };
      url?: string;
      progress?: number;
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

      // Add progress if present (normalize to 0-1 range)
      if (progressValues.length > 0 && progressValues[i] != null) {
        let prog = Number(progressValues[i]);
        // If value > 1, assume it's a percentage (0-100)
        if (prog > 1) {
          prog = prog / 100;
        }
        item.progress = Math.max(0, Math.min(1, prog));
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
            data: { itemStyle: { opacity: number }; progress?: number };
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

          // Progress line
          const progressStr = p.data.progress !== undefined
            ? `Progress: ${Math.round(p.data.progress * 100)}%<br/>`
            : '';

          return `
            <strong>${p.name}</strong><br/>
            Start: ${startStr}<br/>
            End: ${endStr}<br/>
            Duration: ${durationDays} days<br/>
            ${progressStr}
          `;
        },
        textStyle: {
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#000',
        },
      },
      grid: {
        left: 10,
        right: '5%',
        top: this.title ? 80 : 50,
        bottom: this.height ? 50 : 90,
        containLabel: false,
      },
      // When fixed height is set, dataZoom slider is rendered separately below
      dataZoom: this.height
        ? [] // No dataZoom on main chart - controlled by separate zoom chart
        : [
            // X-axis slider (inline when no fixed height)
            {
              type: 'slider',
              xAxisIndex: [0, 1],
              filterMode: 'none',
              height: 20,
              bottom: 10,
              borderColor: 'transparent',
              backgroundColor: '#f3f4f6',
              fillerColor: 'rgba(35, 106, 164, 0.15)',
              handleSize: 16,
              handleStyle: {
                color: '#236aa4',
                borderColor: '#236aa4',
              },
              moveHandleSize: 8,
              brushSelect: false,
              textStyle: {
                color: '#6b7280',
                fontSize: 10,
              },
            },
          ],
      xAxis: [
        {
          type: 'time',
          position: 'top',
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
        {
          type: 'time',
          position: 'bottom',
          min: paddedMin,
          max: paddedMax,
          axisLabel: {
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#6b7280',
          },
          splitLine: {
            show: false,
          },
        },
      ],
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
            const height = (api.size?.([0, 1]) as number[])?.[1] * 0.75 || 24;
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
            const itemData = dataItems[categoryIndex];
            const progress = itemData?.progress;

            // Build children array
            const children: unknown[] = [];

            if (progress !== undefined) {
              // Background bar (unfilled portion) - lighter opacity with border
              children.push({
                type: 'rect',
                shape: rectShape,
                style: {
                  fill: fillColor,
                  opacity: 0.3,
                  stroke: fillColor,
                  lineWidth: 1,
                },
              });

              // Progress bar (filled portion) - full opacity
              // Use full bar width for progress calculation, then clip to visible area
              const progressWidth = barWidth * progress;
              if (progressWidth > 0) {
                const progressShape = echarts.graphic.clipRectByRect(
                  {
                    x: start[0],
                    y: start[1] - height / 2,
                    width: progressWidth,
                    height: height,
                  },
                  {
                    x: coordSys.x,
                    y: coordSys.y,
                    width: coordSys.width,
                    height: coordSys.height,
                  }
                );
                if (progressShape) {
                  children.push({
                    type: 'rect',
                    shape: progressShape,
                    style: {
                      fill: fillColor,
                      opacity: 0.85,
                    },
                  });
                }
              }
            } else {
              // No progress - single bar with normal styling
              children.push({
                type: 'rect',
                shape: rectShape,
                style: {
                  ...api.style(),
                  fill: fillColor,
                },
              });
            }

            // Text label with shadow for readability on light backgrounds
            children.push({
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
                textShadowColor: 'rgba(0, 0, 0, 0.4)',
                textShadowBlur: 2,
                truncate: {
                  outerWidth: Math.max(0, rectShape.width - 12),
                  ellipsis: '…',
                },
              },
            });

            return {
              type: 'group',
              children,
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

    if (this.zoomChart) {
      this.zoomChart.dispose();
      this.zoomChart = null;
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

    if (this.height) {
      // Scrollable chart with fixed zoom control below
      const scrollHeight = this.height - ZOOM_CONTROL_HEIGHT;
      return html`
        <div class="chart-wrapper scrollable" style="height: ${scrollHeight}px">
          <div class="chart-container"></div>
        </div>
        <div class="zoom-control"></div>
      `;
    }

    return html`
      <div class="chart-wrapper">
        <div class="chart-container"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-gantt': EChartsGantt;
  }
}
