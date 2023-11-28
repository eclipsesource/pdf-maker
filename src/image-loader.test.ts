import { describe, expect, it } from '@jest/globals';
import crypto from 'crypto';

import { createImageLoader } from './image-loader.js';
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
});
