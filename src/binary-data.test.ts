import { describe, expect, it } from 'vitest';

import { readBinaryData } from './binary-data.ts';

describe('readBinaryData', () => {
  it('returns original Uint8Array', () => {
    const data = Uint8Array.of(1, 183, 0);

    expect(readBinaryData(data)).toBe(data);
  });

  it('throws for ArrayBuffer', () => {
    const buffer = Uint8Array.of(1, 183, 0).buffer;

    expect(() => readBinaryData(buffer)).toThrow(
      new TypeError('Expected Uint8Array, got: ArrayBuffer [1, 183, 0]'),
    );
  });

  it('throws for strings', () => {
    expect(() => readBinaryData('AbcA')).toThrow(new TypeError("Expected Uint8Array, got: 'AbcA'"));
  });

  it('throws for other types', () => {
    expect(() => readBinaryData(23)).toThrow(new TypeError('Expected Uint8Array, got: 23'));
    expect(() => readBinaryData(null)).toThrow(new TypeError('Expected Uint8Array, got: null'));
  });
});
