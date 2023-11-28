import { describe, expect, it } from '@jest/globals';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createImageLoader } from './image-loader.js';
import { createImageStore, Image, readImages, registerImage } from './images.js';
import { fakePDFDocument, mkData } from './test/test-utils.js';

global.crypto ??= (crypto as any).webcrypto;

describe('images', () => {
  describe('readImages', () => {
    it('returns an empty array for missing images definition', () => {
      const images = readImages({});

      expect(images).toEqual([]);
    });

    it('returns images array', () => {
      const imagesDef = {
        foo: { data: mkData('Foo') },
        bar: { data: mkData('Bar'), format: 'jpeg' },
        baz: { data: mkData('Baz'), format: 'png' },
      };

      const images = readImages(imagesDef);

      expect(images).toEqual([
        { name: 'foo', data: mkData('Foo'), format: 'jpeg' },
        { name: 'bar', data: mkData('Bar'), format: 'jpeg' },
        { name: 'baz', data: mkData('Baz'), format: 'png' },
      ]);
    });

    it('throws on invalid type', () => {
      const fn = () => readImages(23);

      expect(fn).toThrowError('Expected object, got: 23');
    });

    it('throws on invalid image definition', () => {
      const fn = () => readImages({ foo: 23 });

      expect(fn).toThrowError('Invalid value for "foo": Expected object, got: 23');
    });

    it('throws on invalid image data', () => {
      const fn = () => readImages({ foo: { data: 23 } });

      expect(fn).toThrowError('Invalid value for "foo/data":');
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

  describe('registerImage', () => {
    it('embeds image in PDF document and attaches ref', () => {
      const doc = fakePDFDocument();
      const data = readFileSync(join(__dirname, './test/resources/liberty.jpg'));
      const image: Image = { name: 'foo', format: 'jpeg', data, width: 100, height: 200 };

      const pdfRef = registerImage(image, doc);

      expect(pdfRef.toString()).toEqual('1 0 R');
    });
  });
});
