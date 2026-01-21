/**
 * Dropdown component for filtering queries.
 * Binds to the global inputs store for reactive data filtering.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { inputs } from '../../stores/inputs.js';
import { booleanConverter, type QueryResult } from '../../types.js';

interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Dropdown input component that updates the global inputs store.
 */
@customElement('lence-dropdown')
export class LenceDropdown extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--lence-font-family, system-ui);
      font-size: var(--lence-font-size-sm, 0.875rem);
      margin: 0.75rem 0;
    }

    .dropdown-container {
      display: inline-flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      font-size: var(--lence-font-size-xs, 0.75rem);
      font-weight: 500;
      color: var(--lence-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    select {
      height: 2.125rem;
      padding: 0 2rem 0 0.75rem;
      font-size: var(--lence-font-size-sm, 0.875rem);
      font-family: inherit;
      border: 1px solid var(--lence-border, #e5e7eb);
      border-radius: var(--lence-radius, 4px);
      background: var(--lence-bg, #ffffff);
      color: var(--lence-text, #374151);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      min-width: 150px;
    }

    select:hover {
      border-color: var(--lence-border-hover, #d1d5db);
    }

    select:focus {
      outline: none;
      border-color: var(--lence-primary, #2563eb);
      box-shadow: 0 0 0 2px var(--lence-primary-bg, rgba(37, 99, 235, 0.1));
    }

    select:disabled {
      background: var(--lence-bg-subtle, #f9fafb);
      color: var(--lence-text-muted, #6b7280);
      cursor: not-allowed;
    }

    .loading {
      color: var(--lence-text-muted, #6b7280);
      font-style: italic;
    }
  `;

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
   * Title/label above the dropdown.
   */
  @property({ type: String })
  title?: string;

  /**
   * Initial/default value.
   */
  @property({ type: String })
  defaultValue?: string;

  /**
   * Placeholder text for "All" option.
   */
  @property({ type: String })
  placeholder = 'All';

  /**
   * Disable the "All" option (value="%").
   */
  @property({ converter: booleanConverter })
  disableSelectAll = false;

  /**
   * Query result data (set by page component).
   */
  @property({ attribute: false })
  queryData?: QueryResult;

  @state()
  private options: DropdownOption[] = [];

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
      } else if (!this.disableSelectAll) {
        // Default to "All" (wildcard)
        this.selectedValue = '%';
        inputs.set(this.name, '%', this.placeholder);
      } else {
        // No default, pick first option
        const first = this.options[0];
        this.selectedValue = first.value;
        inputs.set(this.name, first.value, first.label);
      }
    }
  }

  private extractOptions(data: QueryResult): DropdownOption[] {
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
  ): DropdownOption[] {
    const valueIndex = data.columns.findIndex((c) => c.name === valueCol);
    const labelIndex = data.columns.findIndex((c) => c.name === labelCol);

    if (valueIndex === -1) return [];

    const seen = new Set<string>();
    const options: DropdownOption[] = [];

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

  private handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value || null;
    this.selectedValue = value;

    const option = value ? this.options.find((o) => o.value === value) : null;
    inputs.set(this.name, value, option?.label ?? null);
  }

  render() {
    const showLoading = this.data && !this.queryData;
    const selected = this.selectedValue ?? '%';

    return html`
      <div class="dropdown-container">
        ${this.title ? html`<label>${this.title}</label>` : null}
        ${showLoading
          ? html`<span class="loading">Loading...</span>`
          : html`
              <select @change=${this.handleChange}>
                ${!this.disableSelectAll
                  ? html`<option value="%" ?selected=${selected === '%'}>${this.placeholder}</option>`
                  : null}
                ${this.options.map(
                  (opt) => html`
                    <option value=${opt.value} ?selected=${opt.value === selected}>${opt.label}</option>
                  `
                )}
              </select>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-dropdown': LenceDropdown;
  }
}
