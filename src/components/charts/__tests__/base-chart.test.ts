import { describe, it, expect, vi } from 'vitest';
import { BaseChart, type ChartType } from '../base-chart.js';
import type { QueryResult } from '../../../types.js';

// Create a concrete implementation for testing
class TestChart extends BaseChart {
  renderChartCalled = false;
  destroyChartCalled = false;

  protected renderChart(): void {
    this.renderChartCalled = true;
  }

  protected destroyChart(): void {
    this.destroyChartCalled = true;
  }

  // Expose protected methods for testing
  public testGetColumnValues(columnName: string): unknown[] {
    return this.getColumnValues(columnName);
  }

  public testGetColumn(columnName: string) {
    return this.getColumn(columnName);
  }

  public testIsNumericType(type: string): boolean {
    return this.isNumericType(type);
  }

  public testFormatValue(value: unknown, type: string): string | number {
    return this.formatValue(value, type);
  }
}

// Register for testing
customElements.define('test-chart', TestChart);

describe('BaseChart', () => {
  const sampleData: QueryResult = {
    columns: [
      { name: 'month', type: 'VARCHAR' },
      { name: 'revenue', type: 'DOUBLE' },
      { name: 'count', type: 'INTEGER' },
    ],
    data: [
      ['Jan', 1500.5, 10],
      ['Feb', 2300.75, 15],
      ['Mar', 1800.0, 12],
    ],
    row_count: 3,
  };

  describe('getColumnValues', () => {
    it('should extract column values by name', () => {
      const chart = new TestChart();
      chart.data = sampleData;

      expect(chart.testGetColumnValues('month')).toEqual(['Jan', 'Feb', 'Mar']);
      expect(chart.testGetColumnValues('revenue')).toEqual([1500.5, 2300.75, 1800.0]);
      expect(chart.testGetColumnValues('count')).toEqual([10, 15, 12]);
    });

    it('should throw for unknown column', () => {
      const chart = new TestChart();
      chart.data = sampleData;

      expect(() => chart.testGetColumnValues('unknown')).toThrow('Column not found');
    });

    it('should return empty array when no data', () => {
      const chart = new TestChart();
      expect(chart.testGetColumnValues('month')).toEqual([]);
    });
  });

  describe('getColumn', () => {
    it('should return column metadata', () => {
      const chart = new TestChart();
      chart.data = sampleData;

      const col = chart.testGetColumn('revenue');
      expect(col).toEqual({ name: 'revenue', type: 'DOUBLE' });
    });

    it('should return undefined for unknown column', () => {
      const chart = new TestChart();
      chart.data = sampleData;

      expect(chart.testGetColumn('unknown')).toBeUndefined();
    });
  });

  describe('isNumericType', () => {
    it('should identify numeric types', () => {
      const chart = new TestChart();

      expect(chart.testIsNumericType('INTEGER')).toBe(true);
      expect(chart.testIsNumericType('BIGINT')).toBe(true);
      expect(chart.testIsNumericType('DOUBLE')).toBe(true);
      expect(chart.testIsNumericType('FLOAT')).toBe(true);
      expect(chart.testIsNumericType('DECIMAL(10,2)')).toBe(true);
    });

    it('should reject non-numeric types', () => {
      const chart = new TestChart();

      expect(chart.testIsNumericType('VARCHAR')).toBe(false);
      expect(chart.testIsNumericType('DATE')).toBe(false);
      expect(chart.testIsNumericType('BOOLEAN')).toBe(false);
    });
  });

  describe('formatValue', () => {
    it('should format large numbers with commas', () => {
      const chart = new TestChart();

      expect(chart.testFormatValue(1000, 'INTEGER')).toBe('1,000');
      expect(chart.testFormatValue(1234567, 'INTEGER')).toBe('1,234,567');
    });

    it('should format decimals to 2 places', () => {
      const chart = new TestChart();

      expect(chart.testFormatValue(123.456, 'DOUBLE')).toBe('123.46');
      expect(chart.testFormatValue(99.9, 'DOUBLE')).toBe('99.90');
    });

    it('should handle null and undefined', () => {
      const chart = new TestChart();

      expect(chart.testFormatValue(null, 'INTEGER')).toBe('');
      expect(chart.testFormatValue(undefined, 'INTEGER')).toBe('');
    });

    it('should stringify non-numeric values', () => {
      const chart = new TestChart();

      expect(chart.testFormatValue('hello', 'VARCHAR')).toBe('hello');
      expect(chart.testFormatValue(123, 'VARCHAR')).toBe('123');
    });
  });

  describe('properties', () => {
    it('should have default property values', () => {
      const chart = new TestChart();

      expect(chart.query).toBe('');
      expect(chart.type).toBe('line');
      expect(chart.x).toBe('');
      expect(chart.y).toBe('');
      expect(chart.title).toBe('');
      expect(chart.data).toBeUndefined();
    });

    it('should accept chart type', () => {
      const chart = new TestChart();
      chart.type = 'bar';
      expect(chart.type).toBe('bar');
    });
  });
});
