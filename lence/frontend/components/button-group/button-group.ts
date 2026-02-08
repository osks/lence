/**
 * Button group component for single-select filtering.
 * Displays options as horizontal buttons instead of a dropdown.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { inputs } from '../../stores/inputs.js';
import type { QueryResult } from '../../types.js';
import { themeDefaults } from '../../styles/theme.js';

interface ButtonOption {
  value: string;
  label: string;
}

/**
 * Button group input component that updates the global inputs store.
 */
@customElement('lence-button-group')
export class LenceButtonGroup extends LitElement {
  static styles = [
    themeDefaults,
    css`
      :host {
        display: block;
        font-family: var(--lence-font-family);
        font-size: var(--lence-font-size-sm);
        margin: 0.75rem 0;
      }

      .button-group-container {
        display: inline-flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      label {
        font-size: var(--lence-font-size-xs);
        font-weight: 500;
        color: var(--lence-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .buttons {
        display: inline-flex;
        flex-wrap: wrap;
      }

      button {
        height: var(--lence-control-height);
        padding: 0 0.75rem;
        font-size: var(--lence-font-size-sm);
        font-family: inherit;
        border: 1px solid var(--lence-border);
        background: var(--lence-bg);
        color: var(--lence-text);
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s, color 0.15s;
      }

      /* First button gets left rounded corners */
      button:first-child {
        border-radius: var(--lence-radius) 0 0 var(--lence-radius);
      }

      /* Last button gets right rounded corners */
      button:last-child {
        border-radius: 0 var(--lence-radius) var(--lence-radius) 0;
      }

      /* Only child gets all rounded corners */
      button:only-child {
        border-radius: var(--lence-radius);
      }

      /* Adjacent buttons share borders */
      button:not(:first-child) {
        margin-left: -1px;
      }

      button:hover {
        background: var(--lence-bg-subtle);
        border-color: var(--lence-border-hover);
        z-index: 1;
      }

      button:focus {
        outline: none;
        border-color: var(--lence-primary);
        box-shadow: 0 0 0 2px var(--lence-primary-bg);
        z-index: 2;
      }

      button.active {
        background: var(--lence-primary-bg);
        border-color: var(--lence-border);
        color: var(--lence-primary);
        font-weight: 500;
        z-index: 1;
      }

      button.active:hover {
        background: var(--lence-primary-bg);
        border-color: var(--lence-border);
      }

      .loading {
        color: var(--lence-text-muted);
        font-style: italic;
      }
    `,
  ];

  /**
   * Input name for binding (required).
   */
  @property({ type: String })
  name = '';

  /**
   * Query name to load options from.
   */
  @property({ type: String })
  data?: string;

  /**
   * Column name for option values.
   */
  @property({ type: String })
  value?: string;

  /**
   * Column name for option labels (defaults to value column).
   */
  @property({ type: String })
  label?: string;

  /**
   * Title/label above the button group.
   */
  @property({ type: String })
  title?: string;

  /**
   * Initial/default value.
   */
  @property({ type: String })
  defaultValue?: string;

  /**
   * Query result data (set by page component).
   */
  @property({ attribute: false })
  queryData?: QueryResult;

  @state()
  private options: ButtonOption[] = [];

  @state()
  private selectedValue: string | null = null;

  @state()
  private initialized = false;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('queryData') && this.queryData) {
      this.options = this.extractOptions(this.queryData);
    }

    // Initialize value on first data load
    if (!this.initialized && this.options.length > 0) {
      this.initialized = true;
      if (this.defaultValue !== undefined) {
        this.selectedValue = this.defaultValue;
        const option = this.options.find((o) => o.value === this.defaultValue);
        inputs.set(this.name, this.defaultValue, option?.label ?? this.defaultValue);
      } else {
        // Default to first option
        const first = this.options[0];
        this.selectedValue = first.value;
        inputs.set(this.name, first.value, first.label);
      }
    }
  }

  private extractOptions(data: QueryResult): ButtonOption[] {
    const valueColumn = this.value;
    const labelColumn = this.label ?? this.value;

    if (!valueColumn) {
      // Use first column if no value specified
      if (data.columns.length === 0) return [];
      const firstCol = data.columns[0].name;
      return this.extractColumnValues(data, firstCol, firstCol);
    }

    return this.extractColumnValues(data, valueColumn, labelColumn ?? valueColumn);
  }

  private extractColumnValues(
    data: QueryResult,
    valueCol: string,
    labelCol: string
  ): ButtonOption[] {
    const valueIndex = data.columns.findIndex((c) => c.name === valueCol);
    const labelIndex = data.columns.findIndex((c) => c.name === labelCol);

    if (valueIndex === -1) return [];

    const seen = new Set<string>();
    const options: ButtonOption[] = [];

    for (const row of data.data) {
      const value = row[valueIndex];
      if (value === null || value === undefined) continue;

      const strValue = String(value);
      if (seen.has(strValue)) continue;
      seen.add(strValue);

      const label = labelIndex !== -1 ? String(row[labelIndex] ?? strValue) : strValue;
      options.push({ value: strValue, label });
    }

    return options;
  }

  private handleClick(option: ButtonOption) {
    this.selectedValue = option.value;
    inputs.set(this.name, option.value, option.label);
  }

  render() {
    const showLoading = this.data && !this.queryData;

    return html`
      <div class="button-group-container">
        ${this.title ? html`<label>${this.title}</label>` : null}
        ${showLoading
          ? html`<span class="loading">Loading...</span>`
          : html`
              <div class="buttons">
                ${this.options.map(
                  (opt) => html`
                    <button
                      class=${opt.value === this.selectedValue ? 'active' : ''}
                      @click=${() => this.handleClick(opt)}
                    >
                      ${opt.label}
                    </button>
                  `
                )}
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-button-group': LenceButtonGroup;
  }
}
