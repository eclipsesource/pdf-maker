import { beforeEach, describe, expect, it } from '@jest/globals';

import { Box } from './box.js';
import { Document } from './document.js';
import { createImageStore } from './images.js';
import { layoutImageContent } from './layout-image.js';
import { ImageBlock } from './read-block.js';
import { fakeImage } from './test/test-utils.js';

const { objectContaining } = expect;

describe('layout-image', () => {
  let box: Box, doc: Document;

  beforeEach(() => {
    const imageStore = createImageStore([
      fakeImage('img-720-480', 720, 480),
      fakeImage('img-72-48', 72, 48),
    ]);
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { imageStore } as Document;
  });

  describe('layoutImageContent', () => {
    it('respects fixed width and height', () => {
      // width=1 and height=1 only *indicate* fixed width and height, the value should be ignored
      const block = { image: 'img-720-480', width: 1, height: 1 };
      box = { x: 20, y: 30, width: 200, height: 100 };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ x: 20 + (200 - 150) / 2, y: 30, width: 150, height: 100 })],
        width: 200,
        height: 100,
      });
    });

    ['img-720-480', 'img-72-48'].forEach((image) => {
      describe(`with ${image}`, () => {
        it('scales image to fixed width', () => {
          const block = { image, width: 1 };
          box = { x: 20, y: 30, width: 300, height: 500 };

          const { frame } = layoutImageContent(block, box, doc);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', width: 300, height: 200 })],
            width: 300,
            height: 200,
          });
        });

        it('scales image to fixed height', () => {
          const block = { image, height: 1 };
          box = { x: 20, y: 30, width: 500, height: 200 };

          const { frame } = layoutImageContent(block, box, doc);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', width: 300, height: 200 })],
            width: box.width,
            height: 200,
          });
        });

        it('scales image to fit into fixed width and height', () => {
          const block = { image, width: 1, height: 1 };
          box = { x: 20, y: 30, width: 300, height: 300 };

          const { frame } = layoutImageContent(block, box, doc);

          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });
      });
    });

    it('does not scale image if no fixed bounds', () => {
      const block = { image: 'img-72-48' };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 72, height: 48 })],
        width: box.width,
        height: 48,
      });
    });

    it('scales image down to fit into available width if no fixed bounds', () => {
      const block = { image: 'img-720-480' };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 400, height: (400 * 2) / 3 })],
        width: box.width,
        height: (400 * 2) / 3,
      });
    });

    it('center-aligns image by default', () => {
      const block = { image: 'img-72-48' };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', x: 20 + (400 - 72) / 2, y: 30 }),
      ]);
    });

    it('left-aligns image', () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'left' };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20, y: 30 })]);
    });

    it('right-aligns image', () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'right' };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20 + 400 - 72, y: 30 })]);
    });

    it('does not aligns image in block with auto width', () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'right', autoWidth: true };

      const { frame } = layoutImageContent(block, box, doc);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20, y: 30 })]);
    });
  });
});
