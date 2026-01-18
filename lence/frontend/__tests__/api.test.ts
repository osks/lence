import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeQuery,
  fetchSources,
  fetchSource,
  fetchMenu,
  fetchPage,
  ApiRequestError,
} from '../api.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeQuery', () => {
    it('should execute a query and return result', async () => {
      const mockResult = {
        columns: [{ name: 'id', type: 'INTEGER' }],
        data: [[1], [2]],
        row_count: 2,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await executeQuery('orders', 'SELECT id FROM orders');

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/sources/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'orders', sql: 'SELECT id FROM orders' }),
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw ApiRequestError on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Unknown source' }),
      });

      await expect(executeQuery('bad', 'SELECT *'))
        .rejects.toThrow(ApiRequestError);
    });

    it('should include error detail in exception', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Query syntax error' }),
      });

      try {
        await executeQuery('orders', 'SELEKT *');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiRequestError);
        expect((e as ApiRequestError).detail).toBe('Query syntax error');
        expect((e as ApiRequestError).status).toBe(400);
      }
    });
  });

  describe('fetchSources', () => {
    it('should return list of sources', async () => {
      const mockSources = [
        { name: 'orders', type: 'csv', description: 'Order data' },
        { name: 'products', type: 'csv', description: 'Product catalog' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSources),
      });

      const sources = await fetchSources();

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/sources', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(sources).toEqual(mockSources);
    });
  });

  describe('fetchSource', () => {
    it('should return a specific source', async () => {
      const mockSource = { name: 'orders', type: 'csv', description: 'Order data' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSource),
      });

      const source = await fetchSource('orders');

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/sources/orders', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(source).toEqual(mockSource);
    });

    it('should encode source name in URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'my source', type: 'csv', description: '' }),
      });

      await fetchSource('my source');

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/sources/my%20source', expect.any(Object));
    });
  });

  describe('fetchMenu', () => {
    it('should return menu structure', async () => {
      const mockMenu = [
        { title: 'Home', path: '/' },
        { title: 'Dashboard', path: '/dashboard' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMenu),
      });

      const menu = await fetchMenu();

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/pages/menu', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(menu).toEqual(mockMenu);
    });
  });

  describe('fetchPage', () => {
    it('should return page content and frontmatter', async () => {
      const mockResponse = {
        content: '# Hello\n\nThis is a test page.',
        frontmatter: { title: 'Hello', showSource: true },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const page = await fetchPage('/dashboard');

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/pages/page/dashboard', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(page.content).toBe(mockResponse.content);
      expect(page.frontmatter.showSource).toBe(true);
    });

    it('should handle root path', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: '# Home', frontmatter: {} }),
      });

      await fetchPage('/');

      expect(mockFetch).toHaveBeenCalledWith('/_api/v1/pages/page/index', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should throw for missing page', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Page not found' }),
      });

      await expect(fetchPage('/nonexistent'))
        .rejects.toThrow(ApiRequestError);
    });
  });
});
