import { describe, expect, it } from 'vitest';
import {
  GARMENT_THRESHOLD,
  NOT_GARMENT_THRESHOLD,
  parseDecision,
  verdictFromProbability,
} from './gate.ts';

/**
 * The gate decides whether the expensive description is worth running at
 * all. It has to refuse a photo that is not a garment, and it must never
 * refuse a real dress.
 *
 * These tests cover the reading of the answer. The model itself is
 * exercised against the live API, not here.
 */
describe('the photo gate', () => {
  it('accepts a clear garment answer', () => {
    const result = parseDecision({
      answers: { is_garment: { type: 'noul', noul: 0.97, confidence: 0.97 } },
    });
    expect(result?.verdict).toBe('garment');
    expect(result?.probability).toBe(0.97);
  });

  it('refuses a photo that is not a garment', () => {
    const result = parseDecision({
      answers: { is_garment: { type: 'noul', noul: 0.04, confidence: 0.96 } },
    });
    expect(result?.verdict).toBe('not_garment');
  });

  it('refuses a face', () => {
    const result = parseDecision({
      answers: { is_garment: { type: 'noul', noul: 0.01, confidence: 0.99 } },
    });
    expect(result?.verdict).toBe('not_garment');
  });

  it('passes on an answer it is unsure about', () => {
    // Between the thresholds the gate does not know. A real dress must
    // never be refused, so the full description gets the final say.
    const result = parseDecision({
      answers: { is_garment: { type: 'noul', noul: 0.5, confidence: 0.5 } },
    });
    expect(result?.verdict).toBe('unclear');
  });

  it('treats a missing answer as no answer at all', () => {
    expect(parseDecision({})).toBeNull();
    expect(parseDecision(null)).toBeNull();
    expect(parseDecision({ answers: { other: { noul: 0.9 } } })).toBeNull();
  });

  it('does not refuse on a weak probability', () => {
    // Just below the garment threshold, but not clearly a refusal either.
    expect(verdictFromProbability(0.79, 0.79)).toBe('unclear');
    expect(verdictFromProbability(GARMENT_THRESHOLD, 0.9)).toBe('garment');
    expect(verdictFromProbability(NOT_GARMENT_THRESHOLD, 0.9)).toBe('not_garment');
  });

  it('never treats a probability of exactly zero as a garment', () => {
    expect(verdictFromProbability(0, 0)).toBe('not_garment');
    expect(verdictFromProbability(1, 1)).toBe('garment');
  });
});
