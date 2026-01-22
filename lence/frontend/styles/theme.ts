/**
 * Shared theme styles with CSS variable defaults.
 * Import this as the first style in each component's static styles array.
 */

import { css } from 'lit';

/**
 * Default values for all Lence CSS variables.
 * These are set on :host so they're available within each component's shadow DOM.
 * Users can override by setting these variables on parent elements.
 */
export const themeDefaults = css`
  :host {
    /* Typography */
    --lence-font-family: system-ui;
    --lence-font-mono: ui-monospace, monospace;
    --lence-font-size-xs: 0.75rem;
    --lence-font-size-sm: 0.875rem;
    --lence-font-size-base: 1rem;
    --lence-font-size-lg: 1.125rem;
    --lence-font-size-xl: 1.375rem;

    /* Colors - Background */
    --lence-bg: #ffffff;
    --lence-bg-subtle: #f9fafb;
    --lence-bg-muted: #f3f4f6;

    /* Colors - Text */
    --lence-text: #374151;
    --lence-text-muted: #6b7280;
    --lence-text-heading: #111827;

    /* Colors - Border */
    --lence-border: #e5e7eb;
    --lence-border-hover: #d1d5db;
    --lence-border-strong: #d1d5db;

    /* Colors - Primary (actions, links, active states) */
    --lence-primary: #236aa4;
    --lence-primary-bg: rgba(35, 106, 164, 0.1);

    /* Colors - Semantic */
    --lence-negative: #dc2626;
    --lence-negative-bg: #fef2f2;

    /* Sizing */
    --lence-radius: 4px;
    --lence-chart-height: 300px;
  }
`;
