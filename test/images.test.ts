import { describe, expect, it, jest } from '@jest/globals';

import { embedImages, parseImages } from '../src/images.js';

describe('images', () => {
  describe('parseImages', () => {
    it('returns an empty array for missing images definition', () => {
      const images = parseImages({});

      expect(images).toEqual([]);
    });

    it('returns images array', () => {
      const imagesDef = {
        foo: { data: mkData('Foo') },
        bar: { data: mkData('Bar') },
      };

      const images = parseImages(imagesDef);

      expect(images).toEqual([
        { name: 'foo', data: mkData('Foo') },
        { name: 'bar', data: mkData('Bar') },
      ]);
    });

    it('throws on invalid type', () => {
      const fn = () => parseImages(23);

      expect(fn).toThrowError('Invalid value for "images": Expected object, got: 23');
    });

    it('throws on invalid image definition', () => {
      const fn = () => parseImages({ foo: 23 });

      expect(fn).toThrowError('Invalid value for "images[\'foo\']": Expected object, got: 23');
    });

    it('throws on invalid image data', () => {
      const fn = () => parseImages({ foo: { data: 23 } });

      expect(fn).toThrowError('Invalid value for "images[\'foo\'].data":');
    });
  });

  describe('embedImages', () => {
    it('returns an empty array for empty images definition', async () => {
      const images = await embedImages([], {} as any);

      expect(images).toEqual([]);
    });

    it('embeds images in PDF document and returns images array', async () => {
      const embedJpg = jest.fn().mockImplementation((data) => Promise.resolve({ data }));
      const doc = { embedJpg } as any;
      const imageDefs = [
        { name: 'foo', data: mkData('Foo') },
        { name: 'bar', data: mkData('Bar') },
      ];

      const images = await embedImages(imageDefs, doc);

      expect(images).toEqual([
        { name: 'foo', pdfImage: { data: mkData('Foo') } },
        { name: 'bar', pdfImage: { data: mkData('Bar') } },
      ]);
    });

    it('throws when embedding fails', async () => {
      const embedJpg = (data) =>
        data === 'Bad_Data' ? Promise.reject('Bad image') : Promise.resolve({ data });
      const doc = { embedJpg } as any;
      const imagesDef = [
        { name: 'good', data: 'Good_Data' },
        { name: 'bad', data: 'Bad_Data' },
      ];

      const promise = embedImages(imagesDef, doc);

      await expect(promise).rejects.toThrowError('Could not embed image "bad": Bad image');
    });
  });
});

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
