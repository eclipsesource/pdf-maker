import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createImageLoader, createImageStore, ImageLoader } from './image-loader.js';
import { ImageSelector } from './images.js';

global.crypto ??= (crypto as any).webcrypto;

describe('image-loader', () => {
  let libertyJpg: Uint8Array;
  let torusPng: Uint8Array;

  beforeAll(async () => {
    [libertyJpg, torusPng] = await Promise.all([
      readFile(join(__dirname, './test/resources/liberty.jpg')),
      readFile(join(__dirname, './test/resources/torus.png')),
    ]);
  });

  describe('createImageLoader', () => {
    it('rejects if image cannot be loaded', async () => {
      const loader = createImageLoader([]);

      await expect(loader.loadImage({ name: 'foo' })).rejects.toThrowError(
        "Could not load image 'foo': ENOENT: no such file or directory, open 'foo'",
      );
    });

    it('returns data and metadata for registered images', async () => {
      const image1 = { name: 'image1', data: libertyJpg, format: 'jpeg' as const };
      const image2 = { name: 'image2', data: torusPng, format: 'png' as const };
      const loader = createImageLoader([image1, image2]);

      const result1 = await loader.loadImage({ name: 'image1' });
      const result2 = await loader.loadImage({ name: 'image2' });

      expect(result1).toEqual({ data: libertyJpg });
      expect(result2).toEqual({ data: torusPng });
    });

    it('loads images from file system and returns data and metadata', async () => {
      const loader = createImageLoader([]);

      const result1 = await loader.loadImage({ name: 'src/test/resources/liberty.jpg' });
      const result2 = await loader.loadImage({ name: 'src/test/resources/torus.png' });

      expect(result1).toEqual({ data: libertyJpg });
      expect(result2).toEqual({ data: torusPng });
    });
  });

  describe('ImageStore', () => {
    let imageLoader: ImageLoader;

    beforeEach(() => {
      imageLoader = {
        loadImage: vi.fn(async (selector: ImageSelector) => {
          if (selector.name === 'liberty') return { data: libertyJpg };
          if (selector.name === 'torus') return { data: torusPng };
          throw new Error('No such image');
        }),
      };
    });

    it('rejects if image could not be loaded', async () => {
      const store = createImageStore(imageLoader);

      await expect(store.selectImage({ name: 'foo' })).rejects.toThrowError(
        "Could not load image 'foo': No such image",
      );
    });

    it('reads format, width and height from JPEG image', async () => {
      const store = createImageStore(imageLoader);

      const image = await store.selectImage({ name: 'liberty' });

      expect(image).toEqual({
        name: 'liberty',
        format: 'jpeg',
        width: 160,
        height: 240,
        data: libertyJpg,
      });
    });

    it('reads format, width and height from PNG image', async () => {
      const store = createImageStore(imageLoader);

      const image = await store.selectImage({ name: 'torus' });

      expect(image).toEqual({
        name: 'torus',
        format: 'png',
        width: 256,
        height: 192,
        data: torusPng,
      });
    });

    it('calls image loader only once per selector', async () => {
      const store = createImageStore(imageLoader);

      await store.selectImage({ name: 'liberty' });
      await store.selectImage({ name: 'liberty' });

      expect(imageLoader.loadImage).toHaveBeenCalledTimes(1);
    });

    it('returns same image object for concurrent calls', async () => {
      const store = createImageStore(imageLoader);

      const [image1, image2] = await Promise.all([
        store.selectImage({ name: 'liberty' }),
        store.selectImage({ name: 'liberty' }),
      ]);

      expect(image1).toBe(image2);
    });

    it('caches errors from image loader', async () => {
      const store = createImageStore(imageLoader);

      await expect(store.selectImage({ name: 'foo' })).rejects.toThrowError(
        "Could not load image 'foo': No such image",
      );
      await expect(store.selectImage({ name: 'foo' })).rejects.toThrowError(
        "Could not load image 'foo': No such image",
      );
      expect(imageLoader.loadImage).toHaveBeenCalledTimes(1);
    });
  });
});
