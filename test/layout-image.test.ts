import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutImageContent } from '../src/layout-image.js';
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

  describe('layoutImageContent', () => {
    it('respects fixed width and height', () => {
      const block = { image: 'img-720-480', width: 1, height: 1 }; // indicate fixed width and height
      box = { x: 20, y: 30, width: 200, height: 100 };
      const frame = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ x: 20 + (200 - 150) / 2, y: 30, width: 150, height: 100 })],
        height: 100,
      });
    });

    ['img-720-480', 'img-72-48'].forEach((image) => {
      describe(`with ${image}`, () => {
        it('scales image to fixed width', () => {
          const block = { image, width: 1 };
          box = { x: 20, y: 30, width: 300, height: 200 };

          const frame = layoutImageContent(block, box, doc);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', height: 200 })],
            height: 200,
          });
        });

        it('scales image to fixed height', () => {
          const block = { image, height: 1 };
          box = { x: 20, y: 30, width: 300, height: 200 };

          const frame = layoutImageContent(block, box, doc);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', width: 300, height: 200 })],
            height: 200,
          });
        });

        it('scales image to fit into fixed width and height', () => {
          const block = { image, width: 1, height: 1 };
          box = { x: 20, y: 30, width: 300, height: 300 };

          const frame = layoutImageContent(block, box, doc);

          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });
      });
    });

    it('does not scale image if no fixed bounds', () => {
      const block = { image: 'img-72-48' };

      const frame = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 72, height: 48 })],
        height: 48,
      });
    });

    it('scales image down to fit into available width if no fixed bounds', () => {
      const block = { image: 'img-720-480' };

      const frame = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 400, height: (400 * 2) / 3 })],
        height: (400 * 2) / 3,
      });
    });

    it('center-aligns image by default', () => {
      const block = { image: 'img-72-48' };

      const frame = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', x: 20 + (400 - 72) / 2, y: 30 }),
      ]);
    });

    it('left-aligns image', () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'left' };

      const frame = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20, y: 30 })]);
    });

    it('right-aligns image', () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'right' };

      const frame = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20 + 400 - 72, y: 30 })]);
    });
  });
});
