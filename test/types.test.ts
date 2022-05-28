import { describe, expect, it } from '@jest/globals';

import {
  isObject,
  optional,
  pickDefined,
  printValue,
  readArray,
  readAs,
  readBoolean,
  readDate,
  readFrom,
  readNumber,
  readObject,
  readString,
  required,
  types,
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

  describe('readAs', () => {
    it('returns value', () => {
      const input = 23;

      const result = readAs(input, 'foo');

      expect(result).toEqual(23);
    });

    it('applies given function', () => {
      const input = 23;

      const result = readAs(input, 'foo', (n) => (n as number) + 1);

      expect(result).toEqual(24);
    });

    it('throws if given function throws', () => {
      const input = 23;
      const bad = () => {
        throw new TypeError('bad value');
      };

      const fn = () => readAs(input, 'foo', bad);

      expect(fn).toThrowError('Invalid value for "foo": bad value');
    });

    it('merges nested error messages', () => {
      const input = 23;
      const bad = () => {
        throw new TypeError('bad value');
      };
      const nestedCheck = () => readAs(input, 'bar', bad);

      const fn = () => readAs(input, 'foo', nestedCheck);

      expect(fn).toThrowError('Invalid value for "foo/bar": bad value');
    });

    it('throws for missing value', () => {
      const fn = () => readAs(undefined, 'foo', required());

      expect(fn).toThrowError('Missing value for "foo"');
    });
  });

  describe('readFrom', () => {
    it('reads value from object', () => {
      const input = { foo: 23, bar: 42 };

      const result = readFrom(input, 'foo');

      expect(result).toEqual(23);
    });

    it('applies given function', () => {
      const input = { foo: 23, bar: 42 };

      const result = readFrom(input, 'foo', (n) => (n as number) + 1);

      expect(result).toEqual(24);
    });

    it('throws if given function throws', () => {
      const input = { foo: 23, bar: 42 };
      const bad = () => {
        throw new TypeError('bad value');
      };

      const fn = () => readFrom(input, 'foo', bad);

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

  describe('readBoolean', () => {
    it('returns boolean values', () => {
      expect(readBoolean(true)).toBe(true);
      expect(readBoolean(false)).toBe(false);
    });

    it('throws for other types', () => {
      expect(() => readBoolean(23)).toThrowError('Expected boolean, got: 23');
      expect(() => readBoolean(null)).toThrowError('Expected boolean, got: null');
    });
  });

  describe('readString', () => {
    it('reads a string', () => {
      expect(readString('')).toEqual('');
      expect(readString('Foo')).toEqual('Foo');
      expect(readString('23')).toEqual('23');
    });

    it('accepts a string that matches a pattern', () => {
      expect(readString('foo', { pattern: /[a-z]/ })).toEqual('foo');
      expect(readString('foo', { pattern: /^[a-z]+$/ })).toEqual('foo');
    });

    it('throws if string does not match pattern', () => {
      expect(() => readString('23', { pattern: /[a-z]/ })).toThrowError(
        "Expected string matching pattern /[a-z]/, got: '23'"
      );
    });

    it('accepts a string that matches an enum', () => {
      expect(readString('foo', { enum: ['foo', 'bar'] })).toEqual('foo');
      expect(readString('bar', { enum: ['foo', 'bar'] })).toEqual('bar');
    });

    it('throws if string does not match enum', () => {
      expect(() => readString('baz', { enum: ['foo', 'bar'] })).toThrowError(
        "Expected one of ('foo', 'bar'), got: 'baz'"
      );
    });

    it('throws for other types', () => {
      expect(() => readString(null)).toThrowError('Expected string, got: null');
      expect(() => readString(23)).toThrowError('Expected string, got: 23');
      expect(() => readString([23])).toThrowError('Expected string, got: [23]');
    });
  });

  describe('readNumber', () => {
    it('returns numbers', () => {
      expect(readNumber(23)).toBe(23);
      expect(readNumber(-1.5)).toBe(-1.5);
    });

    it('accepts a number within given range', () => {
      expect(readNumber(0, { minimum: 0, maximum: 100 })).toBe(0);
      expect(readNumber(23, { minimum: 0, maximum: 100 })).toBe(23);
      expect(readNumber(100, { minimum: 0, maximum: 100 })).toBe(100);
    });

    it('throws if number exceeds given range', () => {
      expect(() => readNumber(23, { maximum: 10 })).toThrowError('Expected number <= 10, got: 23');
      expect(() => readNumber(-3, { minimum: 0 })).toThrowError('Expected number >= 0, got: -3');
    });

    it('throws for non-finite numbers', () => {
      expect(() => readNumber(NaN)).toThrowError('Expected number, got: NaN');
      expect(() => readNumber(Infinity)).toThrowError('Expected number, got: Infinity');
    });

    it('throws for other types', () => {
      expect(() => readNumber('23')).toThrowError("Expected number, got: '23'");
      expect(() => readNumber(null)).toThrowError('Expected number, got: null');
    });
  });

  describe('asDate', () => {
    it('returns date objects', () => {
      const date = new Date('2000-04-01T12:13:14.000Z');

      expect(readDate(date)).toBe(date);
    });

    it('throws for date strings', () => {
      expect(() => readDate('2000-04-01T12:13:14.000Z')).toThrowError(
        "Expected Date, got: '2000-04-01T12:13:14.000Z'"
      );
    });

    it('throws for other types', () => {
      expect(() => readDate(23)).toThrowError('Expected Date, got: 23');
      expect(() => readDate(null)).toThrowError('Expected Date, got: null');
    });
  });

  describe('readArray', () => {
    it('returns arrays', () => {
      expect(readArray([])).toEqual([]);
      expect(readArray(['foo'])).toEqual(['foo']);
    });

    it('accepts an array with a matching length', () => {
      expect(readArray([1], null, { minItems: 1, maxItems: 3 })).toEqual([1]);
      expect(readArray([1, 2, 3], null, { minItems: 1, maxItems: 3 })).toEqual([1, 2, 3]);
    });

    it('throws if array length exceeds given range', () => {
      expect(() => readArray([], null, { minItems: 1 })).toThrowError(
        'Expected array with minimum length 1, got: []'
      );
      expect(() => readArray([1, 2, 3, 4], null, { maxItems: 3 })).toThrowError(
        'Expected array with maximum length 3, got: [1, 2, 3, 4]'
      );
    });

    it('accepts an array with unique items', () => {
      expect(readArray([], null, { uniqueItems: true })).toEqual([]);
      expect(readArray([1], null, { uniqueItems: true })).toEqual([1]);
      expect(readArray(['foo'], null, { uniqueItems: true })).toEqual(['foo']);
      expect(readArray([1, 2, 3], null, { uniqueItems: true })).toEqual([1, 2, 3]);
      expect(readArray(['foo', 'bar'], null, { uniqueItems: true })).toEqual(['foo', 'bar']);
    });

    it('throws if array has duplicates', () => {
      expect(() => readArray([1, 2, 1], null, { uniqueItems: true })).toThrowError(
        'Expected array with unique items, got: [1, 2, 1]'
      );
      expect(() => readArray(['foo', 'bar', 'foo'], null, { uniqueItems: true })).toThrowError(
        "Expected array with unique items, got: ['foo', 'bar', 'foo']"
      );
    });

    it('accepts an array with matching items', () => {
      expect(readArray([], types.string())).toEqual([]);
      expect(readArray(['foo'], types.string())).toEqual(['foo']);
      expect(readArray([1, 2, 3], types.number())).toEqual([1, 2, 3]);
    });

    it('throws if array item does not match item type', () => {
      expect(() => readArray(['foo'], types.number())).toThrowError(
        `Invalid value for "0": Expected number, got: 'foo'`
      );
      expect(() => readArray([1, 2, 'foo', 4], types.number())).toThrowError(
        `Invalid value for "2": Expected number, got: 'foo'`
      );
    });

    it('throws for objects', () => {
      expect(() => readArray({})).toThrowError('Expected array, got: {}');
      expect(() => readArray(Uint8Array.of(1, 2, 3).buffer)).toThrowError(
        'Expected array, got: ArrayBuffer [1, 2, 3]'
      );
    });
  });

  describe('readObject', () => {
    it('returns objects', () => {
      expect(readObject({})).toEqual({});
      expect(readObject({ foo: 23 })).toEqual({ foo: 23 });
    });

    it('throws for other types', () => {
      expect(() => readObject(null)).toThrowError('Expected object, got: null');
      expect(() => readObject([])).toThrowError('Expected object, got: []');
      expect(() => readObject(new ArrayBuffer(3))).toThrowError(
        'Expected object, got: ArrayBuffer [0, 0, 0]'
      );
    });
  });

  describe('isObject', () => {
    it('returns true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ foo: 23 })).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isObject(null)).toBe(false); // typeof null === 'object'
      expect(isObject(0)).toBe(false);
      expect(isObject(Infinity)).toBe(false);
      expect(isObject(NaN)).toBe(false);
      expect(isObject('[object Object]')).toBe(false);
      expect(isObject([])).toBe(false); // typeof [] === 'object'
      expect(isObject([{}])).toBe(false); // [{}].toString() === '[object Object]'
      expect(isObject(new ArrayBuffer(3))).toBe(false);
      expect(isObject(new Date())).toBe(false);
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
