import { describe, expect, it } from 'vitest';
import { imageKind } from './design';

/**
 * A base64 image is a long string of random letters, and it contains the
 * letters "svg" by chance about one time in eight. A guard that searches
 * the string for "svg" therefore throws away a perfectly good PNG - which
 * is exactly what happened: the logo silently never reached the sheet.
 *
 * The type has to be read from the front, where the MIME type lives.
 */
describe('the image kind of a data URL', () => {
  it('reads a PNG', () => {
    expect(imageKind('data:image/png;base64,iVBORw0KGgo=')).toEqual({
      mime: 'png',
      extension: 'png',
    });
  });

  it('reads a JPEG', () => {
    expect(imageKind('data:image/jpeg;base64,/9j/4AAQ')).toEqual({
      mime: 'jpeg',
      extension: 'jpeg',
    });
    expect(imageKind('data:image/jpg;base64,/9j/4AAQ').extension).toBe('jpeg');
  });

  it('reads an SVG', () => {
    expect(imageKind('data:image/svg+xml;base64,PHN2Zz4=').extension).toBe('svg');
  });

  it('is not fooled by the letters "svg" inside the base64', () => {
    // The real case: a PNG whose base64 happened to contain "svg".
    const dataUrl = `data:image/png;base64,${'vZrnyXbVqld3vsnMHWS3iq/gsvgsDtvNtXIUJvyVa1kuMJda'}`;
    expect(dataUrl).toContain('svg');
    expect(imageKind(dataUrl).extension).toBe('png');
  });

  it('falls back to a PNG when there is no type', () => {
    expect(imageKind('iVBORw0KGgo=').extension).toBe('png');
  });
});
