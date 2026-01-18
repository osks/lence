/**
 * Lence - Main application entry point.
 */

import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { initRouter, getRouter } from './router.js';
import './components/layout/layout.js';
import './components/page/page.js';
import './components/chart/echarts-chart.js';
import './components/table/simple-table.js';
import './components/grid-table/grid-table.js';
import './components/data-table/data-table.js';
import './components/gantt/echarts-gantt.js';

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
    return html`
      <lence-layout>
        <lence-page .path=${this.currentPath}></lence-page>
      </lence-layout>
    `;
  }
}

customElements.define('lence-app', LenceApp);

// Log startup
console.log('Lence initialized');
