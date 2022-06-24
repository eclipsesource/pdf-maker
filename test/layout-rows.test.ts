import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutRowsBlock } from '../src/layout-rows.js';
import { fakeFont } from './test-utils.js';

describe('layout-rows', () => {
  let doc, box;

  beforeEach(() => {
    const fonts = [fakeFont('Test')];
    doc = { fonts };
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutRowsBlock', () => {
    it('creates empty frame for empty rows array', () => {
      const block = { rows: [] };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [],
        ...{ x: 20, y: 30, width: 400, height: 0 },
      });
    });

    it('includes padding in height of empty frame', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { rows: [], padding };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [],
        ...{ x: 20, y: 30, width: 400, height: 3 + 4 },
      });
    });

    it('creates frame with fixed width and height', () => {
      const block = { rows: [], width: 200, height: 100 };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [],
        ...{ x: 20, y: 30, width: 200, height: 100 },
      });
    });

    it('creates child for row with fixed width and height', () => {
      const block = { rows: [{ width: 100, height: 50 }] };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [{ type: 'text', x: 0, y: 0, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 },
      });
    });

    it('respects row margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { rows: [{ width: 100, height: 50, margin }] };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [{ type: 'text', x: 5, y: 7, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 + 7 + 8 },
      });
    });

    it('creates children for multiple rows with fixed size and margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const rows = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { rows };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [
          { type: 'text', x: 5, y: 7, width: 100, height: 50 },
          { type: 'text', x: 5, y: 7 + 50 + 8, width: 100, height: 50 },
        ],
        ...{ x: 20, y: 30, width: 400, height: 7 + 50 + 8 + 50 + 8 },
      });
    });

    it('surrounds multiple rows and their margins with block padding', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const rows = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { rows, padding };

      const result = layoutRowsBlock(block, box, doc);

      expect(result).toEqual({
        type: 'rows',
        children: [
          { type: 'text', x: 1 + 5, y: 3 + 7, width: 100, height: 50 },
          { type: 'text', x: 1 + 5, y: 3 + 7 + 50 + 8, width: 100, height: 50 },
        ],
        ...{ x: 20, y: 30, width: 400, height: 3 + 7 + 50 + 8 + 50 + 8 + 4 },
      });
    });
  });
});
