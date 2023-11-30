import { beforeEach, describe, expect, it } from '@jest/globals';

import { Box } from '../box.js';
import { FontStore } from '../font-loader.js';
import { MakerCtx } from '../maker-ctx.js';
import { Block } from '../read-block.js';
import { fakeFont, span } from '../test/test-utils.js';
import { layoutColumnsContent } from './layout-columns.js';

const { objectContaining } = expect;

describe('layout-columns', () => {
  let ctx: MakerCtx, box: Box;

  beforeEach(() => {
    const fontStore: FontStore = {
      async selectFont() {
        return fakeFont('Test');
      },
    };
    ctx = { fontStore } as MakerCtx;
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutColumnsContent', () => {
    it('creates empty frame for empty columns array', async () => {
      const block = { columns: [] };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({ children: [], width: box.width, height: 0 });
    });

    it('creates child for column with fixed width and height', async () => {
      const block = { columns: [{ width: 100, height: 50 }] };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [{ x: 20, y: 30, width: 100, height: 50 }],
        width: box.width,
        height: 50,
      });
    });

    it('does not include block padding in height of frame', async () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { columns: [{ width: 100, height: 50 }], padding };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame.height).toEqual(50);
    });

    it('returns frame with fixed width for block with auto width', async () => {
      const block = { columns: [{ width: 100, height: 50 }], autoWidth: true };

      const { frame, remainder } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual(expect.objectContaining({ width: 100, height: 50 }));
      expect(remainder).toBeUndefined();
    });

    it("passes auto width down to children that don't have a fixed width", async () => {
      const block = {
        columns: [
          { text: [span('foo')], width: 50 }, // column with fixed width
          { text: [span('bar')] }, // flexible column
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
      const block = { columns: [{ width: 100, height: 50, margin }] };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [{ x: 20 + 5, y: 30 + 7, width: 100, height: 50 }],
        width: box.width,
        height: 50 + 7 + 8,
      });
    });

    it('creates children for multiple columns with fixed size and margins', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { columns };

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
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
        ],
        width: box.width,
        height: 12 + 7 + 8,
      });
    });

    it('distributes remaining space across flexible columns', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { width: 89, height: 25, margin }, // 89 + 5 + 6 amounts to a column width of 100
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 89, height: 25 }),
          objectContaining({ x: 20 + 100 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 250 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 12 }),
        ],
        width: box.width,
        height: 25 + 7 + 8,
      });
    });

    it('fits columns into given width', async () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
        ],
        width: box.width,
        height: 27,
      });
    });

    it('respects vertical alignment', async () => {
      const columns: Block[] = [
        { text: [span('Column One')], height: 100 },
        { text: [span('Column Two')], verticalAlign: 'middle' },
        { text: [span('Column Three')], verticalAlign: 'bottom' },
      ];
      const block = { columns };

      const { frame } = await layoutColumnsContent(block, box, ctx);

      expect(frame).toEqual({
        children: [
          objectContaining({ y: box.y, height: 100 }),
          objectContaining({ y: box.y + (100 - 12) / 2, height: 12 }),
          objectContaining({ y: box.y + 100 - 12, height: 12 }),
        ],
        width: box.width,
        height: 100,
      });
    });
  });
});
