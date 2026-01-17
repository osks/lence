/**
 * ECharts chart component.
 */

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import * as echarts from 'echarts';
import { BaseChart, type ChartType } from './base-chart.js';

type EChartsInstance = ReturnType<typeof echarts.init>;
type EChartsOption = echarts.EChartsOption;

/**
 * Chart component using ECharts library.
 */
@customElement('lence-chart')
export class EChartsChart extends BaseChart {
  private chart: EChartsInstance | null = null;
  private resizeObserver: ResizeObserver | null = null;

  firstUpdated() {
    // Set up resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });

    const container = this.shadowRoot?.querySelector('.chart-container');
    if (container) {
      this.resizeObserver.observe(container);
    }
  }

  protected renderChart(): void {
    if (!this.data || !this.x || !this.y) {
      return;
    }

    const container = this.shadowRoot?.querySelector('.chart-container');
    if (!container) return;

    // Initialize chart if not exists
    if (!this.chart) {
      this.chart = echarts.init(container as HTMLElement);
    }

    // Get data
    const xValues = this.getColumnValues(this.x);
    const yValues = this.getColumnValues(this.y);

    // Build option based on chart type
    const option = this.buildOption(xValues, yValues);

    // Apply option
    this.chart.setOption(option, true);
  }

  private buildOption(xValues: unknown[], yValues: unknown[]): EChartsOption {
    const baseOption: EChartsOption = {
      title: this.title
        ? {
            text: this.title,
            left: 'center',
          }
        : undefined,
      tooltip: {
        trigger: this.type === 'pie' ? 'item' : 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
    };

    switch (this.type) {
      case 'pie':
        return this.buildPieOption(xValues, yValues, baseOption);
      case 'bar':
        return this.buildBarOption(xValues, yValues, baseOption);
      case 'scatter':
        return this.buildScatterOption(xValues, yValues, baseOption);
      case 'area':
        return this.buildAreaOption(xValues, yValues, baseOption);
      case 'line':
      default:
        return this.buildLineOption(xValues, yValues, baseOption);
    }
  }

  private buildLineOption(
    xValues: unknown[],
    yValues: unknown[],
    base: EChartsOption
  ): EChartsOption {
    return {
      ...base,
      xAxis: {
        type: 'category',
        data: xValues as string[],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: yValues as number[],
          type: 'line',
          smooth: true,
        },
      ],
    };
  }

  private buildBarOption(
    xValues: unknown[],
    yValues: unknown[],
    base: EChartsOption
  ): EChartsOption {
    return {
      ...base,
      xAxis: {
        type: 'category',
        data: xValues as string[],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: yValues as number[],
          type: 'bar',
        },
      ],
    };
  }

  private buildPieOption(
    xValues: unknown[],
    yValues: unknown[],
    base: EChartsOption
  ): EChartsOption {
    const pieData = xValues.map((name, i) => ({
      name: String(name),
      value: yValues[i] as number,
    }));

    return {
      ...base,
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  private buildScatterOption(
    xValues: unknown[],
    yValues: unknown[],
    base: EChartsOption
  ): EChartsOption {
    const scatterData = xValues.map((x, i) => [x, yValues[i]]);

    return {
      ...base,
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'scatter',
          data: scatterData as [number, number][],
        },
      ],
    };
  }

  private buildAreaOption(
    xValues: unknown[],
    yValues: unknown[],
    base: EChartsOption
  ): EChartsOption {
    return {
      ...base,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xValues as string[],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: yValues as number[],
          type: 'line',
          areaStyle: {},
        },
      ],
    };
  }

  protected destroyChart(): void {
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
    'lence-chart': EChartsChart;
  }
}
