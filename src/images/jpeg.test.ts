import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isJpeg, readJpegInfo } from './jpeg.ts';

describe('isJpeg', () => {
  it('returns true for JPEG header', () => {
    const data = new Uint8Array([0xff, 0xd8, 0xff]);

    expect(isJpeg(data)).toBe(true);
  });

  it('returns false for other data', () => {
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
