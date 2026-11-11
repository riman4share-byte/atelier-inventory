import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A duplicate key in a JSON file is silently swallowed by the parser: the last
 * one wins and the earlier value is gone. `movements.reason` was defined
 * twice — once as the object of movement reasons and once as the field label —
 * so every movement reason rendered the raw key "movements.reason.rental" and
 * the label lost its own object.
 *
 * This scans the raw text and reports any key that appears twice among
 * siblings. It has to understand nesting, because the collision lived inside
 * a nested object.
 */
function findDuplicateKeys(raw: string): string[] {
  const duplicates: string[] = [];
  // Each stack frame is the set of keys seen so far at that object level.
  const stack: Set<string>[] = [];
  const path: string[] = [];

  let i = 0;
  let pendingKey: string | null = null;
  let lastKey: string | null = null;
  let expectingKey = false;

  const inString = (start: number): { value: string; end: number } => {
    let out = '';
    let j = start + 1;
    while (j < raw.length) {
      const ch = raw[j];
      if (ch === '\\') {
        const next = raw[j + 1];
        out +=
          next === 'n'
            ? '\n'
            : next === 't'
              ? '\t'
              : next === 'r'
                ? '\r'
                : next === 'b'
                  ? '\b'
                  : next === 'f'
                    ? '\f'
                    : next === 'u'
                      ? String.fromCharCode(parseInt(raw.slice(j + 2, j + 6), 16))
                      : next;
        j += next === 'u' ? 6 : 2;
        continue;
      }
      if (ch === '"') return { value: out, end: j };
      out += ch;
      j += 1;
    }
    return { value: out, end: j };
  };

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '"') {
      const { value, end } = inString(i);
      // Look ahead for a colon: that makes this a key, not a value.
      let k = end + 1;
      while (k < raw.length && /\s/.test(raw[k] ?? '')) k += 1;
      if (raw[k] === ':') {
        pendingKey = value;
        expectingKey = true;
      }
      i = end + 1;
      continue;
    }

    if (ch === '{') {
      stack.push(new Set());
      path.push(lastKey ?? '');
      lastKey = null;
      pendingKey = null;
      expectingKey = false;
      i += 1;
      continue;
    }

    if (ch === '}') {
      stack.pop();
      path.pop();
      expectingKey = false;
      i += 1;
      continue;
    }

    if (ch === '[') {
      // Arrays do not carry keys; keep the object frame as-is.
      i += 1;
      while (i < raw.length && raw[i] !== ']') {
        if (raw[i] === '"') {
          const { end } = inString(i);
          i = end + 1;
          continue;
        }
        i += 1;
      }
      i += 1;
      continue;
    }

    if (ch === ':' && expectingKey && pendingKey !== null) {
      const frame = stack[stack.length - 1];
      if (frame) {
        if (frame.has(pendingKey)) {
          duplicates.push([...path.filter(Boolean), pendingKey].join('.'));
        }
        frame.add(pendingKey);
        lastKey = pendingKey;
      }
      pendingKey = null;
      expectingKey = false;
      i += 1;
      continue;
    }

    i += 1;
  }

  return [...new Set(duplicates)];
}

describe('translation files', () => {
  it('en.json has no duplicate keys', () => {
    expect(findDuplicateKeys(readFileSync('src/i18n/en.json', 'utf8'))).toEqual([]);
  });

  it('ar.json has no duplicate keys', () => {
    expect(findDuplicateKeys(readFileSync('src/i18n/ar.json', 'utf8'))).toEqual([]);
  });

  it('the detector catches a duplicate key', () => {
    // Guard the guard: a detector that never fires proves nothing.
    expect(findDuplicateKeys('{"a": {"b": 1, "b": 2}}')).toEqual(['a.b']);
    expect(findDuplicateKeys('{"a": {"b": 1}, "c": {"b": 2}}')).toEqual([]);
  });

  it('the detector catches the exact shape that broke movements.reason', () => {
    // One key that is an object and one that is a string, at the same level.
    const broken = '{"movements": {"reason": {"rental": "R"}, "reason": "Reason"}}';
    expect(findDuplicateKeys(broken)).toEqual(['movements.reason']);
  });

  it('the movement reasons and the movement reason label are distinct keys', () => {
    const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as {
      movements: { reason: Record<string, string>; reasonLabel: string };
    };
    expect(typeof en.movements.reason).toBe('object');
    expect(en.movements.reason.rental).toBeTruthy();
    expect(typeof en.movements.reasonLabel).toBe('string');
  });
});
