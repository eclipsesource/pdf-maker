import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isPng, readPngInfo } from './png.ts';

describe('isPng', () => {
  it('returns true if PNG header found', () => {
    const info = isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    expect(info).toBe(true);
  });

  it('returns false for other data', () => {
    expect(isPng(new Uint8Array())).toBe(false);
    expect(isPng(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
  });
});

describe('readPngInfo', () => {
  it('returns info', async () => {
    const torusPng = await readFile(join(__dirname, '../test/resources/torus.png'));

    const info = readPngInfo(torusPng);

    expect(info).toEqual({
      width: 256,
      height: 192,
      bitDepth: 8,
      colorSpace: 'rgb',
      hasAlpha: true,
      isIndexed: false,
      isInterlaced: false,
    });
  });

  it('throws if PNG signature is missing', () => {
    const data = new Uint8Array(40);
    data.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR chunk

    expect(() => readPngInfo(data)).toThrow('Invalid PNG data');
  });

  it('throws if IHDR chunk is missing', () => {
    const data = new Uint8Array(40);
    data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG signature

    expect(() => readPngInfo(data)).toThrow('Invalid PNG data');
  });

  it('throws if too short', () => {
    const data = new Uint8Array(32);
    data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG signature
    data.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR chunk

    expect(() => readPngInfo(data)).toThrow('Invalid PNG data');
  });
});
