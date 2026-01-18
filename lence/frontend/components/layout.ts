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
      font-family: var(--lence-font-family, system-ui);
    }

    .sidebar {
      width: 250px;
      background: var(--lence-bg, #fff);
      border-right: 1px solid var(--lence-border, #e5e7eb);
      padding: 1rem;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .sidebar-header {
      font-size: var(--lence-font-size-xl, 1.25rem);
      font-weight: 600;
      color: var(--lence-text-heading, #060606);
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
      margin-bottom: 0.125rem;
    }

    nav a {
      display: block;
      padding: 0.5rem 0.75rem;
      border-radius: var(--lence-radius, 8px);
      text-decoration: none;
      color: var(--lence-text, #2c2c2c);
      font-size: var(--lence-font-size-sm, 0.875rem);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    nav a:hover {
      background: var(--lence-bg-muted, #f3f4f6);
    }

    nav a.active {
      background: var(--lence-primary-bg, #eff6ff);
      color: var(--lence-primary, #1d4ed8);
      font-weight: 500;
    }

    .nav-group-title {
      display: block;
      font-weight: 600;
      font-size: var(--lence-font-size-xs, 0.75rem);
      color: var(--lence-text-muted, #6b7280);
      padding: 0.5rem 0.75rem;
      margin-top: 0.75rem;
      text-decoration: none;
      border-radius: var(--lence-radius, 8px);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    a.nav-group-title {
      cursor: pointer;
    }

    a.nav-group-title:hover {
      background: var(--lence-bg-muted, #f3f4f6);
    }

    a.nav-group-title.active {
      background: var(--lence-primary-bg, #eff6ff);
      color: var(--lence-primary, #1d4ed8);
    }

    .nav-children {
      padding-left: 0.75rem;
    }

    .loading {
      color: var(--lence-text-muted, #6b7280);
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
