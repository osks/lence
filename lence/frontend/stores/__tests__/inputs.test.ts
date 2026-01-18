import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inputs } from '../inputs.js';

describe('InputsStore', () => {
  beforeEach(() => {
    inputs.clear();
  });

  describe('get', () => {
    it('should return null values for unknown input', () => {
      const result = inputs.get('unknown');
      expect(result).toEqual({ value: null, label: null });
    });

    it('should return stored value', () => {
      inputs.set('test', 'value1', 'Label 1');
      const result = inputs.get('test');
      expect(result).toEqual({ value: 'value1', label: 'Label 1' });
    });
  });

  describe('set', () => {
    it('should store value and label', () => {
      inputs.set('test', 'myvalue', 'My Label');
      expect(inputs.get('test')).toEqual({ value: 'myvalue', label: 'My Label' });
    });

    it('should use value as label when label not provided', () => {
      inputs.set('test', 'myvalue');
      expect(inputs.get('test')).toEqual({ value: 'myvalue', label: 'myvalue' });
    });

    it('should handle null value', () => {
      inputs.set('test', null);
      expect(inputs.get('test')).toEqual({ value: null, label: null });
    });
  });

  describe('onChange', () => {
    it('should call handler when value changes', () => {
      const handler = vi.fn();
      inputs.onChange(handler);

      inputs.set('test', 'value1');

      expect(handler).toHaveBeenCalledWith('test');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      inputs.onChange(handler1);
      inputs.onChange(handler2);

      inputs.set('test', 'value1');

      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).toHaveBeenCalledWith('test');
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = inputs.onChange(handler);

      inputs.set('test1', 'value1');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      inputs.set('test2', 'value2');
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('clear', () => {
    it('should remove all stored values', () => {
      inputs.set('test1', 'value1');
      inputs.set('test2', 'value2');

      inputs.clear();

      expect(inputs.get('test1')).toEqual({ value: null, label: null });
      expect(inputs.get('test2')).toEqual({ value: null, label: null });
    });
  });
});
