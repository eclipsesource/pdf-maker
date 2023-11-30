import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { createImageLoader, createImageStore } from './image-loader.js';
import { mkData } from './test/test-utils.js';

global.crypto ??= (crypto as any).webcrypto;

describe('image-loader', () => {
  describe('createImageLoader', () => {
    it('rejects for unknown image name', async () => {
      const loader = createImageLoader([]);

      await expect(loader.loadImage({ name: 'foo' })).rejects.toThrowError(
        "No image defined with name 'foo'"
      );
    });

    it('returns data and format', async () => {
      const image1 = { name: 'image1', data: mkData('Foo'), format: 'jpeg' as const };
      const image2 = { name: 'image2', data: mkData('Foo'), format: 'png' as const };
      const loader = createImageLoader([image1, image2]);

      const result1 = await loader.loadImage({ name: 'image1' });
      const result2 = await loader.loadImage({ name: 'image2' });

      expect(result1).toEqual({ data: mkData('Foo'), format: 'jpeg' });
      expect(result2).toEqual({ data: mkData('Foo'), format: 'png' });
    });
  });

  describe('ImageStore', () => {
    it('rejects if image could not be loaded', async () => {
      const loader = createImageLoader([]);
      const store = createImageStore(loader);

      await expect(store.selectImage({ name: 'foo' })).rejects.toThrowError(
        "Could not load image 'foo': No image defined with name 'foo'"
      );
    });

    it('reads width and height from JPEG image', async () => {
      const data = readFileSync(join(__dirname, './test/resources/liberty.jpg'));
      const loader = createImageLoader([{ name: 'liberty', data, format: 'jpeg' }]);

      const store = createImageStore(loader);
      const image = await store.selectImage({ name: 'liberty' });

      expect(image).toEqual({ name: 'liberty', data, format: 'jpeg', width: 160, height: 240 });
    });

    it('reads width and height from PNG image', async () => {
      const data = readFileSync(join(__dirname, './test/resources/torus.png'));
      const loader = createImageLoader([{ name: 'torus', data, format: 'png' }]);

      const store = createImageStore(loader);
      const image = await store.selectImage({ name: 'torus' });

      expect(image).toEqual({ name: 'torus', data, format: 'png', width: 256, height: 192 });
    });
  });
});
