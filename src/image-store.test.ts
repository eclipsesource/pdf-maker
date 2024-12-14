import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ImageStore } from './image-store.ts';

const baseDir = import.meta.dirname;

describe('image-loader', () => {
  let libertyJpg: Uint8Array;
  let torusPng: Uint8Array;

  beforeAll(async () => {
    [libertyJpg, torusPng] = await Promise.all([
      readFile(join(baseDir, './test/resources/liberty.jpg')),
      readFile(join(baseDir, './test/resources/torus.png')),
    ]);
  });

  describe('ImageStore', () => {
    it('rejects if image could not be loaded', async () => {
      const store = new ImageStore([]);

      await expect(store.selectImage('foo')).rejects.toThrow("Could not load image 'foo'");
    });

    it('loads registered images', async () => {
      const store = new ImageStore([
        { name: 'liberty', data: libertyJpg, format: 'jpeg' },
        { name: 'torus', data: torusPng, format: 'png' },
      ]);

      const torus = await store.selectImage('torus');
      const liberty = await store.selectImage('liberty');

      expect(torus).toEqual(expect.objectContaining({ name: 'torus', data: torusPng }));
      expect(liberty).toEqual(expect.objectContaining({ name: 'liberty', data: libertyJpg }));
    });

    it('loads image from file system', async () => {
      const store = new ImageStore([]);

      const torusPath = join(baseDir, './test/resources/torus.png');
      const image = await store.selectImage(torusPath);

      expect(image).toEqual(expect.objectContaining({ name: torusPath, data: torusPng }));
    });

    it('reads format, width and height from JPEG image', async () => {
      const store = new ImageStore([{ name: 'liberty', data: libertyJpg, format: 'jpeg' }]);

      const image = await store.selectImage('liberty');

      expect(image).toEqual({
        name: 'liberty',
        format: 'jpeg',
        width: 160,
        height: 240,
        data: libertyJpg,
      });
    });

    it('reads format, width and height from PNG image', async () => {
      const store = new ImageStore([{ name: 'torus', data: torusPng, format: 'png' }]);

      const image = await store.selectImage('torus');

      expect(image).toEqual({
        name: 'torus',
        format: 'png',
        width: 256,
        height: 192,
        data: torusPng,
      });
    });

    it('returns same image object for concurrent calls', async () => {
      const store = new ImageStore([{ name: 'liberty', data: libertyJpg, format: 'jpeg' }]);

      const [image1, image2] = await Promise.all([
        store.selectImage('liberty'),
        store.selectImage('liberty'),
      ]);

      expect(image1).toBe(image2);
    });
  });
});
