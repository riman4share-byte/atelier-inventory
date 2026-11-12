import { describe, expect, it } from 'vitest';
import {
  buildCatalogHtml,
  buildHangTagHtml,
  buildStockReportHtml,
  buildTagSheetHtml,
} from './printDocument';
import { DEFAULT_EXPORT_COLUMNS } from './exportData';
import type { DressRow } from './api';

const dress = {
  code: 'RF-0001',
  name_en: 'Seraphine',
  status: 'available',
  listing_type: 'both',
  size_label: 'M',
  color: 'ivory',
  fabrics: ['lace'],
  sale_price: 3500,
  rent_price: null,
  description_en: 'A flowing gown.',
  created_at: '2026-11-10T06:09:33.082852+00:00',
  public_token: 'd1c70f7c-e6e5-4e44-aef8-720c08d37630',
} as unknown as DressRow;

/**
 * The software credit belongs to the app, not to the documents.
 *
 * The hang tag goes on a dress. The catalogue goes to a bride. The
 * spreadsheet goes to whoever the owner sends it to. "Powered by Kais" is
 * the owner's mark on the software, and it has no business on those.
 *
 * The atelier's own name and logo do belong there, and they are checked
 * here too, so that removing the credit cannot quietly take them.
 */
describe('the printed documents', () => {
  const branding = {
    atelierName: 'Riman Fashion',
    logoUrl: 'https://example.com/logo.png',
    tagline: 'Bridal & Evening Couture',
    contact: 'Sharjah, United Arab Emirates',
  };

  const documents: ReadonlyArray<{ name: string; html: string }> = [
    {
      name: 'the catalogue',
      html: buildCatalogHtml([dress], {
        perPage: 1,
        showPrices: true,
        atelierName: branding.atelierName,
        logoUrl: branding.logoUrl,
        tagline: branding.tagline,
        contact: branding.contact,
      }),
    },
    {
      name: 'the stock report',
      html: buildStockReportHtml([dress], {
        atelierName: branding.atelierName,
        logoUrl: branding.logoUrl,
        counts: { available: 1, reserved: 0, rented: 0, sold: 0 },
      }),
    },
    {
      name: 'the hang tag',
      html: buildHangTagHtml(dress, branding.atelierName, 'data:image/png;base64,AA', branding.logoUrl),
    },
    {
      name: 'the sheet of tags',
      html: buildTagSheetHtml([dress], branding.atelierName, { 'RF-0001': 'data:image/png;base64,AA' }, branding.logoUrl),
    },
  ];

  it('never carries the software credit', () => {
    for (const document of documents) {
      expect(document.html, document.name).not.toMatch(/Powered by/i);
    }
  });

  it('still carries the atelier and its mark', () => {
    for (const document of documents) {
      expect(document.html, document.name).toContain('Riman Fashion');
    }
    // The mark is on the catalogue and the tags, where there is room for it.
    expect(documents[0]!.html).toContain(branding.logoUrl);
    expect(documents[2]!.html).toContain(branding.logoUrl);
  });

  it('shows the atelier what it makes and where it is', () => {
    expect(documents[0]!.html).toContain('Bridal &amp; Evening Couture');
    expect(documents[0]!.html).toContain('Sharjah, United Arab Emirates');
  });

  it('still exports the catalogue columns', () => {
    expect(DEFAULT_EXPORT_COLUMNS.length).toBeGreaterThan(5);
  });

  it('is written in English whatever language the app is in', () => {
    // Exports are English-only by owner decision (2026-09-09). The sheet
    // names came out in Arabic once, because they were translated like the
    // rest of the interface.
    const arabic = ['الفساتين', 'الحركات', 'تصدير', 'حفظ'];
    for (const document of documents) {
      for (const word of arabic) {
        expect(document.html, document.name).not.toContain(word);
      }
    }
  });
});
