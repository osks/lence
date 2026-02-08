/**
 * Lence - Main application entry point.
 */

import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { initRouter, getRouter } from './router.js';
import './components/layout/layout.js';
import './components/page/page.js';
import './components/query-editor/query-editor.js';
import './components/chart/echarts-chart.js';
import './components/area-chart/area-chart.js';
import './components/data-table/data-table.js';
import './components/gantt/echarts-gantt.js';
import './components/dropdown/dropdown.js';
import './components/checkbox/checkbox.js';
import './components/button-group/button-group.js';

/**
 * Main application component.
 */
export class LenceApp extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @state()
  private currentPath = '/';

  private unsubscribeRouter?: () => void;

  connectedCallback() {
    super.connectedCallback();

    // Initialize router
    const router = initRouter();
    this.currentPath = router.getPath();

    // Subscribe to route changes
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

  render() {
    // Check if we're viewing a query editor
    const isQueryEditor = this.currentPath.startsWith('/_query/');
    const queryPath = isQueryEditor ? this.currentPath.slice('/_query/'.length) : '';

    return html`
      <lence-layout>
        ${isQueryEditor
          ? html`<lence-query-editor .path=${queryPath}></lence-query-editor>`
          : html`<lence-page .path=${this.currentPath}></lence-page>`}
      </lence-layout>
    `;
  }
}

customElements.define('lence-app', LenceApp);

// Log startup
console.log('Lence initialized');
