import { describe, expect, it } from 'vitest';
import ar from './ar.json';
import en from './en.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function flattenValues(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenValues(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, String(value)]];
}

describe('translations', () => {
  it('defines the same keys in English and Arabic', () => {
    expect(flattenKeys(ar).sort()).toEqual(flattenKeys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of [...flattenValues(en), ...flattenValues(ar)]) {
      expect(value.trim(), key).not.toBe('');
    }
  });
});
