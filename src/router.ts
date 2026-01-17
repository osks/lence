/**
 * Simple client-side router for Lence.
 * Uses hash-based routing for simplicity (no server config needed).
 */

export type RouteChangeHandler = (path: string) => void;

/**
 * Router class for managing client-side navigation.
 */
export class Router {
  private handlers: Set<RouteChangeHandler> = new Set();
  private currentPath: string = '/';

  constructor() {
    // Initialize from current hash
    this.currentPath = this.getPathFromHash();

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });
  }

  /**
   * Get the current path from the URL hash.
   */
  private getPathFromHash(): string {
    const hash = window.location.hash;
    if (!hash || hash === '#') {
      return '/';
    }
    // Remove the leading #
    return hash.slice(1) || '/';
  }

  /**
   * Handle route changes and notify handlers.
   */
  private handleRouteChange(): void {
    const newPath = this.getPathFromHash();
    if (newPath !== this.currentPath) {
      this.currentPath = newPath;
      this.notifyHandlers();
    }
  }

  /**
   * Notify all registered handlers of route change.
   */
  private notifyHandlers(): void {
    for (const handler of this.handlers) {
      handler(this.currentPath);
    }
  }

  /**
   * Get the current path.
   */
  getPath(): string {
    return this.currentPath;
  }

  /**
   * Navigate to a new path.
   */
  navigate(path: string): void {
    if (path !== this.currentPath) {
      window.location.hash = path;
      // hashchange event will trigger handleRouteChange
    }
  }

  /**
   * Register a handler for route changes.
   * Returns an unsubscribe function.
   */
  onRouteChange(handler: RouteChangeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Check if a path matches the current path.
   */
  isActive(path: string): boolean {
    if (path === '/') {
      return this.currentPath === '/';
    }
    return this.currentPath === path || this.currentPath.startsWith(path + '/');
  }
}

/**
 * Parse path to get page name for fetching.
 * "/dashboard" -> "dashboard"
 * "/" -> "index"
 * "/reports/sales" -> "reports/sales"
 */
export function pathToPageName(path: string): string {
  if (path === '/' || path === '') {
    return 'index';
  }
  // Remove leading slash
  return path.startsWith('/') ? path.slice(1) : path;
}

/**
 * Global router instance.
 */
let _router: Router | null = null;

export function getRouter(): Router {
  if (!_router) {
    _router = new Router();
  }
  return _router;
}

export function initRouter(): Router {
  return getRouter();
}
