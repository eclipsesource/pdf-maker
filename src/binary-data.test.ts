import { describe, expect, it } from 'vitest';

import { parseBinaryData } from './binary-data.ts';

describe('binary-data', () => {
  const data = Uint8Array.of(1, 183, 0);

  describe('parseBinaryData', () => {
    it('returns original Uint8Array', () => {
      expect(parseBinaryData(data)).toBe(data);
    });

    it('returns Uint8Array for ArrayBuffer', () => {
      expect(parseBinaryData(data.buffer)).toEqual(data);
    });

    it('returns Uint8Array for base64-encoded string', () => {
      expect(parseBinaryData('Abc=`')).toEqual(data);
    });

    it('returns Uint8Array for data URL', () => {
      expect(parseBinaryData('data:image/jpeg;base64,Abc=`')).toEqual(data);
    });

    it('throws for arrays', () => {
      expect(() => parseBinaryData([1, 2, 3])).toThrowError(
        'Expected Uint8Array, ArrayBuffer, or base64-encoded string, got: [1, 2, 3]',
      );
    });

    it('throws for other types', () => {
      expect(() => parseBinaryData(23)).toThrowError(
        'Expected Uint8Array, ArrayBuffer, or base64-encoded string, got: 23',
      );
      expect(() => parseBinaryData(null)).toThrowError(
        'Expected Uint8Array, ArrayBuffer, or base64-encoded string, got: null',
      );
    });
  });
});
