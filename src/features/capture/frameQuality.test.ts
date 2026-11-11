import { describe, expect, it } from 'vitest';
import { BLACK_FRAME_MAX, isEmptyFrame } from './frameQuality';

/**
 * The camera hands out black frames for a moment after it is opened or
 * switched. Saving one puts a black rectangle into the catalogue, so the
 * capture screen has to be able to recognise one.
 */
describe('frame quality', () => {
  it('calls a completely black frame empty', () => {
    expect(isEmptyFrame({ mean: 0, max: 0, distinct: 1 })).toBe(true);
    expect(isEmptyFrame({ mean: 4, max: 9, distinct: 6 })).toBe(true);
  });

  it('calls a frame with nothing above the black threshold empty', () => {
    expect(isEmptyFrame({ mean: 3, max: BLACK_FRAME_MAX, distinct: 12 })).toBe(true);
  });

  it('calls a flat placeholder frame empty even when it is bright', () => {
    // A grey rectangle is not a photograph either.
    expect(isEmptyFrame({ mean: 128, max: 128, distinct: 1 })).toBe(true);
    expect(isEmptyFrame({ mean: 200, max: 210, distinct: 2 })).toBe(true);
  });

  it('accepts a real photograph, however dark it is', () => {
    // A dark room still has a spread of brightness levels.
    expect(isEmptyFrame({ mean: 14, max: 90, distinct: 40 })).toBe(false);
    expect(isEmptyFrame({ mean: 44, max: 255, distinct: 300 })).toBe(false);
  });
});
