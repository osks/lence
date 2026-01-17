import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Router, pathToPageName } from '../router.js';

describe('Router', () => {
  let originalHash: string;

  beforeEach(() => {
    originalHash = window.location.hash;
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  describe('getPath', () => {
    it('should return / for empty hash', () => {
      window.location.hash = '';
      const router = new Router();
      expect(router.getPath()).toBe('/');
    });

    it('should return / for # only', () => {
      window.location.hash = '#';
      const router = new Router();
      expect(router.getPath()).toBe('/');
    });

    it('should return path from hash', () => {
      window.location.hash = '#/dashboard';
      const router = new Router();
      expect(router.getPath()).toBe('/dashboard');
    });
  });

  describe('navigate', () => {
    it('should update hash when navigating', () => {
      const router = new Router();
      router.navigate('/dashboard');
      expect(window.location.hash).toBe('#/dashboard');
    });

    it('should not update if already on path', () => {
      window.location.hash = '#/dashboard';
      const router = new Router();
      const originalHash = window.location.hash;
      router.navigate('/dashboard');
      expect(window.location.hash).toBe(originalHash);
    });
  });

  describe('isActive', () => {
    it('should match exact path for root', () => {
      window.location.hash = '';
      const router = new Router();
      expect(router.isActive('/')).toBe(true);
      expect(router.isActive('/dashboard')).toBe(false);
    });

    it('should match exact path', () => {
      window.location.hash = '#/dashboard';
      const router = new Router();
      expect(router.isActive('/dashboard')).toBe(true);
      expect(router.isActive('/reports')).toBe(false);
    });

    it('should match parent paths', () => {
      window.location.hash = '#/reports/sales';
      const router = new Router();
      expect(router.isActive('/reports')).toBe(true);
      expect(router.isActive('/reports/sales')).toBe(true);
      expect(router.isActive('/dashboard')).toBe(false);
    });
  });

  describe('onRouteChange', () => {
    it('should notify handlers on route change', async () => {
      const router = new Router();
      const handler = vi.fn();

      router.onRouteChange(handler);
      router.navigate('/dashboard');

      // Wait for hashchange event
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Handler should be called with new path
      expect(handler).toHaveBeenCalledWith('/dashboard');
    });

    it('should return unsubscribe function', () => {
      const router = new Router();
      const handler = vi.fn();

      const unsubscribe = router.onRouteChange(handler);
      unsubscribe();

      router.navigate('/test');

      // Handler should not be called after unsubscribe
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

describe('pathToPageName', () => {
  it('should return index for root path', () => {
    expect(pathToPageName('/')).toBe('index');
    expect(pathToPageName('')).toBe('index');
  });

  it('should strip leading slash', () => {
    expect(pathToPageName('/dashboard')).toBe('dashboard');
    expect(pathToPageName('/reports/sales')).toBe('reports/sales');
  });

  it('should return path as-is without leading slash', () => {
    expect(pathToPageName('dashboard')).toBe('dashboard');
  });
});
