/**
 * Global reactive store for input state.
 * Manages dropdown values and other input bindings across the page.
 */

export interface InputValue {
  value: string | null;
  label: string | null;
}

type ChangeHandler = (name: string) => void;

/**
 * Singleton store for managing input state across components.
 */
class InputsStore {
  private state: Map<string, InputValue> = new Map();
  private handlers: Set<ChangeHandler> = new Set();

  /**
   * Get the current value for an input.
   */
  get(name: string): InputValue {
    return this.state.get(name) ?? { value: null, label: null };
  }

  /**
   * Set a value for an input and notify subscribers.
   */
  set(name: string, value: string | null, label?: string | null): void {
    this.state.set(name, { value, label: label ?? value });
    this.notifyHandlers(name);
  }

  /**
   * Subscribe to input changes.
   * Returns an unsubscribe function.
   */
  onChange(handler: ChangeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Clear all input state. Useful when navigating between pages.
   */
  clear(): void {
    this.state.clear();
  }

  private notifyHandlers(name: string): void {
    for (const handler of this.handlers) {
      handler(name);
    }
  }
}

export const inputs = new InputsStore();
