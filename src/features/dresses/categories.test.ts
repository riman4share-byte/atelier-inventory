import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DRESS_CATEGORIES, CATEGORY_LABELS, CATEGORY_LABELS_AR, categoryLabel } from './categories';

/**
 * The list in the app and the enum in the database have to be the same.
 *
 * When they drift, every insert with the new category fails with Postgres
 * error 22P02 while the interface shows an empty list - a silent failure
 * that only shows up when somebody tries to save a dress.
 *
 * The migration is read and checked, because that is the file where the
 * enum is really defined.
 */
describe('the dress categories', () => {
  it('matches the enum in the migration exactly', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261112120000_dress_category.sql'),
      'utf8',
    );
    const block = /create type public\.dress_category as enum \(([\s\S]*?)\);/.exec(migration);
    expect(block, 'the migration must define the enum').toBeTruthy();
    const fromTheDatabase = (block![1] ?? '')
      .split(',')
      .map((value) => value.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort();
    expect(fromTheDatabase).toEqual([...DRESS_CATEGORIES].sort());
  });

  it('has the atelier five kinds of garment', () => {
    expect([...DRESS_CATEGORIES].sort()).toEqual(
      ['engagement', 'jumpsuit', 'party', 'veil', 'wedding'],
    );
  });

  it('has a label in both languages for every category', () => {
    for (const category of DRESS_CATEGORIES) {
      expect(CATEGORY_LABELS[category], category).toBeTruthy();
      expect(CATEGORY_LABELS_AR[category], category).toBeTruthy();
    }
  });

  it('writes the English label into the exports', () => {
    // Exports are English-only by owner decision (2026-09-09).
    expect(categoryLabel('wedding', false)).toBe('Wedding dress');
    expect(categoryLabel('jumpsuit', false)).toBe('Jumpsuit');
  });

  it('writes the Arabic label into the interface', () => {
    expect(categoryLabel('veil', true)).toBe('طرحة');
  });

  it('says nothing for a dress with no category', () => {
    expect(categoryLabel(null, false)).toBe('');
    expect(categoryLabel(undefined, true)).toBe('');
  });

  it('falls back to the raw value for a category it does not know', () => {
    // A dress saved before the list changed must still be readable.
    expect(categoryLabel('something_new', false)).toBe('something_new');
  });
});
