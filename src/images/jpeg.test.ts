import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { isJpeg, readJpegInfo } from './jpeg.js';

describe('jpeg', () => {
  describe('isJpeg', () => {
    it('returns true for JPEG header', async () => {
      const data = new Uint8Array([0xff, 0xd8, 0xff]);

      expect(isJpeg(data)).toBe(true);
    });

    it('returns false for other data', async () => {
      expect(isJpeg(new Uint8Array())).toBe(false);
      expect(isJpeg(new Uint8Array([1, 2, 3]))).toBe(false);
    });
  });

  describe('readJpegInfo', () => {
    it('returns info', async () => {
      const libertyJpg = await readFile(join(__dirname, '../test/resources/liberty.jpg'));

      const info = readJpegInfo(libertyJpg);

      expect(info).toEqual({
        width: 160,
        height: 240,
        bitDepth: 8,
        colorSpace: 'rgb',
      });
    });
  });
});
