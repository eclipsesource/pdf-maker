import { describe, expect, it } from 'vitest';

import { parseXml } from '../util/xml.ts';
import {
  combineMatrices,
  getMergedAttrs,
  isIdentityMatrix,
  parseDashArray,
  parseLength,
  parseNumber,
  parseNumberList,
  parseOpacity,
  parseStyle,
  parseTransform,
  roundMatrix,
} from './svg-attrs.ts';

describe('parseNumber', () => {
  it('parses integers and decimals', () => {
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber('-1.5')).toBe(-1.5);
    expect(parseNumber('+.5')).toBe(0.5);
    expect(parseNumber('2.')).toBe(2);
  });

  it('parses exponential notation', () => {
    expect(parseNumber('1e2')).toBe(100);
    expect(parseNumber('1.5E-1')).toBe(0.15);
  });

  it('accepts surrounding whitespace', () => {
    expect(parseNumber(' 42 ')).toBe(42);
  });

  it('returns undefined for invalid input', () => {
    expect(parseNumber(undefined)).toBeUndefined();
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('abc')).toBeUndefined();
    expect(parseNumber('1 2')).toBeUndefined();
    expect(parseNumber('10px')).toBeUndefined();
  });
});

describe('parseLength', () => {
  it('parses unitless values as pt', () => {
    expect(parseLength('42')).toBe(42);
    expect(parseLength('-1.5')).toBe(-1.5);
  });

  it('converts absolute units to pt', () => {
    expect(parseLength('10px')).toBe(10);
    expect(parseLength('10pt')).toBe(10);
    expect(parseLength('1in')).toBe(72);
    expect(parseLength('1pc')).toBe(12);
    expect(parseLength('2.54cm')).toBeCloseTo(72);
    expect(parseLength('25.4mm')).toBeCloseTo(72);
  });

  it('ignores the case of units', () => {
    expect(parseLength('1IN')).toBe(72);
  });

  it('resolves percentages against the given reference', () => {
    expect(parseLength('50%', 200)).toBe(100);
    expect(parseLength('100%', 30)).toBe(30);
  });

  it('returns undefined for percentages without a reference', () => {
    expect(parseLength('50%')).toBeUndefined();
  });

  it('returns undefined for unsupported units and invalid input', () => {
    expect(parseLength(undefined)).toBeUndefined();
    expect(parseLength('')).toBeUndefined();
    expect(parseLength('10em')).toBeUndefined();
    expect(parseLength('10 pt')).toBeUndefined();
    expect(parseLength('abc')).toBeUndefined();
  });
});

describe('parseNumberList', () => {
  it('parses numbers separated by whitespace or commas', () => {
    expect(parseNumberList('0 0 100 50')).toEqual([0, 0, 100, 50]);
    expect(parseNumberList('1,2, 3 ,4')).toEqual([1, 2, 3, 4]);
  });

  it('stops at the first invalid entry', () => {
    expect(parseNumberList('1 2 x 4')).toEqual([1, 2]);
  });

  it('returns an empty array for missing or empty input', () => {
    expect(parseNumberList(undefined)).toEqual([]);
    expect(parseNumberList('')).toEqual([]);
  });
});

describe('parseOpacity', () => {
  it('parses numbers and percentages', () => {
    expect(parseOpacity('0.5')).toBe(0.5);
    expect(parseOpacity('50%')).toBe(0.5);
  });

  it('clamps values to the range [0, 1]', () => {
    expect(parseOpacity('-1')).toBe(0);
    expect(parseOpacity('2')).toBe(1);
    expect(parseOpacity('150%')).toBe(1);
  });

  it('returns undefined for invalid input', () => {
    expect(parseOpacity(undefined)).toBeUndefined();
    expect(parseOpacity('abc')).toBeUndefined();
  });
});

describe('parseDashArray', () => {
  it('parses numbers separated by whitespace or commas', () => {
    expect(parseDashArray('1 2')).toEqual([1, 2]);
    expect(parseDashArray('1,2,3')).toEqual([1, 2, 3]);
  });

  it('supports units and percentages', () => {
    expect(parseDashArray('1pc 2')).toEqual([12, 2]);
    expect(parseDashArray('10%', 100)).toEqual([10]);
  });

  it('returns an empty array for values that disable dashing', () => {
    expect(parseDashArray('none')).toEqual([]);
    expect(parseDashArray('1 -2')).toEqual([]);
    expect(parseDashArray('0 0')).toEqual([]);
  });

  it('returns undefined for invalid input', () => {
    expect(parseDashArray(undefined)).toBeUndefined();
    expect(parseDashArray('')).toBeUndefined();
    expect(parseDashArray('1 x')).toBeUndefined();
  });
});

describe('parseTransform', () => {
  it('parses translate', () => {
    expect(parseTransform('translate(10)')).toEqual([1, 0, 0, 1, 10, 0]);
    expect(parseTransform('translate(10, 20)')).toEqual([1, 0, 0, 1, 10, 20]);
  });

  it('parses scale', () => {
    expect(parseTransform('scale(2)')).toEqual([2, 0, 0, 2, 0, 0]);
    expect(parseTransform('scale(2, 3)')).toEqual([2, 0, 0, 3, 0, 0]);
  });

  it('parses rotate', () => {
    expect(roundMatrix(parseTransform('rotate(90)')!)).toEqual([0, 1, -1, 0, 0, 0]);
  });

  it('parses rotate around a center point', () => {
    expect(roundMatrix(parseTransform('rotate(180, 10, 10)')!)).toEqual([-1, 0, -0, -1, 20, 20]);
  });

  it('parses skewX and skewY', () => {
    expect(parseTransform('skewX(45)')![2]).toBeCloseTo(1);
    expect(parseTransform('skewY(45)')![1]).toBeCloseTo(1);
  });

  it('parses matrix', () => {
    expect(parseTransform('matrix(1 2 3 4 5 6)')).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('combines a transform list in order', () => {
    // "translate scale" transforms a point by the scale first
    expect(parseTransform('translate(10 20) scale(2)')).toEqual([2, 0, 0, 2, 10, 20]);
    expect(parseTransform('scale(2) translate(10 20)')).toEqual([2, 0, 0, 2, 20, 40]);
  });

  it('accepts commas and whitespace between transforms', () => {
    expect(parseTransform(' translate(10) , scale(2) ')).toEqual([2, 0, 0, 2, 10, 0]);
  });

  it('returns undefined for empty or missing input', () => {
    expect(parseTransform(undefined)).toBeUndefined();
    expect(parseTransform('')).toBeUndefined();
    expect(parseTransform('  ')).toBeUndefined();
  });

  it('returns undefined for invalid input', () => {
    expect(parseTransform('foo(1)')).toBeUndefined();
    expect(parseTransform('translate()')).toBeUndefined();
    expect(parseTransform('translate(1, 2, 3)')).toBeUndefined();
    expect(parseTransform('matrix(1 2 3)')).toBeUndefined();
    expect(parseTransform('rotate(45, 10)')).toBeUndefined();
    expect(parseTransform('translate(a)')).toBeUndefined();
    expect(parseTransform('translate(1) x scale(2)')).toBeUndefined();
    expect(parseTransform('translate(1) garbage')).toBeUndefined();
  });
});

describe('roundMatrix', () => {
  it('rounds all components', () => {
    expect(roundMatrix([1 / 3, 0, 0, 1 / 3, 0, 0])).toEqual([0.333333, 0, 0, 0.333333, 0, 0]);
  });

  it('throws for a matrix that is not finite', () => {
    // rotate() overflows to NaN for extreme angles, combining two large
    // matrices overflows to Infinity
    expect(() => roundMatrix(parseTransform('rotate(1e308)')!)).toThrow(
      'Invalid transformation matrix: [NaN, NaN, NaN, NaN, NaN, NaN]',
    );
    expect(() => roundMatrix(parseTransform('scale(1e200) scale(1e200)')!)).toThrow(
      'Invalid transformation matrix: [Infinity, 0, 0, Infinity, 0, 0]',
    );
  });

  it('throws for a matrix that exceeds the range of a PDF number', () => {
    expect(() => roundMatrix([1, 0, 0, 1, 1e30, 0])).toThrow(
      'Invalid transformation matrix: [1, 0, 0, 1, 1e+30, 0]',
    );
    // round() multiplies by the precision factor, so a value this large
    // is finite going in and infinite coming out
    expect(() => roundMatrix([1e307, 0, 0, 1e307, 0, 0])).toThrow('Invalid transformation matrix');
  });
});

describe('combineMatrices', () => {
  it('applies the first matrix to coordinates first', () => {
    const scale = [2, 0, 0, 2, 0, 0] as const;
    const translate = [1, 0, 0, 1, 10, 20] as const;
    // scale first, then translate: (1, 1) -> (2, 2) -> (12, 22)
    expect(combineMatrices([...scale], [...translate])).toEqual([2, 0, 0, 2, 10, 20]);
  });
});

describe('isIdentityMatrix', () => {
  it('detects the identity matrix', () => {
    expect(isIdentityMatrix([1, 0, 0, 1, 0, 0])).toBe(true);
    expect(isIdentityMatrix([1, 0, 0, 1, 0, 5])).toBe(false);
  });
});

describe('parseStyle', () => {
  it('parses declarations', () => {
    expect(parseStyle('fill: red; stroke-width: 2')).toEqual({
      fill: 'red',
      'stroke-width': '2',
    });
  });

  it('ignores empty and invalid declarations', () => {
    expect(parseStyle('')).toEqual({});
    expect(parseStyle(';;')).toEqual({});
    expect(parseStyle('fill')).toEqual({});
    expect(parseStyle(': red')).toEqual({});
    expect(parseStyle('fill:')).toEqual({});
  });

  it('keeps colons in values', () => {
    expect(parseStyle('fill: url(#a):x')).toEqual({ fill: 'url(#a):x' });
  });
});

describe('getMergedAttrs', () => {
  it('returns the attributes of an element without a style attribute', () => {
    const element = parseXml('<rect fill="red"/>');
    expect(getMergedAttrs(element)).toEqual({ fill: 'red' });
  });

  it('merges style declarations over presentation attributes', () => {
    const element = parseXml('<rect fill="red" stroke="blue" style="fill: green"/>');
    expect(getMergedAttrs(element)).toEqual({
      fill: 'green',
      stroke: 'blue',
      style: 'fill: green',
    });
  });
});
