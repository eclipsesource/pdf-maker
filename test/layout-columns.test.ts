import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutColumnsContent } from '../src/layout-columns.js';
import { Block, TextAttrs, TextSpan } from '../src/read-block.js';
import { fakeFont } from './test-utils.js';

const { objectContaining } = expect;

describe('layout-columns', () => {
  let doc, box;

  beforeEach(() => {
    const fonts = [fakeFont('Test')];
    doc = { fonts };
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutColumnsContent', () => {
    it('creates empty frame for empty columns array', () => {
      const block = { columns: [] };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({ children: [], height: 0 });
    });

    it('creates child for column with fixed width and height', () => {
      const block = { columns: [{ width: 100, height: 50 }] };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20, y: 30, width: 100, height: 50 }],
        height: 50,
      });
    });

    it('does not include padding in height of frame', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { columns: [{ width: 100, height: 50 }], padding };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame.height).toEqual(50);
    });

    it('respects column margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { columns: [{ width: 100, height: 50, margin }] };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20 + 5, y: 30 + 7, width: 100, height: 50 }],
        height: 50 + 7 + 8,
      });
    });

    it('creates children for multiple columns with fixed size and margins', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { columns };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          { x: 20 + 5, y: 30 + 7, width: 100, height: 50 },
          { x: 20 + 5 + 100 + 6 + 5, y: 30 + 7, width: 100, height: 50 },
        ],
        height: 50 + 7 + 8,
      });
    });

    it('distributes space evenly across flexible columns', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
        ],
        height: 12 + 7 + 8,
      });
    });

    it('distributes remaining space across flexible columns', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { width: 89, height: 25, margin }, // 89 + 5 + 6 amounts to a column width of 100
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 89, height: 25 }),
          objectContaining({ x: 20 + 100 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 250 + 5, y: 30 + 7, width: 150 - 5 - 6, height: 12 }),
        ],
        height: 25 + 7 + 8,
      });
    });

    it('fits columns into given width', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const frame = layoutColumnsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          objectContaining({ x: 20 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
          objectContaining({ x: 20 + 200 + 5, y: 30 + 7, width: 200 - 5 - 6, height: 12 }),
        ],
        height: 27,
      });
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { fontSize: 10, ...attrs } };
}
