import { describe, expect, it } from '@jest/globals';

import {
  asArray,
  asBoolean,
  asDate,
  asNonNegNumber,
  asNumber,
  asObject,
  asString,
  check,
  getFrom,
  optional,
  pickDefined,
  printValue,
  required,
} from '../src/types.js';

describe('types', () => {
  describe('pickDefined', () => {
    it('returns a copy of the original object', () => {
      const input = { foo: 23, bar: 'foo' };

      const result = pickDefined(input);

      expect(result).toEqual(input);
      expect(result).not.toBe(input);
    });

    it('removes all undefined values', () => {
      const input = { foo: 23, u1: undefined, bar: 42, u2: undefined };

      const result = pickDefined(input);

      expect(result).toEqual({ foo: 23, bar: 42 });
    });

    it('does not remove null and falsy values', () => {
      const input = { zero: 0, null: null, empty: '', false: false, undef: undefined };

      const result = pickDefined(input);

      expect(result).toEqual({ zero: 0, null: null, empty: '', false: false });
    });
  });

  describe('check', () => {
    it('returns value', () => {
      const input = 23;

      const result = check(input, 'foo');

      expect(result).toEqual(23);
    });

    it('applies given function', () => {
      const input = 23;

      const result = check(input, 'foo', (n) => (n as number) + 1);

      expect(result).toEqual(24);
    });

    it('throws if given function throws', () => {
      const input = 23;
      const bad = () => {
        throw new TypeError('bad value');
      };

      const fn = () => check(input, 'foo', bad);

      expect(fn).toThrowError('Invalid value for "foo": bad value');
    });

    it('throws for missing value', () => {
      const fn = () => check(undefined, 'foo', required());

      expect(fn).toThrowError('Missing value for "foo"');
    });
  });

  describe('getFrom', () => {
    it('gets value from object', () => {
      const input = { foo: 23, bar: 42 };

      const result = getFrom(input, 'foo');

      expect(result).toEqual(23);
    });

    it('applies given function', () => {
      const input = { foo: 23, bar: 42 };

      const result = getFrom(input, 'foo', (n) => (n as number) + 1);

      expect(result).toEqual(24);
    });

    it('throws if given function throws', () => {
      const input = { foo: 23, bar: 42 };
      const bad = () => {
        throw new TypeError('bad value');
      };

      const fn = () => getFrom(input, 'foo', bad);

      expect(fn).toThrowError('Invalid value for "foo": bad value');
    });
  });

  describe('optional', () => {
    const fn = (n) => `${n}`;

    it('returns function that delegates to given function', () => {
      expect(optional(fn)(23)).toEqual('23');
    });

    it('returns function that returns value if no function given', () => {
      expect(optional()(23)).toEqual(23);
    });

    it('returns function that returns undefined if input is undefined', () => {
      expect(optional(fn)(undefined)).toBeUndefined();
    });

    it('returns function that delegates to given function for falsy values', () => {
      expect(optional(fn)(null)).toEqual('null');
      expect(optional(fn)(false)).toEqual('false');
      expect(optional(fn)('')).toEqual('');
    });
  });

  describe('required', () => {
    const fn = (n) => `${n}`;

    it('returns function that delegates to given function', () => {
      expect(required(fn)(23)).toEqual('23');
    });

    it('returns function that returns value if no function given', () => {
      expect(required()(23)).toEqual(23);
    });

    it('returns function that throws if input is undefined', () => {
      const wrapped = required(fn);

      expect(() => wrapped(undefined)).toThrowError('Missing value');
    });

    it('returns function that delegates to given function for falsy values', () => {
      expect(required(fn)(null)).toEqual('null');
      expect(required(fn)(false)).toEqual('false');
      expect(required(fn)('')).toEqual('');
    });
  });

  describe('asBoolean', () => {
    it('returns boolean values', () => {
      expect(asBoolean(true)).toBe(true);
      expect(asBoolean(false)).toBe(false);
    });

    it('throws for other types', () => {
      expect(() => asBoolean(23)).toThrowError('Expected boolean, got: 23');
      expect(() => asBoolean(null)).toThrowError('Expected boolean, got: null');
    });
  });

  describe('asString', () => {
    it('returns strings', () => {
      expect(asString('foo')).toBe('foo');
      expect(asString('')).toBe('');
    });

    it('throws for other types', () => {
      expect(() => asString(23)).toThrowError('Expected string, got: 23');
      expect(() => asString(null)).toThrowError('Expected string, got: null');
    });
  });

  describe('asNumber', () => {
    it('returns numbers', () => {
      expect(asNumber(23)).toBe(23);
      expect(asNumber(-1.5)).toBe(-1.5);
    });

    it('throws for non-finite numbers', () => {
      expect(() => asNumber(NaN)).toThrowError('Expected number, got: NaN');
      expect(() => asNumber(Infinity)).toThrowError('Expected number, got: Infinity');
    });

    it('throws for other types', () => {
      expect(() => asNumber('23')).toThrowError("Expected number, got: '23'");
      expect(() => asNumber(null)).toThrowError('Expected number, got: null');
    });
  });

  describe('asNonNegNumber', () => {
    it('returns zero and positive numbers', () => {
      expect(asNonNegNumber(0)).toBe(0);
      expect(asNonNegNumber(23)).toBe(23);
    });

    it('throws for negative numbers', () => {
      expect(() => asNonNegNumber(-1)).toThrowError('Expected non-negative number, got: -1');
    });
  });

  describe('asDate', () => {
    it('returns date objects', () => {
      const date = new Date('2000-04-01T12:13:14.000Z');

      expect(asDate(date)).toBe(date);
    });

    it('throws for date strings', () => {
      expect(() => asDate('2000-04-01T12:13:14.000Z')).toThrowError(
        "Expected Date, got: '2000-04-01T12:13:14.000Z'"
      );
    });

    it('throws for other types', () => {
      expect(() => asDate(23)).toThrowError('Expected Date, got: 23');
      expect(() => asDate(null)).toThrowError('Expected Date, got: null');
    });
  });

  describe('asArray', () => {
    it('returns arrays', () => {
      expect(asArray([])).toEqual([]);
      expect(asArray(['foo'])).toEqual(['foo']);
    });

    it('throws for objects', () => {
      expect(() => asArray({})).toThrowError('Expected array, got: {}');
      expect(() => asArray(Uint8Array.of(1, 2, 3).buffer)).toThrowError(
        'Expected array, got: ArrayBuffer [1, 2, 3]'
      );
    });
  });

  describe('asObject', () => {
    it('returns objects', () => {
      expect(asObject({})).toEqual({});
      expect(asObject(new ArrayBuffer(3))).toEqual(new ArrayBuffer(3));
    });

    it('throws for arrays', () => {
      expect(() => asObject([])).toThrowError('Expected object, got: []');
    });
  });

  describe('printValue', () => {
    it('prints strings', () => {
      expect(printValue('')).toEqual("''");
      expect(printValue('foo')).toEqual("'foo'");
    });

    it('prints numbers', () => {
      expect(printValue(0)).toEqual('0');
      expect(printValue(23)).toEqual('23');
    });

    it('prints boolean values', () => {
      expect(printValue(true)).toEqual('true');
      expect(printValue(false)).toEqual('false');
    });

    it('prints Date objects', () => {
      expect(printValue(new Date('2001-02-03T04:05:06.789Z'))).toEqual(
        'Date 2001-02-03T04:05:06.789Z'
      );
    });

    it('prints functions', () => {
      expect(printValue((x) => x)).toEqual('anonymous function');
      expect(printValue(async (x) => x)).toEqual('anonymous function');
      expect(printValue(printValue)).toEqual('function printValue');
    });

    it('prints ArrayBuffers', () => {
      expect(printValue(Uint8Array.of(1, 2, 3).buffer)).toEqual('ArrayBuffer [1, 2, 3]');
    });

    it('prints typed arrays', () => {
      expect(printValue(Uint8Array.of(1, 2, 3))).toEqual('Uint8Array [1, 2, 3]');
      expect(printValue(Int8Array.of(-1, -2, -3))).toEqual('Int8Array [255, 254, 253]');
    });

    it('prints arrays', () => {
      expect(printValue([])).toEqual('[]');
      expect(printValue([1, 2, 3])).toEqual('[1, 2, 3]');
      expect(printValue(['a', 'b', 'c'])).toEqual("['a', 'b', 'c']");
    });

    it('prints nested arrays', () => {
      expect(printValue([[]])).toEqual('[[]]');
      expect(printValue([1, 2, [3, 4]])).toEqual('[1, 2, [3, 4]]');
    });

    it('prints only first 8 elements of arrays', () => {
      const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      expect(printValue(arr)).toEqual('[0, 1, 2, 3, 4, 5, 6, 7, …]');
    });

    it('handles circular references in arrays', () => {
      const arr = [0, {}];
      arr.push(arr);

      expect(printValue(arr)).toEqual('[0, {}, recursive ref]');
    });

    it('prints objects', () => {
      expect(printValue({})).toEqual('{}');
      expect(printValue({ a: 1, b: 2 })).toEqual('{a: 1, b: 2}');
      expect(printValue({ a: 'a', b: 'b' })).toEqual("{a: 'a', b: 'b'}");
    });

    it('prints nested objects', () => {
      expect(printValue({ a: 1, b: { c: 2 } })).toEqual('{a: 1, b: {c: 2}}');
    });

    it('prints only first 8 entries of objects', () => {
      const obj = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9 };

      expect(printValue(obj)).toEqual('{a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, …}');
    });

    it('handles circular references in objects', () => {
      const obj = { a: 0, b: {} };
      obj.b = obj;

      expect(printValue(obj)).toEqual('{a: 0, b: recursive ref}');
    });

    it('handles deep circular references in objects', () => {
      const obj = { a: 0, b: [1, 2, {}] };
      obj.b.push({ obj });

      expect(printValue(obj)).toEqual('{a: 0, b: [1, 2, {}, {obj: recursive ref}]}');
    });
  });
});
