import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutImageBlock } from '../src/layout-image.js';
import { ImageBlock } from '../src/read-block.js';
import { fakeImage } from './test-utils.js';

const { objectContaining } = expect;

describe('layout-image', () => {
  let box, doc;

  beforeEach(() => {
    const images = [fakeImage('img-720-480', 720, 480), fakeImage('img-72-48', 72, 48)];
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { images };
  });

  describe('layoutImageBlock', () => {
    it('respects fixed width and height', () => {
      const block = { image: 'img-720-480', width: 200, height: 100 };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame).toEqual(objectContaining({ x: 20, y: 30, width: 200, height: 100 }));
    });

    ['img-720-480', 'img-72-48'].forEach((image) => {
      describe(`with ${image}`, () => {
        it('scales image to fixed width', () => {
          const block = { image, width: 300 };

          const frame = layoutImageBlock(block, box, doc);

          expect(frame).toEqual(objectContaining({ x: 20, y: 30, width: 300, height: 200 }));
          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });

        it('scales image to fixed height', () => {
          const block = { image, height: 200 };

          const frame = layoutImageBlock(block, box, doc);

          expect(frame).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: 200 }));
          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });

        it('scales image to fit into fixed width and height', () => {
          const block = { image, width: 300, height: 300 };

          const frame = layoutImageBlock(block, box, doc);

          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });
      });
    });

    it('does not scale image if no fixed bounds', () => {
      const block = { image: 'img-72-48' };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: 48 }));
      expect(frame.objects).toEqual([objectContaining({ type: 'image', width: 72, height: 48 })]);
    });

    it('scales image down to fit into available width if no fixed bounds', () => {
      const block = { image: 'img-720-480' };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame).toEqual(objectContaining({ x: 20, y: 30, width: 400, height: (400 * 2) / 3 }));
      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', width: 400, height: (400 * 2) / 3 }),
      ]);
    });

    it('includes padding', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { image: 'img-720-480', padding };

      const frame = layoutImageBlock(block, box, doc);

      const imgWidth = 400 - 5 - 6;
      const imgHeight = imgWidth / 1.5;
      expect(frame).toEqual(
        objectContaining({ x: 20, y: 30, width: 400, height: imgHeight + 7 + 8 })
      );
      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', x: 5, y: 7, width: imgWidth, height: imgHeight }),
      ]);
    });

    it('center-aligns image by default', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { image: 'img-72-48', padding };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', x: 5 + (400 - 72 - 5 - 6) / 2, y: 7 }),
      ]);
    });

    it('left-aligns image', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block: ImageBlock = { image: 'img-72-48', padding, imageAlign: 'left' };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 5, y: 7 })]);
    });

    it('right-aligns image', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block: ImageBlock = { image: 'img-72-48', padding, imageAlign: 'right' };

      const frame = layoutImageBlock(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 400 - 72 - 6, y: 7 })]);
    });
  });
});
