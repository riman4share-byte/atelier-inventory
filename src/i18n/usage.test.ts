import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from './en.json';

/**
 * Every translation key that the code asks for must exist in en.json.
 *
 * The parity test (translations.test.ts) only compares English against Arabic,
 * so a key missing from BOTH files slips through and the UI renders the raw
 * key ("common.cancel"). This test closes that gap by scanning the source for
 * literal `t('...')` calls and resolving each one.
 */

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const EN_KEYS = new Set(flattenKeys(en));

describe('translation key usage', () => {
  it('every t("...") key used in the source exists in en.json', () => {
    const files = sourceFiles('src');
    expect(files.length).toBeGreaterThan(10);

    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        const key = match[1];
        if (key && !EN_KEYS.has(key)) missing.push(`${key} (${file})`);
      }
    }

    expect(missing, `missing translation keys:\n${missing.join('\n')}`).toEqual([]);
  });
});
