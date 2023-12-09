import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { Image, readImages, registerImage } from './images.js';
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

  describe('registerImage', () => {
    it('embeds image in PDF document and attaches ref', async () => {
      const doc = fakePDFDocument();
      const data = await readFile(join(__dirname, './test/resources/liberty.jpg'));
      const image: Image = { name: 'foo', format: 'jpeg', data, width: 100, height: 200 };

      const pdfRef = registerImage(image, doc);

      expect(pdfRef.toString()).toEqual('1 0 R');
    });
  });
});
