/**
 * App layout component with sidebar navigation.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { MenuItem, Settings } from '../../types.js';
import { fetchMenu, fetchSettings } from '../../api.js';
import { getRouter } from '../../router.js';
import { themeDefaults } from '../../styles/theme.js';

/**
 * Main application layout with sidebar and content area.
 */
export class LenceLayout extends LitElement {
  static styles = [
    themeDefaults,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        font-family: var(--lence-font-family);
      }

      .header {
        display: flex;
        padding: 0 3rem;
        border-bottom: 1px solid var(--lence-border);
        background: var(--lence-bg);
      }

      .header-left {
        width: 220px;
        flex-shrink: 0;
        padding: 0.5rem 0.75rem;
        box-sizing: border-box;
      }

      .header-title {
        font-size: var(--lence-font-size-base);
        font-weight: 600;
        color: var(--lence-text-heading);
      }

      .header-main {
        flex: 1;
        padding: 0.5rem 2rem;
      }

      .header-right {
        width: 220px;
        flex-shrink: 0;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 0.5rem 0;
      }

      .docs-link {
        display: block;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--lence-border);
        color: var(--lence-text-muted);
        font-size: var(--lence-font-size-sm);
        text-decoration: none;
      }

      .docs-link:hover {
        color: var(--lence-text);
      }

      .body {
        display: flex;
        flex: 1;
        padding: 0 3rem;
      }

      .sidebar {
        width: 220px;
        flex-shrink: 0;
        background: var(--lence-bg);
        padding: 0.75rem;
        position: sticky;
        top: 0;
        height: calc(100vh - 3rem);
        overflow-y: auto;
        box-sizing: border-box;
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
        border-radius: var(--lence-radius);
        text-decoration: none;
        color: var(--lence-text);
        font-size: var(--lence-font-size-sm);
        cursor: pointer;
      }

      nav a:hover {
        text-decoration: underline;
      }

      nav a.active {
        background: var(--lence-primary-bg);
        color: var(--lence-primary);
        font-weight: 500;
      }

      .nav-group-title {
        display: block;
        font-weight: 500;
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
        padding: 0.3rem 0.5rem;
        margin-top: 0.625rem;
        text-decoration: none;
        border-radius: var(--lence-radius);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      a.nav-group-title {
        cursor: pointer;
      }

      a.nav-group-title:hover {
        background: var(--lence-bg-muted);
      }

      a.nav-group-title.active {
        background: var(--lence-primary-bg);
        color: var(--lence-primary);
      }

      .nav-children {
        padding-left: 0.5rem;
      }

      .loading {
        color: var(--lence-text-muted);
        padding: 0.75rem;
        font-size: var(--lence-font-size-sm);
      }

      @media (max-width: 768px) {
        .sidebar,
        .sidebar-right {
          display: none;
        }
      }
    `,
  ];

  @state()
  private menu: MenuItem[] = [];

  @state()
  private loading = true;

  @state()
  private currentPath = '/';

  @state()
  private showHelp = false;

  @state()
  private siteTitle = 'Lence';

  private unsubscribeRouter?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.loadMenu();
    this.loadSettings();

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

  private async loadSettings() {
    try {
      const settings = await fetchSettings();
      this.showHelp = settings.showHelp;
      this.siteTitle = settings.title;
    } catch (error) {
      console.error('Failed to load settings:', error);
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
      <header class="header">
        <div class="header-left">
          <span class="header-title">${this.siteTitle}</span>
        </div>
        <div class="header-main"></div>
        <div class="header-right"></div>
      </header>
      <div class="body">
        <aside class="sidebar">
          <nav>
            ${this.loading
              ? html`<div class="loading">Loading...</div>`
              : html`
                  <ul>
                    ${this.menu.map((item) => this.renderMenuItem(item))}
                  </ul>
                `}
          </nav>
          ${this.showHelp
            ? html`
                <a
                  href="/_docs/"
                  class="docs-link"
                  @click=${(e: Event) => this.handleNavClick(e, '/_docs/')}
                >Docs</a>
              `
            : null}
        </aside>
        <main class="main">
          <slot></slot>
        </main>
        <aside class="sidebar-right"></aside>
      </div>
    `;
  }
}

customElements.define('lence-layout', LenceLayout);
