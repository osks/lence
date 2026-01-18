import { describe, it, expect } from 'vitest';
import { getColumn, toObjects, type QueryResult } from '../types.js';

describe('getColumn', () => {
  const sampleResult: QueryResult = {
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'amount', type: 'DOUBLE' },
    ],
    data: [
      [1, 'Alice', 100.5],
      [2, 'Bob', 200.75],
      [3, 'Charlie', 150.0],
    ],
    row_count: 3,
  };

  it('should extract column values by name', () => {
    const ids = getColumn(sampleResult, 'id');
    expect(ids).toEqual([1, 2, 3]);
  });

  it('should extract string column values', () => {
    const names = getColumn(sampleResult, 'name');
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should extract numeric column values', () => {
    const amounts = getColumn(sampleResult, 'amount');
    expect(amounts).toEqual([100.5, 200.75, 150.0]);
  });

  it('should throw for unknown column', () => {
    expect(() => getColumn(sampleResult, 'unknown')).toThrow('Column not found: unknown');
  });
});

describe('toObjects', () => {
  const sampleResult: QueryResult = {
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
    ],
    data: [
      [1, 'Alice'],
      [2, 'Bob'],
    ],
    row_count: 2,
  };

  it('should convert rows to objects', () => {
    const objects = toObjects(sampleResult);

    expect(objects).toHaveLength(2);
    expect(objects[0]).toEqual({ id: 1, name: 'Alice' });
    expect(objects[1]).toEqual({ id: 2, name: 'Bob' });
  });

  it('should handle empty result', () => {
    const emptyResult: QueryResult = {
      columns: [{ name: 'id', type: 'INTEGER' }],
      data: [],
      row_count: 0,
    };

    const objects = toObjects(emptyResult);
    expect(objects).toEqual([]);
  });
});
