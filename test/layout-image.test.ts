import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutImage } from '../src/layout-image.js';
import { fakeImage } from './test-utils.js';

const { arrayContaining, objectContaining } = expect;

describe('layout-image', () => {
  let box, doc;

  beforeEach(() => {
    const images = [fakeImage('img-720-480', 720, 480), fakeImage('img-72-48', 72, 48)];
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { images };
  });

  describe('layoutImage', () => {
    it('respects fixed width and height', () => {
      const block = { image: 'img-720-480', width: 200, height: 100 };

      const result = layoutImage(block, box, doc);

      expect(result).toEqual(
        objectContaining({ type: 'paragraph', x: 20, y: 30, width: 200, height: 100 })
      );
    });

    ['img-720-480', 'img-72-48'].forEach((image) => {
      describe(`with ${image}`, () => {
        it('scales image to fixed width', () => {
          const block = { image, width: 300 };

          const result = layoutImage(block, box, doc);

          expect(result).toEqual(objectContaining({ x: 20, y: 30, width: 300, height: 200 }));
          expect(result.objects[0]).toEqual(
            objectContaining({ type: 'image', x: 0, y: 0, width: 300, height: 200 })
          );
        });

        it('scales image to fixed height', () => {
          const block = { image, height: 200 };

          const result = layoutImage(block, box, doc);

          expect(result).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: 200 }));
          expect(result.objects[0]).toEqual(
            objectContaining({ type: 'image', x: 0, y: 0, width: 300, height: 200 })
          );
        });

        it('scales image to fit into fixed width and height', () => {
          const block = { image, width: 300, height: 300 };

          const result = layoutImage(block, box, doc);

          expect(result.objects[0]).toEqual(
            objectContaining({ type: 'image', x: 0, y: 0, width: 300, height: 200 })
          );
        });
      });
    });

    it('does not scale image if no fixed bounds', () => {
      const block = { image: 'img-72-48' };

      const result = layoutImage(block, box, doc);

      expect(result).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: 48 }));
      expect(result.objects[0]).toEqual(
        objectContaining({ type: 'image', x: 0, y: 0, width: 72, height: 48 })
      );
    });

    it('scales image down to fit into available width if no fixed bounds', () => {
      const block = { image: 'img-720-480' };

      const result = layoutImage(block, box, doc);

      expect(result).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: (400 * 2) / 3 }));
      expect(result.objects[0]).toEqual(
        objectContaining({ type: 'image', x: 0, y: 0, width: 400, height: (400 * 2) / 3 })
      );
    });

    it('includes padding', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { image: 'img-720-480', padding };

      const result = layoutImage(block, box, doc);

      const imgWidth = 400 - 5 - 6;
      const imgHeight = imgWidth / 1.5;
      expect(result).toEqual(
        objectContaining({ x: 20, y: 30, width: 400, height: imgHeight + 7 + 8 })
      );
      expect(result.objects[0]).toEqual(
        objectContaining({ type: 'image', x: 5, y: 7, width: imgWidth, height: imgHeight })
      );
    });

    it('includes anchor object for id', () => {
      const block = { image: 'img-720-480', id: 'test' };

      const result = layoutImage(block, box, doc);

      expect(result.objects).toEqual(
        arrayContaining([objectContaining({ type: 'anchor', name: 'test', x: 0, y: 0 })])
      );
    });
  });
});
