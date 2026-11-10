import { describe, expect, it } from 'vitest';
import { MATERIAL_CATEGORIES } from './categories';

/**
 * The materials screen offers a fixed list of categories. It must equal the
 * database enum `material_category` exactly:
 *
 *   'crystal','bead','pearl','fabric','lace','trim','button','zipper','other'
 *
 * A mismatch (the list used to contain "thread", which is not in the enum)
 * makes every insert with that category fail with Postgres error 22P02 while
 * the UI shows an empty list — a silent data loss.
 */
const DB_ENUM = [
  'crystal',
  'bead',
  'pearl',
  'fabric',
  'lace',
  'trim',
  'button',
  'zipper',
  'other',
];

describe('material categories', () => {
  it('the UI list matches the database enum exactly', () => {
    expect([...MATERIAL_CATEGORIES].sort()).toEqual([...DB_ENUM].sort());
  });
});
