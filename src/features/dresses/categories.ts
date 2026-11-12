/**
 * The dress categories.
 *
 * These are the atelier's own kinds of garment: a wedding dress, a party
 * dress, an engagement dress, a veil, or a jumpsuit.
 *
 * This list must equal the database enum `dress_category` exactly. A
 * mismatch makes every insert with that category fail with Postgres error
 * 22P02 while the UI shows an empty list - a silent failure.
 * `categories.test.ts` asserts the two sets are equal.
 */
export const DRESS_CATEGORIES = [
  'wedding',
  'party',
  'engagement',
  'veil',
  'jumpsuit',
] as const;

export type DressCategory = (typeof DRESS_CATEGORIES)[number];

/** The English name of each category, for the exports and the catalogue. */
export const CATEGORY_LABELS: Record<DressCategory, string> = {
  wedding: 'Wedding dress',
  party: 'Party dress',
  engagement: 'Engagement dress',
  veil: 'Veil',
  jumpsuit: 'Jumpsuit',
};

/**
 * The Arabic name of each category, for the app.
 *
 * The exports are English-only by owner decision, so this is for the
 * interface only.
 */
export const CATEGORY_LABELS_AR: Record<DressCategory, string> = {
  wedding: 'فستان زفاف',
  party: 'فستان سهرة',
  engagement: 'فستان خطوبة',
  veil: 'طرحة',
  jumpsuit: 'أفرول',
};

/** The label for a category, in the language of the interface. */
export function categoryLabel(
  category: string | null | undefined,
  arabic: boolean,
): string {
  if (!category) return '';
  const key = category as DressCategory;
  if (arabic) return CATEGORY_LABELS_AR[key] ?? CATEGORY_LABELS[key] ?? category;
  return CATEGORY_LABELS[key] ?? category;
}

/**
 * The category as the database accepts it, or null.
 *
 * The column is an enum, so anything outside the list is rejected by
 * Postgres with error 22P02 - an empty string from a form or a value the
 * model invented would fail the whole save, not just the one field. A
 * dress with no category is null, which the column allows.
 */
export function toCategory(value: string | null | undefined): DressCategory | null {
  if (!value) return null;
  return (DRESS_CATEGORIES as readonly string[]).includes(value)
    ? (value as DressCategory)
    : null;
}
