/**
 * Checkbox component for boolean filtering.
 * Binds to the global inputs store for reactive data filtering.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { inputs } from '../../stores/inputs.js';
import { booleanConverter } from '../../types.js';

/**
 * Checkbox input component that updates the global inputs store.
 */
@customElement('lence-checkbox')
export class LenceCheckbox extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--lence-font-family, system-ui);
      font-size: var(--lence-font-size-sm, 0.875rem);
      margin: 0.75rem 0;
    }

    .checkbox-wrapper {
      display: inline-flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .title {
      font-size: var(--lence-font-size-xs, 0.75rem);
      font-weight: 500;
      color: var(--lence-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .checkbox-container {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 2.125rem;
      padding: 0 0.75rem;
      border: 1px solid var(--lence-border, #e5e7eb);
      border-radius: var(--lence-radius, 4px);
      background: var(--lence-bg, #ffffff);
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
    }

    .checkbox-container:hover {
      border-color: var(--lence-border-hover, #d1d5db);
    }

    input[type="checkbox"] {
      width: 0.875rem;
      height: 0.875rem;
      margin: 0;
      cursor: pointer;
      accent-color: var(--lence-primary, #2563eb);
    }

    .label {
      font-size: var(--lence-font-size-sm, 0.875rem);
      color: var(--lence-text, #374151);
      cursor: pointer;
    }
  `;

  /**
   * Input name for binding (required).
   */
  @property({ type: String })
  name = '';

  /**
   * Title displayed above the checkbox (like dropdown's title).
   */
  @property({ type: String })
  title = '';

  /**
   * Label text displayed next to the checkbox.
   */
  @property({ type: String })
  label = '';

  /**
   * Initial/default checked state.
   */
  @property({ converter: booleanConverter })
  defaultValue = false;

  @state()
  private checked = false;

  @state()
  private initialized = false;

  connectedCallback() {
    super.connectedCallback();

    // Initialize on connect
    if (!this.initialized) {
      this.initialized = true;
      this.checked = this.defaultValue;
      inputs.set(this.name, this.checked ? 'true' : 'false', this.checked ? 'Yes' : 'No');
    }
  }

  private handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.checked = input.checked;
    inputs.set(this.name, this.checked ? 'true' : 'false', this.checked ? 'Yes' : 'No');
  }

  render() {
    const id = `checkbox-${this.name}`;

    return html`
      <div class="checkbox-wrapper">
        ${this.title ? html`<span class="title">${this.title}</span>` : null}
        <label class="checkbox-container" for=${id}>
          <input
            type="checkbox"
            id=${id}
            .checked=${this.checked}
            @change=${this.handleChange}
          />
          <span class="label">${this.label}</span>
        </label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lence-checkbox': LenceCheckbox;
  }
}
