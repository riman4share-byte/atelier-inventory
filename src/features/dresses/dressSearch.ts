import type { DressStatus } from '@/lib/database.types';

/** The gallery status filter. 'all' means no status filter at all. */
export type StatusFilter = 'all' | DressStatus;

export const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'available',
  'reserved',
  'rented',
  'sold',
] as const;

export interface DressFilters {
  search: string;
  status: StatusFilter;
}

/**
 * Sanitise a search term and build the PostgREST `or` expression that covers
 * name (both languages), code, colour and fabrics. Returns null when there is
 * nothing to search for, so the caller can skip the filter.
 *
 * Characters that break the PostgREST or-list syntax (comma, parenthesis,
 * backslash) and wildcard characters are stripped: the terms users type stay
 * plain words.
 */
export function searchExpression(search: string): string | null {
  const term = search
    .replace(/[,()\\]/g, '')
    .replace(/[*%_]/g, '')
    .trim();
  if (!term) return null;

  const pattern = `.${term}*`;
  // Fabric elements cannot be matched with ilike (arrays), and containment is
  // case sensitive, so the common case variants are covered explicitly
  // (as typed, Capitalised, lowercased). Documented in GAPS.md; refined
  // alongside the materials work in Phase 9.
  const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
  const lower = term.toLowerCase();
  const fabricVariants = [...new Set([term, capitalized, lower])];
  return [
    `name_en.ilike${pattern}`,
    `name_ar.ilike${pattern}`,
    `code.ilike${pattern}`,
    `color.ilike${pattern}`,
    ...fabricVariants.map((variant) => `fabrics.cs.{${variant}}`),
  ].join(',');
}

/**
 * Everything the gallery query needs. The caller turns this into filters:
 * deleted dresses never appear, search is one or-expression.
 */
export interface BuiltDressFilters {
  orExpression: string | null;
  status: DressStatus | null;
  excludesDeleted: true;
}

export function buildDressFilters({ search, status }: DressFilters): BuiltDressFilters {
  return {
    orExpression: searchExpression(search),
    status: status === 'all' ? null : status,
    excludesDeleted: true,
  };
}
