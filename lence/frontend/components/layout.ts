/**
 * App layout component with sidebar navigation.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { MenuItem } from '../types.js';
import { fetchMenu } from '../api.js';
import { getRouter } from '../router.js';

/**
 * Main application layout with sidebar and content area.
 */
export class LenceLayout extends LitElement {
  static styles = css`
    :host {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 250px;
      background: var(--pico-card-background-color, #fff);
      border-right: 1px solid var(--pico-muted-border-color, #dee2e6);
      padding: 1rem;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .sidebar-header {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      padding: 0 0.75rem;
    }

    .main {
      margin-left: 250px;
      flex: 1;
      padding: 1.5rem;
      min-width: 0;
    }

    nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    nav li {
      margin-bottom: 0.25rem;
    }

    nav a {
      display: block;
      padding: 0.5rem 0.75rem;
      border-radius: 0.25rem;
      text-decoration: none;
      color: var(--pico-color, inherit);
      cursor: pointer;
    }

    nav a:hover {
      background: var(--pico-secondary-background, #f8f9fa);
    }

    nav a.active {
      background: var(--pico-primary-background, #e3f2fd);
      color: var(--pico-primary, #1976d2);
    }

    .nav-group-title {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--pico-muted-color, #6c757d);
      padding: 0.5rem 0.75rem;
      margin-top: 0.75rem;
      text-decoration: none;
      border-radius: 0.25rem;
    }

    a.nav-group-title {
      cursor: pointer;
    }

    a.nav-group-title:hover {
      background: var(--pico-secondary-background, #f8f9fa);
    }

    a.nav-group-title.active {
      background: var(--pico-primary-background, #e3f2fd);
      color: var(--pico-primary, #1976d2);
    }

    .nav-children {
      padding-left: 0.75rem;
    }

    .loading {
      color: var(--pico-muted-color, #6c757d);
      padding: 1rem;
    }

    @media (max-width: 768px) {
      .sidebar {
        display: none;
      }

      .main {
        margin-left: 0;
      }
    }
  `;

  @state()
  private menu: MenuItem[] = [];

  @state()
  private loading = true;

  @state()
  private currentPath = '/';

  private unsubscribeRouter?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.loadMenu();

    // Subscribe to route changes
    const router = getRouter();
    this.currentPath = router.getPath();
    this.unsubscribeRouter = router.onRouteChange((path) => {
      this.currentPath = path;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeRouter) {
      this.unsubscribeRouter();
    }
  }

  private async loadMenu() {
    try {
      this.menu = await fetchMenu();
    } catch (error) {
      console.error('Failed to load menu:', error);
      this.menu = [];
    } finally {
      this.loading = false;
    }
  }

  private handleNavClick(e: Event, path: string) {
    e.preventDefault();
    getRouter().navigate(path);
  }

  private isActive(path: string): boolean {
    return getRouter().isActive(path);
  }

  private isExactActive(path: string): boolean {
    return this.currentPath === path;
  }

  private renderMenuItem(item: MenuItem): unknown {
    if (item.children && item.children.length > 0) {
      // Group with children - title may or may not be clickable
      // Use exact match for section headers to avoid both parent and child being "active"
      const titleContent = item.path
        ? html`<a
            href="${item.path}"
            class="nav-group-title ${this.isExactActive(item.path) ? 'active' : ''}"
            @click=${(e: Event) => this.handleNavClick(e, item.path!)}
          >${item.title}</a>`
        : html`<div class="nav-group-title">${item.title}</div>`;

      return html`
        <li>
          ${titleContent}
          <ul class="nav-children">
            ${item.children.map((child) => this.renderMenuItem(child))}
          </ul>
        </li>
      `;
    }

    // Regular link item
    const path = item.path || '/';
    const isActive = this.isActive(path);

    return html`
      <li>
        <a
          href="${path}"
          class=${isActive ? 'active' : ''}
          @click=${(e: Event) => this.handleNavClick(e, path)}
        >
          ${item.title}
        </a>
      </li>
    `;
  }

  render() {
    return html`
      <aside class="sidebar">
        <div class="sidebar-header">Lence</div>
        <nav>
          ${this.loading
            ? html`<div class="loading">Loading...</div>`
            : html`
                <ul>
                  ${this.menu.map((item) => this.renderMenuItem(item))}
                </ul>
              `}
        </nav>
      </aside>
      <main class="main">
        <slot></slot>
      </main>
    `;
  }
}

customElements.define('lence-layout', LenceLayout);
