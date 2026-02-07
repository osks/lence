/**
 * App layout component with sidebar navigation.
 */

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { MenuItem, Settings } from '../../types.js';
import { fetchMenu, fetchSettings, fetchDocsMenu, createPage, deletePage } from '../../api.js';
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

      .edit-mode-badge {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: var(--lence-radius);
        padding: 0.25rem 0.5rem;
        font-size: var(--lence-font-size-xs);
        color: #92400e;
        font-weight: 500;
      }

      .docs-section {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--lence-border);
      }

      .docs-section .nav-group-title {
        margin-top: 0;
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
        display: flex;
        flex-direction: column;
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

      .body.editing .sidebar-right {
        display: none;
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

      .new-page-button {
        display: block;
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.5rem 0.75rem;
        font-size: var(--lence-font-size-sm);
        color: var(--lence-text-muted);
        background: none;
        border: 1px dashed var(--lence-border);
        border-radius: var(--lence-radius);
        cursor: pointer;
        text-align: left;
      }

      .new-page-button:hover {
        color: var(--lence-text);
        border-color: var(--lence-text-muted);
        background: var(--lence-bg-subtle);
      }

      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .dialog {
        background: var(--lence-bg);
        border-radius: var(--lence-radius);
        padding: 1.5rem;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .dialog h3 {
        margin: 0 0 0.5rem 0;
        font-size: var(--lence-font-size-base);
        color: var(--lence-text-heading);
      }

      .dialog p {
        margin: 0 0 1rem 0;
        font-size: var(--lence-font-size-sm);
        color: var(--lence-text-muted);
      }

      .dialog-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        font-size: var(--lence-font-size-sm);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        box-sizing: border-box;
      }

      .dialog-input:focus {
        outline: none;
        border-color: var(--lence-primary);
      }

      .dialog-error {
        margin-top: 0.5rem;
        font-size: var(--lence-font-size-xs);
        color: var(--lence-negative);
      }

      .dialog-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .dialog-button {
        padding: 0.5rem 1rem;
        font-size: var(--lence-font-size-sm);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        cursor: pointer;
        background: var(--lence-bg);
        color: var(--lence-text);
      }

      .dialog-button:hover {
        background: var(--lence-bg-subtle);
      }

      .dialog-button.primary {
        background: var(--lence-primary);
        border-color: var(--lence-primary);
        color: white;
      }

      .dialog-button.primary:hover {
        opacity: 0.9;
      }

      .dialog-button.danger {
        background: var(--lence-negative);
        border-color: var(--lence-negative);
        color: white;
      }

      .dialog-button.danger:hover {
        opacity: 0.9;
      }

      .nav-item {
        position: relative;
        display: flex;
        align-items: center;
      }

      .nav-item a {
        flex: 1;
        min-width: 0;
      }

      .nav-item-menu {
        position: absolute;
        right: 0.25rem;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        padding: 0.1rem 0.3rem;
        font-size: var(--lence-font-size-sm);
        color: var(--lence-text-muted);
        background: none;
        border: none;
        border-radius: var(--lence-radius);
        cursor: pointer;
        line-height: 1;
      }

      .nav-item:hover .nav-item-menu {
        opacity: 0.6;
      }

      .nav-item-menu:hover {
        opacity: 1;
        color: var(--lence-text);
      }

      .nav-dropdown-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
      }

      .nav-dropdown {
        position: absolute;
        right: 0;
        top: 100%;
        margin-top: 0.25rem;
        background: var(--lence-bg);
        border: 1px solid var(--lence-border);
        border-radius: var(--lence-radius);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        min-width: 100px;
        z-index: 100;
      }

      .nav-dropdown-item {
        display: block;
        width: 100%;
        padding: 0.5rem 0.75rem;
        font-size: var(--lence-font-size-sm);
        text-align: left;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--lence-text);
      }

      .nav-dropdown-item:hover {
        background: var(--lence-bg-subtle);
      }

      .nav-dropdown-item.danger {
        color: var(--lence-negative);
      }

      .nav-dropdown-item.danger:hover {
        background: var(--lence-negative-bg);
      }

      .version {
        margin-top: auto;
        padding: 0.75rem;
        font-size: var(--lence-font-size-xs);
        color: var(--lence-text-muted);
      }

      .version a {
        color: inherit;
        text-decoration: none;
      }

      .version a:hover {
        text-decoration: underline;
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
  private docsMenu: MenuItem[] = [];

  @state()
  private siteTitle = 'Lence';

  @state()
  private version = '';

  @state()
  private editMode = false;

  @state()
  private editing = false;

  @state()
  private showNewPageDialog = false;

  @state()
  private newPagePath = '';

  @state()
  private newPageError = '';

  @state()
  private showDeleteDialog = false;

  @state()
  private deleting = false;

  @state()
  private deleteTargetPath = '';

  @state()
  private menuOpenPath: string | null = null;

  private unsubscribeRouter?: () => void;
  private boundEditingHandler = this.handleEditingChange.bind(this);

  connectedCallback() {
    super.connectedCallback();
    this.loadMenu();
    this.loadSettings();

    // Subscribe to route changes
    const router = getRouter();
    this.currentPath = router.getPath();
    this.unsubscribeRouter = router.onRouteChange((path) => {
      this.currentPath = path;
      // Exit editing when navigating
      this.editing = false;
    });

    // Listen for editing state changes from page component
    this.addEventListener('lence-editing-change', this.boundEditingHandler as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeRouter) {
      this.unsubscribeRouter();
    }
    this.removeEventListener('lence-editing-change', this.boundEditingHandler as EventListener);
  }

  private handleEditingChange(e: CustomEvent<{ editing: boolean }>) {
    this.editing = e.detail.editing;
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
      this.editMode = settings.editMode;
      this.version = settings.version;

      // Load docs menu if help is shown
      if (this.showHelp) {
        this.docsMenu = await fetchDocsMenu();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private handleNavClick(e: Event, path: string) {
    // Allow Cmd+click, Ctrl+click, Shift+click, middle-click to work normally
    const mouseEvent = e as MouseEvent;
    if (mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.button === 1) {
      return;
    }
    e.preventDefault();
    getRouter().navigate(path);
  }

  private isActive(path: string): boolean {
    return getRouter().isActive(path);
  }

  private isExactActive(path: string): boolean {
    return this.currentPath === path;
  }

  private openNewPageDialog() {
    this.showNewPageDialog = true;
    this.newPagePath = '';
    this.newPageError = '';
  }

  private closeNewPageDialog() {
    this.showNewPageDialog = false;
    this.newPagePath = '';
    this.newPageError = '';
  }

  private handleNewPageInput(e: Event) {
    this.newPagePath = (e.target as HTMLInputElement).value;
    this.newPageError = '';
  }

  private async handleCreatePage() {
    const path = this.newPagePath.trim();
    if (!path) {
      this.newPageError = 'Please enter a page path';
      return;
    }

    // Basic validation
    if (!/^[\w\-/]+$/.test(path)) {
      this.newPageError = 'Invalid path (use letters, numbers, dashes, underscores)';
      return;
    }

    try {
      const title = path.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'New Page';
      const content = `---\ntitle: ${title}\n---\n\n# ${title}\n\nContent goes here.\n`;
      await createPage(path, content);
      this.closeNewPageDialog();
      // Refresh menu and navigate to new page
      await this.loadMenu();
      getRouter().navigate('/' + path);
    } catch (err) {
      const error = err as Error;
      this.newPageError = error.message || 'Failed to create page';
    }
  }

  private handleDialogKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.handleCreatePage();
    } else if (e.key === 'Escape') {
      this.closeNewPageDialog();
    }
  }

  private openNavMenu(e: Event, path: string) {
    e.stopPropagation();
    this.menuOpenPath = path;
  }

  private closeNavMenu() {
    this.menuOpenPath = null;
  }

  private handleEditFromMenu(path: string) {
    this.closeNavMenu();
    getRouter().navigate(path);
    // Dispatch event to trigger edit mode on the page
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('lence-request-edit', {
        bubbles: true,
        composed: true,
      }));
    }, 100);
  }

  private openDeleteDialog(path: string) {
    this.closeNavMenu();
    this.deleteTargetPath = path;
    this.showDeleteDialog = true;
  }

  private closeDeleteDialog() {
    this.showDeleteDialog = false;
    this.deleteTargetPath = '';
  }

  private async handleDeletePage() {
    if (this.deleting) return;

    this.deleting = true;
    try {
      // Convert path to page name
      let pagePath = this.deleteTargetPath;
      if (pagePath.startsWith('/')) {
        pagePath = pagePath.slice(1);
      }
      if (!pagePath) {
        pagePath = 'index';
      }
      await deletePage(pagePath);
      this.closeDeleteDialog();
      // Refresh menu and navigate to home if we deleted current page
      await this.loadMenu();
      if (this.currentPath === this.deleteTargetPath || this.deleteTargetPath === '') {
        getRouter().navigate('/');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      this.closeDeleteDialog();
    } finally {
      this.deleting = false;
    }
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
    const isMenuOpen = this.menuOpenPath === path;

    return html`
      <li class="nav-item">
        <a
          href="${path}"
          class=${isActive ? 'active' : ''}
          @click=${(e: Event) => this.handleNavClick(e, path)}
        >
          ${item.title}
        </a>
        ${this.editMode
          ? html`
              <button
                class="nav-item-menu"
                @click=${(e: Event) => this.openNavMenu(e, path)}
              >⋯</button>
              ${isMenuOpen
                ? html`
                    <div class="nav-dropdown-backdrop" @click=${this.closeNavMenu}></div>
                    <div class="nav-dropdown">
                      <button class="nav-dropdown-item" @click=${() => this.handleEditFromMenu(path)}>Edit</button>
                      <button class="nav-dropdown-item danger" @click=${() => this.openDeleteDialog(path)}>Delete</button>
                    </div>
                  `
                : null}
            `
          : null}
      </li>
    `;
  }

  render() {
    return html`
      <header class="header">
        <div class="header-left">
          <span class="header-title">${this.siteTitle}</span>
        </div>
        <div class="header-main">
          ${this.editMode ? html`<span class="edit-mode-badge">Edit Mode</span>` : null}
        </div>
        <div class="header-right"></div>
      </header>
      <div class="body ${this.editing ? 'editing' : ''}">
        <aside class="sidebar">
          <nav>
            ${this.loading
              ? html`<div class="loading">Loading...</div>`
              : html`
                  <ul>
                    ${this.menu.map((item) => this.renderMenuItem(item))}
                  </ul>
                  ${this.editMode
                    ? html`<button class="new-page-button" @click=${this.openNewPageDialog}>+ New Page</button>`
                    : null}
                `}
          </nav>
          ${this.showHelp
            ? html`
                <nav class="docs-section">
                  <a
                    href="/_docs/"
                    class="nav-group-title ${this.isExactActive('/_docs/') ? 'active' : ''}"
                    @click=${(e: Event) => this.handleNavClick(e, '/_docs/')}
                  >Docs</a>
                  <ul class="nav-children">
                    ${this.docsMenu.map((item) => this.renderMenuItem(item))}
                  </ul>
                </nav>
              `
            : null}
          ${this.version
            ? html`<div class="version"><a href="https://github.com/osks/lence" target="_blank">Lence</a> ${this.version}</div>`
            : null}
        </aside>
        <main class="main">
          <slot></slot>
        </main>
        <aside class="sidebar-right"></aside>
      </div>
      ${this.showNewPageDialog
        ? html`
            <div class="dialog-overlay" @click=${this.closeNewPageDialog}>
              <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
                <h3>Create New Page</h3>
                <input
                  type="text"
                  class="dialog-input"
                  placeholder="path/to/page"
                  .value=${this.newPagePath}
                  @input=${this.handleNewPageInput}
                  @keydown=${this.handleDialogKeydown}
                  autofocus
                />
                ${this.newPageError
                  ? html`<div class="dialog-error">${this.newPageError}</div>`
                  : null}
                <div class="dialog-buttons">
                  <button class="dialog-button" @click=${this.closeNewPageDialog}>Cancel</button>
                  <button class="dialog-button primary" @click=${this.handleCreatePage}>Create</button>
                </div>
              </div>
            </div>
          `
        : null}
      ${this.showDeleteDialog
        ? html`
            <div class="dialog-overlay" @click=${this.closeDeleteDialog}>
              <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
                <h3>Delete Page</h3>
                <p>Are you sure you want to delete this page? This cannot be undone.</p>
                <div class="dialog-buttons">
                  <button class="dialog-button" @click=${this.closeDeleteDialog}>Cancel</button>
                  <button
                    class="dialog-button danger"
                    @click=${this.handleDeletePage}
                    ?disabled=${this.deleting}
                  >
                    ${this.deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          `
        : null}
    `;
  }
}

customElements.define('lence-layout', LenceLayout);
