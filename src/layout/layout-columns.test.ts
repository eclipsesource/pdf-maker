import { beforeEach, describe, expect, it } from 'vitest';

import type { Box } from '../box.ts';
import { FontStore } from '../font-store.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { Block, ColumnsBlock } from '../read/read-block.ts';
import { fakeFont, span } from '../test/test-utils.ts';
import { layoutColumnsContent } from './layout-columns.ts';

describe('layout-columns', () => {
  let ctx: MakerCtx;
  let box: Box;

  beforeEach(() => {
    const fontStore = new FontStore();
    fontStore.selectFont = () => {
      return Promise.resolve(fakeFont('Test'));
    };
    ctx = { fontStore } as MakerCtx;
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutColumnsContent', () => {
    it('creates empty frame for empty columns array', async () => {
      const block: ColumnsBlock = { type: 'columns', columns: [] };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({ children: [], width: box.width, height: 0 });
    });

    it('creates child for column with fixed width and height', async () => {
      const block: ColumnsBlock = {
        type: 'columns',
        columns: [{ type: 'empty', width: 100, height: 50 }],
      };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [{ x: 20, y: 30, width: 100, height: 50 }],
        width: box.width,
        height: 50,
      });
    });

    it('does not include block padding in height of frame', async () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block: ColumnsBlock = {
        type: 'columns',
        columns: [{ type: 'empty', width: 100, height: 50 }],
        padding,
      };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame.height).toEqual(50);
    });

    it('returns frame with fixed width for block with auto width', async () => {
      const block: ColumnsBlock = {
        type: 'columns',
        columns: [{ type: 'empty', width: 100, height: 50 }],
        autoWidth: true,
      };

      const { frame, remainder } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual(expect.objectContaining({ width: 100, height: 50 }));
      expect(remainder).toBeUndefined();
    });

    it("passes auto width down to children that don't have a fixed width", async () => {
      const block: ColumnsBlock = {
        type: 'columns',
        columns: [
          { type: 'text', text: [span('foo')], width: 50 }, // column with fixed width
          { type: 'text', text: [span('bar')] }, // flexible column
        ],
        autoWidth: true,
      };

      const { frame, remainder } = await layoutColumnsContent(block, box, ctx);

      expect(frame.children).toEqual([
        expect.objectContaining({ width: 50 }), // keeps fixed width
        expect.objectContaining({ width: 30 }), // intrinsic width
      ]);
      expect(frame.width).toEqual(30 + 50);
      expect(remainder).toBeUndefined();
    });

    it('respects column margin', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block: ColumnsBlock = {
        type: 'columns',
        columns: [{ type: 'empty', width: 100, height: 50, margin }],
      };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [{ x: 20 + 5, y: 30 + 7, width: 100, height: 50 }],
        width: box.width,
        height: 50 + 7 + 8,
      });
    });

    it('creates children for multiple columns with fixed size and margins', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { type: 'empty', width: 100, height: 50, margin },
        { type: 'empty', width: 100, height: 50, margin },
      ];
      const block: ColumnsBlock = { type: 'columns', columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          { x: 20 + 5, y: 30 + 7, width: 100, height: 50 },
          { x: 20 + 5 + 100 + 6 + 5, y: 30 + 7, width: 100, height: 50 },
        ],
        width: box.width,
        height: 50 + 7 + 8,
      });
    });

    it('distributes space evenly across flexible columns', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { type: 'text', text: [span('Column One')], margin },
        { type: 'text', text: [span('Column Two')], margin },
      ];
      const block: ColumnsBlock = { type: 'columns', columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          expect.objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 10 }),
          expect.objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 10 }),
        ],
        width: box.width,
        height: 10 + 7 + 8,
      });
    });

    it('distributes remaining space across flexible columns', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { type: 'empty', width: 89, height: 25, margin }, // 89 + 5 + 6 amounts to a column width of 100
        { type: 'text', text: [span('Column One')], margin },
        { type: 'text', text: [span('Column Two')], margin },
      ];
      const block: ColumnsBlock = { type: 'columns', columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          expect.objectContaining({ x: 20 + 5, y: 30 + 7, width: 89, height: 25 }),
          expect.objectContaining({ x: 20 + 100 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 10 }),
          expect.objectContaining({ x: 20 + 250 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 10 }),
        ],
        width: box.width,
        height: 25 + 7 + 8,
      });
    });

    it('fits columns into given width', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { type: 'text', text: [span('Column One')], margin },
        { type: 'text', text: [span('Column Two')], margin },
      ];
      const block: ColumnsBlock = { type: 'columns', columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          expect.objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 10 }),
          expect.objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 10 }),
        ],
        width: box.width,
        height: 25,
      });
    });

    it('respects vertical alignment', async () => {
      const columns: Block[] = [
        { type: 'text', text: [span('Column One')], height: 100 },
        { type: 'text', text: [span('Column Two')], verticalAlign: 'middle' },
        { type: 'text', text: [span('Column Three')], verticalAlign: 'bottom' },
      ];
      const block: ColumnsBlock = { type: 'columns', columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          expect.objectContaining({ y: box.y, height: 100 }),
          expect.objectContaining({ y: box.y + (100 - 10) / 2, height: 10 }),
          expect.objectContaining({ y: box.y + 100 - 10, height: 10 }),
        ],
        width: box.width,
        height: 100,
      });
    });
  });
});
