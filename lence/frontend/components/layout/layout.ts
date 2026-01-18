/**
 * App layout component with sidebar navigation.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { MenuItem } from '../../types.js';
import { fetchMenu } from '../../api.js';
import { getRouter } from '../../router.js';

/**
 * Main application layout with sidebar and content area.
 */
export class LenceLayout extends LitElement {
  static styles = css`
    :host {
      display: flex;
      min-height: 100vh;
      padding: 0 2rem;
      font-family: var(--lence-font-family, system-ui);
    }

    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background: var(--lence-bg, #fff);
      padding: 0.75rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .sidebar-header {
      font-size: var(--lence-font-size-base, 0.9375rem);
      font-weight: 600;
      color: var(--lence-text-heading, #111827);
      margin-bottom: 1rem;
      padding: 0.25rem 0.5rem;
    }

    .main {
      flex: 1;
      padding: 1rem 2rem;
      min-width: 0;
    }

    .sidebar-right {
      width: 220px;
      flex-shrink: 0;
    }

    nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    nav li {
      margin-bottom: 1px;
    }

    nav a {
      display: block;
      padding: 0.3rem 0.5rem;
      border-radius: var(--lence-radius, 4px);
      text-decoration: none;
      color: var(--lence-text, #374151);
      font-size: var(--lence-font-size-sm, 0.8125rem);
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    nav a:hover {
      background: var(--lence-bg-muted, #f3f4f6);
    }

    nav a.active {
      background: var(--lence-primary-bg, #eff6ff);
      color: var(--lence-primary, #2563eb);
      font-weight: 500;
    }

    .nav-group-title {
      display: block;
      font-weight: 500;
      font-size: var(--lence-font-size-xs, 0.6875rem);
      color: var(--lence-text-muted, #6b7280);
      padding: 0.3rem 0.5rem;
      margin-top: 0.625rem;
      text-decoration: none;
      border-radius: var(--lence-radius, 4px);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    a.nav-group-title {
      cursor: pointer;
    }

    a.nav-group-title:hover {
      background: var(--lence-bg-muted, #f3f4f6);
    }

    a.nav-group-title.active {
      background: var(--lence-primary-bg, #eff6ff);
      color: var(--lence-primary, #2563eb);
    }

    .nav-children {
      padding-left: 0.5rem;
    }

    .loading {
      color: var(--lence-text-muted, #6b7280);
      padding: 0.75rem;
      font-size: var(--lence-font-size-sm, 0.8125rem);
    }

    @media (max-width: 768px) {
      .sidebar,
      .sidebar-right {
        display: none;
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
      <aside class="sidebar-right"></aside>
    `;
  }
}

customElements.define('lence-layout', LenceLayout);
