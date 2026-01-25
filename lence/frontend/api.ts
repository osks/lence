/**
 * API client for Lence backend.
 */

import type { QueryResult, SourceInfo, MenuItem, QueryRequest, ApiError, Settings } from './types.js';

/**
 * Base URL for API requests.
 * In production, this would be configured via environment.
 */
const API_BASE = '';

/**
 * Custom error class for API errors.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const error = (await response.json()) as ApiError;
      detail = error.detail;
    } catch {
      // Response wasn't JSON
    }
    throw new ApiRequestError(
      `API request failed: ${response.status}`,
      response.status,
      detail,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Execute a query.
 *
 * Backend behavior:
 * - Normal mode: Uses page + query to lookup SQL in registry
 * - Edit mode: Uses provided sql for live preview
 *
 * @param page - The page path where the query is defined
 * @param queryName - The query name (from ```sql query_name fence)
 * @param params - Parameter values for ${inputs.X.value} placeholders
 * @param sql - Optional SQL template (only used in edit mode)
 */
export async function executeQuery(
  page: string,
  queryName: string,
  params: Record<string, unknown>,
  sql?: string,
): Promise<QueryResult> {
  const request: QueryRequest = { page, query: queryName, params };
  if (sql !== undefined) {
    request.sql = sql;
  }
  return fetchJson<QueryResult>('/_api/v1/sources/query', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List all available data sources.
 */
export async function fetchSources(): Promise<SourceInfo[]> {
  return fetchJson<SourceInfo[]>('/_api/v1/sources');
}

/**
 * Get information about a specific data source.
 */
export async function fetchSource(name: string): Promise<SourceInfo> {
  return fetchJson<SourceInfo>(`/_api/v1/sources/${encodeURIComponent(name)}`);
}

/**
 * Get the auto-generated menu from pages.
 */
export async function fetchMenu(): Promise<MenuItem[]> {
  return fetchJson<MenuItem[]>('/_api/v1/pages/menu');
}

/**
 * Get the documentation pages menu.
 */
export async function fetchDocsMenu(): Promise<MenuItem[]> {
  return fetchJson<MenuItem[]>('/_api/v1/pages/docs-menu');
}

/**
 * Get frontend settings (docs visibility, dev mode, etc.).
 */
export async function fetchSettings(): Promise<Settings> {
  return fetchJson<Settings>('/_api/v1/pages/settings');
}

/**
 * Page response with content and frontmatter.
 */
export interface PageResponse {
  content: string;
  frontmatter: {
    title?: string;
    [key: string]: unknown;
  };
}

/**
 * Fetch a markdown page with frontmatter.
 */
export async function fetchPage(path: string): Promise<PageResponse> {
  // Normalize path
  let pagePath = path;
  if (pagePath.startsWith('/')) {
    pagePath = pagePath.slice(1);
  }
  if (!pagePath) {
    pagePath = 'index';
  }

  return fetchJson<PageResponse>(`/_api/v1/pages/page/${pagePath}`);
}
