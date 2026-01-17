import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleTable } from '../simple-table.js';
import type { QueryResult } from '../../../types.js';

describe('SimpleTable', () => {
  let element: SimpleTable;

  const sampleData: QueryResult = {
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'amount', type: 'DOUBLE' },
    ],
    data: [
      [1, 'Alice', 150.5],
      [2, 'Bob', 200.75],
      [3, 'Charlie', 100.0],
    ],
    row_count: 3,
  };

  beforeEach(() => {
    element = new SimpleTable();
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('rendering', () => {
    it('should show loading state when no data', async () => {
      await element.updateComplete;

      const loading = element.shadowRoot?.querySelector('.loading');
      expect(loading).toBeTruthy();
      expect(loading?.textContent).toContain('Loading');
    });

    it('should show empty state when no rows', async () => {
      element.data = {
        columns: [{ name: 'id', type: 'INTEGER' }],
        data: [],
        row_count: 0,
      };
      await element.updateComplete;

      const empty = element.shadowRoot?.querySelector('.empty');
      expect(empty).toBeTruthy();
      expect(empty?.textContent).toContain('No data');
    });

    it('should render table headers from columns', async () => {
      element.data = sampleData;
      await element.updateComplete;

      const headers = element.shadowRoot?.querySelectorAll('th');
      expect(headers).toHaveLength(3);
      expect(headers?.[0].textContent).toContain('id');
      expect(headers?.[1].textContent).toContain('name');
      expect(headers?.[2].textContent).toContain('amount');
    });

    it('should render data rows', async () => {
      element.data = sampleData;
      await element.updateComplete;

      const rows = element.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);

      const firstRowCells = rows?.[0].querySelectorAll('td');
      expect(firstRowCells?.[0].textContent?.trim()).toBe('1');
      expect(firstRowCells?.[1].textContent?.trim()).toBe('Alice');
      expect(firstRowCells?.[2].textContent?.trim()).toBe('150.50');
    });

    it('should apply numeric class to numeric columns', async () => {
      element.data = sampleData;
      await element.updateComplete;

      const firstRow = element.shadowRoot?.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');

      expect(cells?.[0].classList.contains('numeric')).toBe(true); // INTEGER
      expect(cells?.[1].classList.contains('numeric')).toBe(false); // VARCHAR
      expect(cells?.[2].classList.contains('numeric')).toBe(true); // DOUBLE
    });
  });

  describe('formatting', () => {
    it('should format large numbers with commas', async () => {
      element.data = {
        columns: [{ name: 'value', type: 'INTEGER' }],
        data: [[1234567]],
        row_count: 1,
      };
      await element.updateComplete;

      const cell = element.shadowRoot?.querySelector('td');
      expect(cell?.textContent?.trim()).toBe('1,234,567');
    });

    it('should format decimals to 2 places', async () => {
      element.data = {
        columns: [{ name: 'value', type: 'DOUBLE' }],
        data: [[123.456]],
        row_count: 1,
      };
      await element.updateComplete;

      const cell = element.shadowRoot?.querySelector('td');
      expect(cell?.textContent?.trim()).toBe('123.46');
    });

    it('should handle null values', async () => {
      element.data = {
        columns: [{ name: 'value', type: 'VARCHAR' }],
        data: [[null]],
        row_count: 1,
      };
      await element.updateComplete;

      const cell = element.shadowRoot?.querySelector('td');
      expect(cell?.textContent?.trim()).toBe('');
    });
  });

  describe('sorting', () => {
    it('should sort ascending on first click', async () => {
      element.data = sampleData;
      await element.updateComplete;

      // Click on 'name' header
      const headers = element.shadowRoot?.querySelectorAll('th');
      headers?.[1].click();
      await element.updateComplete;

      const rows = element.shadowRoot?.querySelectorAll('tbody tr');
      const names = Array.from(rows || []).map(
        (row) => row.querySelectorAll('td')[1].textContent?.trim()
      );

      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort descending on second click', async () => {
      element.data = sampleData;
      await element.updateComplete;

      const headers = element.shadowRoot?.querySelectorAll('th');
      headers?.[1].click(); // First click - asc
      await element.updateComplete;
      headers?.[1].click(); // Second click - desc
      await element.updateComplete;

      const rows = element.shadowRoot?.querySelectorAll('tbody tr');
      const names = Array.from(rows || []).map(
        (row) => row.querySelectorAll('td')[1].textContent?.trim()
      );

      expect(names).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should reset sort on third click', async () => {
      element.data = sampleData;
      await element.updateComplete;

      const headers = element.shadowRoot?.querySelectorAll('th');
      headers?.[1].click(); // asc
      await element.updateComplete;
      headers?.[1].click(); // desc
      await element.updateComplete;
      headers?.[1].click(); // reset
      await element.updateComplete;

      const rows = element.shadowRoot?.querySelectorAll('tbody tr');
      const names = Array.from(rows || []).map(
        (row) => row.querySelectorAll('td')[1].textContent?.trim()
      );

      // Should be back to original order
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort numeric columns correctly', async () => {
      element.data = sampleData;
      await element.updateComplete;

      // Click on 'amount' header
      const headers = element.shadowRoot?.querySelectorAll('th');
      headers?.[2].click();
      await element.updateComplete;

      const rows = element.shadowRoot?.querySelectorAll('tbody tr');
      const amounts = Array.from(rows || []).map((row) =>
        row.querySelectorAll('td')[2].textContent?.trim()
      );

      // Ascending: 100, 150.5, 200.75
      expect(amounts).toEqual(['100', '150.50', '200.75']);
    });
  });
});
