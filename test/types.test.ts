import { describe, expect, it } from '@jest/globals';

import {
  asArray,
  asBoolean,
  asNumber,
  asObject,
  check,
  getFrom,
  optional,
  pickDefined,
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

    it('throws for non-boolean values', () => {
      expect(() => asBoolean(23)).toThrowError('Expected boolean, got: 23');
      expect(() => asBoolean(null)).toThrowError('Expected boolean, got: null');
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
  });

  describe('asArray', () => {
    it('returns arrays', () => {
      expect(asArray([])).toEqual([]);
      expect(asArray(['foo'])).toEqual(['foo']);
    });

    it('throws for objects', () => {
      expect(() => asArray({})).toThrowError('Expected array, got: [object Object]');
      expect(() => asArray(new ArrayBuffer(3))).toThrowError(
        'Expected array, got: [object ArrayBuffer]'
      );
    });
  });

  describe('asObject', () => {
    it('returns objects', () => {
      expect(asObject({})).toEqual({});
      expect(asObject(new ArrayBuffer(3))).toEqual(new ArrayBuffer(3));
    });

    it('throws for arrays', () => {
      expect(() => asObject([])).toThrowError('Expected object, got: ');
    });
  });
});
