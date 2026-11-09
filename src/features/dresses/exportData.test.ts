import { describe, expect, it } from 'vitest';
import { excelCompatibleCsv, toCsv } from './exportData';

describe('toCsv', () => {
  it('joins rows with CRLF and cells with commas', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });

  it('quotes and escapes cells containing separators, quotes or newlines', () => {
    expect(toCsv([['plain', 'with,comma']])).toBe('plain,"with,comma"');
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
    expect(toCsv([['two\nlines']])).toBe('"two\nlines"');
  });
});

describe('excelCompatibleCsv', () => {
  it('starts with the UTF-8 BOM bytes Excel needs', () => {
    const bytes = excelCompatibleCsv([['code']]);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    expect(Array.from(bytes.slice(3))).toEqual([99, 111, 100, 101]);
  });
});
