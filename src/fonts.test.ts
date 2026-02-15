import { describe, expect, it } from 'vitest';

import type { FontWeight } from './api/text.ts';
import { weightToNumber } from './fonts.ts';

describe('weightToNumber', () => {
  it('supports keywords `normal` and `bold`', () => {
    expect(weightToNumber('normal')).toBe(400);
    expect(weightToNumber('bold')).toBe(700);
  });

  it('supports numbers', () => {
    expect(weightToNumber(1)).toBe(1);
  });

  it('throws for invalid types', () => {
    expect(() => weightToNumber('foo' as FontWeight)).toThrow(
      new Error("Invalid font weight: 'foo'"),
    );
    expect(() => weightToNumber(null as unknown as FontWeight)).toThrow(
      new Error('Invalid font weight: null'),
    );
  });

  it('throws for invalid numbers', () => {
    expect(() => weightToNumber(NaN)).toThrow(new Error('Invalid font weight: NaN'));
    expect(() => weightToNumber(0.1)).toThrow(new Error('Invalid font weight: 0.1'));
  });
});
