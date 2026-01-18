import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router, pathToPageName } from '../router.js';

describe('Router', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock history.pushState
    pushStateSpy = vi.spyOn(history, 'pushState').mockImplementation(() => {});
  });

  describe('getPath', () => {
    it('should return current pathname', () => {
      const router = new Router();
      expect(router.getPath()).toBe('/');
    });
  });

  describe('navigate', () => {
    it('should call pushState when navigating', () => {
      const router = new Router();
      router.navigate('/dashboard');
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/dashboard');
    });

    it('should not call pushState if already on path', () => {
      const router = new Router();
      // Already at /
      router.navigate('/');
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should update current path', () => {
      const router = new Router();
      router.navigate('/dashboard');
      expect(router.getPath()).toBe('/dashboard');
    });
  });

  describe('isActive', () => {
    it('should match exact path for root', () => {
      const router = new Router();
      expect(router.isActive('/')).toBe(true);
      expect(router.isActive('/dashboard')).toBe(false);
    });

    it('should match exact path', () => {
      const router = new Router();
      router.navigate('/dashboard');
      expect(router.isActive('/dashboard')).toBe(true);
      expect(router.isActive('/reports')).toBe(false);
    });

    it('should match parent paths', () => {
      const router = new Router();
      router.navigate('/reports/sales');
      expect(router.isActive('/reports')).toBe(true);
      expect(router.isActive('/reports/sales')).toBe(true);
      expect(router.isActive('/dashboard')).toBe(false);
    });
  });

  describe('onRouteChange', () => {
    it('should notify handlers on navigate', () => {
      const router = new Router();
      const handler = vi.fn();

      router.onRouteChange(handler);
      router.navigate('/dashboard');

      expect(handler).toHaveBeenCalledWith('/dashboard');
    });

    it('should return unsubscribe function', () => {
      const router = new Router();
      const handler = vi.fn();

      const unsubscribe = router.onRouteChange(handler);
      unsubscribe();

      router.navigate('/test');

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
