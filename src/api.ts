/**
 * API client for Lence backend.
 */

import type { QueryResult, SourceInfo, MenuItem, QueryRequest, ApiError } from './types.js';

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
 * Execute a SQL query against a data source.
 */
export async function executeQuery(
  source: string,
  sql: string,
): Promise<QueryResult> {
  const request: QueryRequest = { source, sql };
  return fetchJson<QueryResult>('/api/query', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List all available data sources.
 */
export async function fetchSources(): Promise<SourceInfo[]> {
  return fetchJson<SourceInfo[]>('/api/sources');
}

/**
 * Get information about a specific data source.
 */
export async function fetchSource(name: string): Promise<SourceInfo> {
  return fetchJson<SourceInfo>(`/api/sources/${encodeURIComponent(name)}`);
}

/**
 * Get the sidebar menu configuration.
 */
export async function fetchMenu(): Promise<MenuItem[]> {
  return fetchJson<MenuItem[]>('/api/config/menu');
}

/**
 * Fetch a markdown page's raw content.
 */
export async function fetchPage(path: string): Promise<string> {
  // Normalize path
  let pagePath = path;
  if (pagePath.startsWith('/')) {
    pagePath = pagePath.slice(1);
  }
  if (!pagePath) {
    pagePath = 'index';
  }

  const response = await fetch(`${API_BASE}/pages/${pagePath}.md`);

  if (!response.ok) {
    throw new ApiRequestError(
      `Page not found: ${path}`,
      response.status,
    );
  }

  return response.text();
}
