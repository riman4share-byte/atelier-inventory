import { describe, expect, it } from 'vitest';
import { excelCompatibleCsv, neutraliseFormula, toCsv } from './exportData';

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

describe('neutraliseFormula', () => {
  it('marks spreadsheet formulas as text so Excel will not evaluate them', () => {
    expect(neutraliseFormula('=HYPERLINK("http://evil/","click")')).toBe(
      "'=HYPERLINK(\"http://evil/\",\"click\")",
    );
    expect(neutraliseFormula('+1')).toBe("'+1");
    expect(neutraliseFormula('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(neutraliseFormula('\tcmd')).toBe("'\tcmd");
  });

  it('leaves ordinary text, numbers and empty values alone', () => {
    expect(neutraliseFormula('Ivory A-line gown')).toBe('Ivory A-line gown');
    expect(neutraliseFormula('1500.50')).toBe('1500.50');
    expect(neutraliseFormula('-42')).toBe('-42');
    expect(neutraliseFormula('')).toBe('');
  });

  it('is applied to every exported cell', () => {
    expect(toCsv([['=cmd|calc', 'ok']])).toBe("'=cmd|calc,ok");
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
