import { describe, expect, it } from 'vitest';
import { parseGate } from './gate.ts';

/**
 * The gate decides whether the expensive description is worth running at
 * all. It has to be strict about refusing a photo that is not a garment, and
 * it must never refuse a real dress.
 *
 * These tests cover the parsing of the model's answer. The prompt itself is
 * exercised against the live model, not here.
 */
describe('the photo gate', () => {
  it('accepts a clear garment answer', () => {
    const result = parseGate(
      '{"verdict":"garment","subject":"ivory lace ball gown","reason":"a full gown on a mannequin"}',
    );
    expect(result.verdict).toBe('garment');
    expect(result.subject).toBe('ivory lace ball gown');
  });

  it('refuses a photo that is not a garment', () => {
    const result = parseGate(
      '{"verdict":"not_garment","subject":"person in a dim room","reason":"no garment is visible"}',
    );
    expect(result.verdict).toBe('not_garment');
    expect(result.subject).toBe('person in a dim room');
  });

  it('refuses a face', () => {
    const result = parseGate('{"verdict":"not_garment","subject":"close-up portrait","reason":"a face"}');
    expect(result.verdict).toBe('not_garment');
  });

  it('keeps the answer when the model does not use JSON', () => {
    // A small model can answer in prose. The words are still readable.
    expect(parseGate('not_garment - this is a room').verdict).toBe('not_garment');
    expect(parseGate('garment, a wedding dress on a hanger').verdict).toBe('garment');
    expect(parseGate('unclear, the photo is too dark').verdict).toBe('unclear');
  });

  it('does not guess when the answer is unreadable', () => {
    // Unreadable must never become "garment" by accident, and must never
    // become "not_garment" either: a real dress must not be refused.
    const result = parseGate('???');
    expect(result.verdict).toBe('unclear');
  });

  it('reads a verdict written in a different case', () => {
    expect(parseGate('{"verdict":"GARMENT","subject":"dress"}').verdict).toBe('garment');
    expect(parseGate('{"verdict":"Not_Garment","subject":"room"}').verdict).toBe('not_garment');
  });

  it('does not read the word "garment" out of a refusal', () => {
    // "not_garment" contains the word "garment". The refusal has to win.
    const result = parseGate('{"verdict":"not_garment","subject":"x"}');
    expect(result.verdict).toBe('not_garment');
  });

  it('survives a JSON body that is not an object', () => {
    expect(parseGate('"garment"').verdict).toBe('garment');
    expect(parseGate('[]').verdict).toBe('unclear');
    expect(parseGate('null').verdict).toBe('unclear');
  });
});
