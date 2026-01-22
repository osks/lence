/**
 * Shared TypeScript types for Lence.
 */

/**
 * Column metadata from a query result.
 */
export interface Column {
  name: string;
  type: string;  // DuckDB type: VARCHAR, INTEGER, DOUBLE, DATE, etc.
}

/**
 * Result of a SQL query in table format.
 */
export interface QueryResult {
  columns: Column[];
  data: unknown[][];  // Row-major: [[row1], [row2], ...]
  row_count: number;
}

/**
 * Information about a data source.
 */
export interface SourceInfo {
  name: string;
  type: string;
  description: string;
}

/**
 * Menu item for sidebar navigation.
 */
export interface MenuItem {
  title: string;
  path?: string;
  children?: MenuItem[];
}

/**
 * Request body for executing a query (legacy).
 */
export interface QueryRequest {
  source: string;
  sql: string;
}

/**
 * Request body for secure query execution.
 */
export interface SecureQueryRequest {
  page: string;
  query: string;
  params: Record<string, unknown>;
}

/**
 * Error response from API.
 */
export interface ApiError {
  detail: string;
}

/**
 * Frontend settings from backend.
 */
export interface Settings {
  showHelp: boolean;
  devMode: boolean;
  title: string;
}

/**
 * Helper to extract a column's values from query result.
 */
export function getColumn(result: QueryResult, columnName: string): unknown[] {
  const index = result.columns.findIndex((col) => col.name === columnName);
  if (index === -1) {
    throw new Error(`Column not found: ${columnName}`);
  }
  return result.data.map((row) => row[index]);
}

/**
 * Helper to convert query result to array of objects.
 */
export function toObjects(result: QueryResult): Record<string, unknown>[] {
  return result.data.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj;
  });
}

/**
 * Lit property converter for boolean attributes.
 * Markdoc outputs `attr="false"` which Lit's default Boolean converter
 * interprets as truthy. This converter handles "true"/"false" strings correctly.
 */
export const booleanConverter = {
  fromAttribute: (value: string | null) => value === 'true' || value === '',
  toAttribute: (value: boolean) => (value ? 'true' : 'false'),
};
