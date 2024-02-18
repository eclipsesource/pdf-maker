import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isPng, readPngInfo } from './png.js';

describe('png', () => {
  describe('isPng', () => {
    it('returns true if PNG header found', async () => {
      const info = isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      expect(info).toBe(true);
    });

    it('returns false for other data', async () => {
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
  });
});
