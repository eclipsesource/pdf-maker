import { describe, expect, it, jest } from '@jest/globals';
import { PDFRef } from 'pdf-lib';

import { embedImages, Image, loadImages, readImages } from '../src/images.js';
import { mkData } from './test-utils.js';

describe('images', () => {
  describe('readImages', () => {
    it('returns an empty array for missing images definition', () => {
      const images = readImages({});

      expect(images).toEqual([]);
    });

    it('returns images array', () => {
      const imagesDef = {
        foo: { data: mkData('Foo') },
        bar: { data: mkData('Bar') },
      };

      const images = readImages(imagesDef);

      expect(images).toEqual([
        { name: 'foo', data: mkData('Foo') },
        { name: 'bar', data: mkData('Bar') },
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

  describe('loadImages', () => {
    it('returns an empty array for empty images definition', async () => {
      const images = await loadImages([]);

      expect(images).toEqual([]);
    });
  });

  describe('embedImages', () => {
    it('embeds images in PDF document and attaches ref', async () => {
      let n = 1;
      const embedJpg = jest.fn().mockImplementation(() => Promise.resolve({ ref: PDFRef.of(n++) }));
      const doc = { embedJpg } as any;
      const images: Image[] = [
        { name: 'foo', data: mkData('Foo'), width: 100, height: 200 },
        { name: 'bar', data: mkData('Bar'), width: 100, height: 200 },
      ];

      await embedImages(images, doc);

      expect(images[0].pdfRef?.toString()).toEqual('1 0 R');
      expect(images[1].pdfRef?.toString()).toEqual('2 0 R');
    });

    it('throws when embedding fails', async () => {
      const embedJpg = (data: Uint8Array) =>
        str(data) === 'Bad' ? Promise.reject('Bad image') : Promise.resolve({ data });

      const doc = { embedJpg } as any;
      const images = [
        { name: 'good', data: mkData('Good'), width: 100, height: 200 },
        { name: 'bad', data: mkData('Bad'), width: 100, height: 200 },
      ];

      const promise = embedImages(images, doc);

      await expect(promise).rejects.toThrowError('Could not embed image "bad": Bad image');
    });
  });
});

function str(data: Uint8Array): string {
  return String.fromCharCode(...data);
}
