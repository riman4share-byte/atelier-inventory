import { describe, expect, it } from 'vitest';
import { buildDressFilters, searchExpression } from './dressSearch';

describe('searchExpression', () => {
  it('returns null for blank or whitespace-only searches', () => {
    expect(searchExpression('')).toBeNull();
    expect(searchExpression('   ')).toBeNull();
  });

  it('covers name, code, colour and fabrics with one or-expression', () => {
    const expression = searchExpression('lace');
    expect(expression).toBe(
      [
        'name_en.ilike.lace*',
        'name_ar.ilike.lace*',
        'code.ilike.lace*',
        'color.ilike.lace*',
        // as typed, capitalised and lowercased to survive case-sensitive
        // array containment
        'fabrics.cs.{lace}',
        'fabrics.cs.{Lace}',
      ].join(','),
    );
  });

  it('strips or-list separators and wildcards from the term', () => {
    const expression = searchExpression('la,ce(*)% ');
    expect(expression).toBe(
      'name_en.ilike.lace*,name_ar.ilike.lace*,code.ilike.lace*,color.ilike.lace*,fabrics.cs.{lace},fabrics.cs.{Lace}',
    );
  });
});

describe('buildDressFilters', () => {
  it('maps the all chip to no status filter', () => {
    const built = buildDressFilters({ search: '', status: 'all' });
    expect(built.status).toBeNull();
    expect(built.orExpression).toBeNull();
    expect(built.excludesDeleted).toBe(true);
  });

  it('keeps a concrete status and the search expression', () => {
    const built = buildDressFilters({ search: 'noor', status: 'reserved' });
    expect(built.status).toBe('reserved');
    expect(built.orExpression).toContain('name_en.ilike.noor*');
  });
});
