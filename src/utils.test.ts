import { describe, expect, it } from 'vitest';

import { round } from './utils.ts';

describe('round', () => {
  it('returns integer unchanged', () => {
    expect(round(0)).toBe(0);
    expect(round(1e10)).toBe(1e10);
    expect(round(-1e10)).toBe(-1e10);
  });

  it('returns floating point numbers with up to 6 decimal places unchanged', () => {
    expect(round(12345.6789)).toBe(12345.6789);
    expect(round(1234.56789)).toBe(1234.56789);
    expect(round(123.456789)).toBe(123.456789);
  });

  it('returns rounded number with max 6 decimal places', () => {
    expect(round(0.123456789)).toBe(0.123457);
    expect(round(-0.123456789)).toBe(-0.123457);
    expect(round(123456789.12345678)).toBe(123456789.123457);
    expect(round(-123456789.12345678)).toBe(-123456789.123457);
  });

  it('supports precision argument', () => {
    expect(round(0.123456789, 3)).toBe(0.123);
    expect(round(0.123456789, 8)).toBe(0.12345679);
    expect(round(0.12345, 8)).toBe(0.12345);
  });
});
