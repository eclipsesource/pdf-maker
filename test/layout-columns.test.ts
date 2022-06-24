import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutColumnsBlock } from '../src/layout-columns.js';
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

  describe('layoutColumnsBlock', () => {
    it('creates empty frame for empty columns array', () => {
      const block = { columns: [] };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [],
        ...{ x: 20, y: 30, width: 400, height: 0 },
      });
    });

    it('includes padding in height of empty frame', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { columns: [], padding };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [],
        ...{ x: 20, y: 30, width: 400, height: 3 + 4 },
      });
    });

    it('creates frame with fixed width and height', () => {
      const block = { columns: [], width: 200, height: 100 };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [],
        ...{ x: 20, y: 30, width: 200, height: 100 },
      });
    });

    it('creates child for column with fixed width and height', () => {
      const block = { columns: [{ width: 100, height: 50 }] };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [{ type: 'text', x: 0, y: 0, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 },
      });
    });

    it('respects column margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { columns: [{ width: 100, height: 50, margin }] };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [{ type: 'text', x: 5, y: 7, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 + 7 + 8 },
      });
    });

    it('creates children for multiple columns with fixed size and margins', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { columns };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [
          { type: 'text', x: 5, y: 7, width: 100, height: 50 },
          { type: 'text', x: 5 + 100 + 6 + 5, y: 7, width: 100, height: 50 },
        ],
        ...{ x: 20, y: 30, width: 400, height: 50 + 7 + 8 },
      });
    });

    it('surrounds multiple columns and their margins with block padding', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { columns, padding };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [
          { type: 'text', x: 1 + 5, y: 3 + 7, width: 100, height: 50 },
          { type: 'text', x: 1 + 5 + 100 + 6 + 5, y: 3 + 7, width: 100, height: 50 },
        ],
        ...{ x: 20, y: 30, width: 400, height: 3 + 7 + 50 + 8 + 4 },
      });
    });

    it('distributes space evenly across flexible columns', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [
          objectContaining({ x: 5, y: 7, width: 200 - 5 - 6, height: 12 }),
          objectContaining({ x: 200 + 5, y: 7, width: 200 - 5 - 6, height: 12 }),
        ],
        ...{ x: 20, y: 30, width: 400, height: 12 + 7 + 8 },
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

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [
          objectContaining({ x: 5, y: 7, width: 89, height: 25 }),
          objectContaining({ x: 100 + 5, y: 7, width: 150 - 5 - 6, height: 12 }),
          objectContaining({ x: 250 + 5, y: 7, width: 150 - 5 - 6, height: 12 }),
        ],
        ...{ x: 20, y: 30, width: 400, height: 25 + 7 + 8 },
      });
    });

    it('fits columns in given width and height', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const columns: Block[] = [
        { text: [span('Column One')], margin },
        { text: [span('Column Two')], margin },
      ];
      const block = { columns, width: 300, height: 100 };

      const result = layoutColumnsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'columns',
        children: [
          objectContaining({ x: 5, y: 7, width: 150 - 5 - 6, height: 12 }),
          objectContaining({ x: 150 + 5, y: 7, width: 150 - 5 - 6, height: 12 }),
        ],
        ...{ x: 20, y: 30, width: 300, height: 100 },
      });
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { fontSize: 10, ...attrs } };
}
