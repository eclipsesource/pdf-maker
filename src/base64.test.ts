import { describe, expect, it } from 'vitest';

import { decodeBase64 } from './base64.ts';

describe('decodeBase64', () => {
  it('decodes base64 strings', () => {
    expect(decodeBase64('')).toEqual(new Uint8Array());
    expect(decodeBase64('AA==')).toEqual(new Uint8Array([0]));
    expect(decodeBase64('AAE=')).toEqual(new Uint8Array([0, 1]));
    expect(decodeBase64('AAEC')).toEqual(new Uint8Array([0, 1, 2]));
  });

  it('decodes longer base64 strings', () => {
    const base64 = (input: Uint8Array) => Buffer.from(input).toString('base64');
    const array1 = new Uint8Array([...Array(256).keys()]);
    const array2 = new Uint8Array([...Array(257).keys()]);
    const array3 = new Uint8Array([...Array(258).keys()]);

    expect(decodeBase64(base64(array1))).toEqual(array1);
    expect(decodeBase64(base64(array2))).toEqual(array2);
    expect(decodeBase64(base64(array3))).toEqual(array3);
  });

  it('fails if string is not a multiple of 4', () => {
    expect(() => decodeBase64('A')).toThrow(
      'Invalid base64 string: length must be a multiple of 4',
    );
    expect(() => decodeBase64('AA')).toThrow(
      'Invalid base64 string: length must be a multiple of 4',
    );
    expect(() => decodeBase64('AAA')).toThrow(
      'Invalid base64 string: length must be a multiple of 4',
    );
  });

  it('fails if string contains invalid characters', () => {
    expect(() => decodeBase64('ABØ=')).toThrow("Invalid Base64 character 'Ø' at position 2");
  });
});
