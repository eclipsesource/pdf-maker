import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Box } from '../box.js';
import { ImageStore } from '../image-loader.js';
import { ImageSelector } from '../images.js';
import { MakerCtx } from '../maker-ctx.js';
import { ImageBlock } from '../read-block.js';
import { fakeImage } from '../test/test-utils.js';
import { layoutImageContent } from './layout-image.js';

const { objectContaining } = expect;

describe('layout-image', () => {
  let box: Box, ctx: MakerCtx;

  beforeEach(() => {
    const imageStore = {
      selectImage: vi.fn(async (selector: ImageSelector) => {
        const match = /^img-(\d+)-(\d+)$/.exec(selector.name);
        if (match) {
          return fakeImage(selector.name, Number(match[1]), Number(match[2]));
        }
        throw new Error(`Unknown image: ${selector.name}`);
      }),
    } as ImageStore;
    box = { x: 20, y: 30, width: 400, height: 700 };
    ctx = { imageStore } as MakerCtx;
  });

  describe('layoutImageContent', () => {
    it('respects fixed width and height', async () => {
      // width=1 and height=1 only *indicate* fixed width and height, the value should be ignored
      const block = { image: 'img-720-480', width: 1, height: 1 };
      box = { x: 20, y: 30, width: 200, height: 100 };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame).toEqual({
        objects: [objectContaining({ x: 20 + (200 - 150) / 2, y: 30, width: 150, height: 100 })],
        width: 200,
        height: 100,
      });
    });

    it('passes width and height to ImageStore', async () => {
      const block = { image: 'img-720-480', width: 30, height: 40 };
      box = { x: 20, y: 30, width: 200, height: 100 };

      await layoutImageContent(block, box, ctx);

      const selector = { name: 'img-720-480', width: 30, height: 40 };
      expect(ctx.imageStore.selectImage).toHaveBeenCalledWith(selector);
    });

    ['img-720-480', 'img-72-48'].forEach((image) => {
      describe(`with ${image}`, () => {
        it('scales image to fixed width', async () => {
          const block = { image, width: 1 };
          box = { x: 20, y: 30, width: 300, height: 500 };

          const { frame } = await layoutImageContent(block, box, ctx);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', width: 300, height: 200 })],
            width: 300,
            height: 200,
          });
        });

        it('scales image to fixed height', async () => {
          const block = { image, height: 1 };
          box = { x: 20, y: 30, width: 500, height: 200 };

          const { frame } = await layoutImageContent(block, box, ctx);

          expect(frame).toEqual({
            objects: [objectContaining({ type: 'image', width: 300, height: 200 })],
            width: box.width,
            height: 200,
          });
        });

        it('scales image to fit into fixed width and height', async () => {
          const block = { image, width: 1, height: 1 };
          box = { x: 20, y: 30, width: 300, height: 300 };

          const { frame } = await layoutImageContent(block, box, ctx);

          expect(frame.objects).toEqual([
            objectContaining({ type: 'image', width: 300, height: 200 }),
          ]);
        });
      });
    });

    it('does not scale image if no fixed bounds', async () => {
      const block = { image: 'img-72-48' };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 72, height: 48 })],
        width: box.width,
        height: 48,
      });
    });

    it('scales image down to fit into available width if no fixed bounds', async () => {
      const block = { image: 'img-720-480' };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame).toEqual({
        objects: [objectContaining({ type: 'image', width: 400, height: (400 * 2) / 3 })],
        width: box.width,
        height: (400 * 2) / 3,
      });
    });

    it('center-aligns image by default', async () => {
      const block = { image: 'img-72-48' };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame.objects).toEqual([
        objectContaining({ type: 'image', x: 20 + (400 - 72) / 2, y: 30 }),
      ]);
    });

    it('left-aligns image', async () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'left' };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20, y: 30 })]);
    });

    it('right-aligns image', async () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'right' };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20 + 400 - 72, y: 30 })]);
    });

    it('does not aligns image in block with auto width', async () => {
      const block: ImageBlock = { image: 'img-72-48', imageAlign: 'right', autoWidth: true };

      const { frame } = await layoutImageContent(block, box, ctx);

      expect(frame.objects).toEqual([objectContaining({ type: 'image', x: 20, y: 30 })]);
    });
  });
});
