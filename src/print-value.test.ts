import { describe, expect, it } from 'vitest';

import { printValue } from './print-value.ts';

describe('print-value', () => {
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
        'Date 2001-02-03T04:05:06.789Z',
      );
    });

    it('prints functions', () => {
      expect(printValue((x: unknown) => x)).toEqual('anonymous function');
      expect(printValue((x: unknown) => x)).toEqual('anonymous function');
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
