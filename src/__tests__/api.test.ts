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

      expect(mockFetch).toHaveBeenCalledWith('/api/query', {
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

      expect(mockFetch).toHaveBeenCalledWith('/api/sources', {
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

      expect(mockFetch).toHaveBeenCalledWith('/api/sources/orders', {
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

      expect(mockFetch).toHaveBeenCalledWith('/api/sources/my%20source', expect.any(Object));
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

      expect(mockFetch).toHaveBeenCalledWith('/api/config/menu', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(menu).toEqual(mockMenu);
    });
  });

  describe('fetchPage', () => {
    it('should return markdown content', async () => {
      const mockContent = '# Hello\n\nThis is a test page.';

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const content = await fetchPage('/dashboard');

      expect(mockFetch).toHaveBeenCalledWith('/pages/dashboard.md');
      expect(content).toBe(mockContent);
    });

    it('should handle root path', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('# Home'),
      });

      await fetchPage('/');

      expect(mockFetch).toHaveBeenCalledWith('/pages/index.md');
    });

    it('should throw for missing page', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchPage('/nonexistent'))
        .rejects.toThrow(ApiRequestError);
    });
  });
});
