/**
 * Material categories offered by the app.
 *
 * This list must equal the database enum `material_category` exactly:
 *
 *   'crystal','bead','pearl','fabric','lace','trim','button','zipper','other'
 *
 * A mismatch (the list used to contain "thread", which is not in the enum)
 * makes every insert with that category fail with Postgres error 22P02 while
 * the UI shows an empty list — a silent failure. `categories.test.ts` asserts
 * the two sets are equal.
 */
export const MATERIAL_CATEGORIES = [
  'fabric',
  'lace',
  'trim',
  'bead',
  'crystal',
  'pearl',
  'button',
  'zipper',
  'other',
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
