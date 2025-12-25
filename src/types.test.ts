import { describe, expect, it } from 'vitest';

import {
  dynamic,
  isObject,
  optional,
  pickDefined,
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
} from './types.ts';

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

    expect(fn).toThrow(new TypeError('Invalid value for "foo": bad value'));
  });

  it('merges nested error messages', () => {
    const input = 23;
    const bad = () => {
      throw new TypeError('bad value');
    };
    const nestedCheck = () => readAs(input, 'bar', bad);

    const fn = () => readAs(input, 'foo', nestedCheck);

    expect(fn).toThrow(new TypeError('Invalid value for "foo/bar": bad value'));
  });

  it('throws for missing value', () => {
    const fn = () => readAs(undefined, 'foo', required());

    expect(fn).toThrow(new TypeError('Missing value for "foo"'));
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

    expect(fn).toThrow(new TypeError('Invalid value for "foo": bad value'));
  });
});

describe('optional', () => {
  const fn = (n: unknown) => `${n}`;

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
  const fn = (n: unknown) => `${n}`;

  it('returns function that delegates to given function', () => {
    expect(required(fn)(23)).toEqual('23');
  });

  it('returns function that returns value if no function given', () => {
    expect(required()(23)).toEqual(23);
  });

  it('returns function that throws if input is undefined', () => {
    const wrapped = required(fn);

    expect(() => wrapped(undefined)).toThrow(new TypeError('Missing value'));
  });

  it('returns function that delegates to given function for falsy values', () => {
    expect(required(fn)(null)).toEqual('null');
    expect(required(fn)(false)).toEqual('false');
    expect(required(fn)('')).toEqual('');
  });
});

describe('dynamic', () => {
  const validate = dynamic(types.string(), 'test');

  describe('when applied to a fixed value', () => {
    it('returns a resolve function that returns the value', () => {
      const resolve = validate('foo');

      expect(resolve()).toEqual('foo');
    });

    it('throws immediately when value is invalid', () => {
      expect(() => validate(23)).toThrow(new TypeError('Expected string, got: 23'));
    });
  });

  describe('when applied to a function value', () => {
    it('returns a resolve function that calls function with arguments and returns result', () => {
      const resolve = validate((s: string) => 'foo' + s);

      expect(resolve('bar')).toEqual('foobar');
    });

    it('throws when function returns invalid value', () => {
      expect(validate(() => 23)).toThrow(
        new Error('Supplied function for "test" returned invalid value', {
          cause: new TypeError('Expected string, got: 23'),
        }),
      );
    });

    it('throws when function throws', () => {
      const resolve = validate(() => {
        throw new Error('test error');
      });

      expect(resolve).toThrow(
        new Error('Supplied function for "test" threw error', { cause: new Error('test error') }),
      );
    });
  });
});

describe('readBoolean', () => {
  it('returns boolean values', () => {
    expect(readBoolean(true)).toBe(true);
    expect(readBoolean(false)).toBe(false);
  });

  it('throws for other types', () => {
    expect(() => readBoolean(23)).toThrow(new TypeError('Expected boolean, got: 23'));
    expect(() => readBoolean(null)).toThrow(new TypeError('Expected boolean, got: null'));
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
    expect(() => readString('23', { pattern: /[a-z]/ })).toThrow(
      new TypeError("Expected string matching pattern /[a-z]/, got: '23'"),
    );
  });

  it('accepts a string that matches an enum', () => {
    expect(readString('foo', { enum: ['foo', 'bar'] })).toEqual('foo');
    expect(readString('bar', { enum: ['foo', 'bar'] })).toEqual('bar');
  });

  it('throws if string does not match enum', () => {
    expect(() => readString('baz', { enum: ['foo', 'bar'] })).toThrow(
      new TypeError("Expected one of ('foo', 'bar'), got: 'baz'"),
    );
  });

  it('throws for other types', () => {
    expect(() => readString(null)).toThrow(new TypeError('Expected string, got: null'));
    expect(() => readString(23)).toThrow(new TypeError('Expected string, got: 23'));
    expect(() => readString([23])).toThrow(new TypeError('Expected string, got: [23]'));
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
    expect(() => readNumber(23, { maximum: 10 })).toThrow(
      new TypeError('Expected number <= 10, got: 23'),
    );
    expect(() => readNumber(-3, { minimum: 0 })).toThrow(
      new TypeError('Expected number >= 0, got: -3'),
    );
  });

  it('throws for non-finite numbers', () => {
    expect(() => readNumber(NaN)).toThrow(new TypeError('Expected number, got: NaN'));
    expect(() => readNumber(Infinity)).toThrow(new TypeError('Expected number, got: Infinity'));
  });

  it('throws for other types', () => {
    expect(() => readNumber('23')).toThrow(new TypeError("Expected number, got: '23'"));
    expect(() => readNumber(null)).toThrow(new TypeError('Expected number, got: null'));
  });
});

describe('readDate', () => {
  it('returns date objects', () => {
    const date = new Date('2000-04-01T12:13:14.000Z');

    expect(readDate(date)).toBe(date);
  });

  it('throws for date strings', () => {
    expect(() => readDate('2000-04-01T12:13:14.000Z')).toThrow(
      new TypeError("Expected Date, got: '2000-04-01T12:13:14.000Z'"),
    );
  });

  it('throws for other types', () => {
    expect(() => readDate(23)).toThrow(new TypeError('Expected Date, got: 23'));
    expect(() => readDate(null)).toThrow(new TypeError('Expected Date, got: null'));
  });

  it('throws for invalid Date objects', () => {
    expect(() => readDate(new Date('invalid date'))).toThrow(
      new TypeError('Expected valid Date, got: Invalid Date'),
    );
  });
});

describe('readArray', () => {
  it('returns arrays', () => {
    expect(readArray([])).toEqual([]);
    expect(readArray(['foo'])).toEqual(['foo']);
  });

  it('accepts an array with a matching length', () => {
    expect(readArray([1], undefined, { minItems: 1, maxItems: 3 })).toEqual([1]);
    expect(readArray([1, 2, 3], undefined, { minItems: 1, maxItems: 3 })).toEqual([1, 2, 3]);
  });

  it('throws if array length exceeds given range', () => {
    expect(() => readArray([], undefined, { minItems: 1 })).toThrow(
      new TypeError('Expected array with minimum length 1, got: []'),
    );
    expect(() => readArray([1, 2, 3, 4], undefined, { maxItems: 3 })).toThrow(
      new TypeError('Expected array with maximum length 3, got: [1, 2, 3, 4]'),
    );
  });

  it('accepts an array with unique items', () => {
    expect(readArray([], undefined, { uniqueItems: true })).toEqual([]);
    expect(readArray([1], undefined, { uniqueItems: true })).toEqual([1]);
    expect(readArray(['foo'], undefined, { uniqueItems: true })).toEqual(['foo']);
    expect(readArray([1, 2, 3], undefined, { uniqueItems: true })).toEqual([1, 2, 3]);
    expect(readArray(['foo', 'bar'], undefined, { uniqueItems: true })).toEqual(['foo', 'bar']);
  });

  it('throws if array has duplicates', () => {
    expect(() => readArray([1, 2, 1], undefined, { uniqueItems: true })).toThrow(
      new TypeError('Expected array with unique items, got: [1, 2, 1]'),
    );
    expect(() => readArray(['foo', 'bar', 'foo'], undefined, { uniqueItems: true })).toThrow(
      new TypeError("Expected array with unique items, got: ['foo', 'bar', 'foo']"),
    );
  });

  it('accepts an array with matching items', () => {
    expect(readArray([], types.string())).toEqual([]);
    expect(readArray(['foo'], types.string())).toEqual(['foo']);
    expect(readArray([1, 2, 3], types.number())).toEqual([1, 2, 3]);
  });

  it('throws if array item does not match item type', () => {
    expect(() => readArray(['foo'], types.number())).toThrow(
      new TypeError(`Invalid value for "0": Expected number, got: 'foo'`),
    );
    expect(() => readArray([1, 2, 'foo', 4], types.number())).toThrow(
      new TypeError(`Invalid value for "2": Expected number, got: 'foo'`),
    );
  });

  it('throws for objects', () => {
    expect(() => readArray({})).toThrow(new TypeError('Expected array, got: {}'));
    expect(() => readArray(Uint8Array.of(1, 2, 3).buffer)).toThrow(
      new TypeError('Expected array, got: ArrayBuffer [1, 2, 3]'),
    );
  });
});

describe('readObject', () => {
  it('returns objects', () => {
    expect(readObject({})).toEqual({});
    expect(readObject({ foo: 23 })).toEqual({ foo: 23 });
  });

  it('throws for other types', () => {
    expect(() => readObject(null)).toThrow(new TypeError('Expected object, got: null'));
    expect(() => readObject([])).toThrow(new TypeError('Expected object, got: []'));
    expect(() => readObject(new ArrayBuffer(3))).toThrow(
      new TypeError('Expected object, got: ArrayBuffer [0, 0, 0]'),
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
