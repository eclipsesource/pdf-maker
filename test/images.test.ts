import { describe, expect, it, jest } from '@jest/globals';

import { embedImages, parseImages } from '../src/images.js';

describe('images', () => {
  describe('parseImages', () => {
    it('returns an empty array for missing images definition', async () => {
      const images = await parseImages(undefined);

      expect(images).toEqual([]);
    });

    it('returns images array', () => {
      const fontsDef = {
        foo: mkData('Foo'),
        bar: mkData('Bar'),
      };

      const images = parseImages(fontsDef);

      expect(images).toEqual([
        { name: 'foo', data: mkData('Foo') },
        { name: 'bar', data: mkData('Bar') },
      ]);
    });

    it('throws on invalid image data', () => {
      const fn = () => parseImages({ foo: 23 });

      expect(fn).toThrowError('Invalid value for "image data for foo":');
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
      const fontsDef = [
        { name: 'foo', data: mkData('Foo') },
        { name: 'bar', data: mkData('Bar') },
      ];

      const images = await embedImages(fontsDef, doc);

      expect(images).toEqual([
        { name: 'foo', pdfImage: { data: mkData('Foo') } },
        { name: 'bar', pdfImage: { data: mkData('Bar') } },
      ]);
    });

    it('throws when embedding fails', async () => {
      const embedJpg = (data) =>
        data === 'Bad_Data' ? Promise.reject('Bad image') : Promise.resolve({ data });
      const doc = { embedJpg } as any;
      const fontsDef = [
        { name: 'good', data: 'Good_Data' },
        { name: 'bad', data: 'Bad_Data' },
      ];

      const promise = embedImages(fontsDef, doc);

      await expect(promise).rejects.toThrowError('Could not embed image "bad": Bad image');
    });
  });
});

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
