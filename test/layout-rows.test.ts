import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutRows } from '../src/layout-rows.js';
import { fakeFont } from './test-utils.js';

describe('layout-rows', () => {
  let resources, box;

  beforeEach(() => {
    const fonts = [fakeFont('Test')];
    resources = { fonts };
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutRows', () => {
    it('handles empty rows array', () => {
      const block = { rows: [] };

      const result = layoutRows(block, box, resources);

      expect(result).toEqual({
        type: 'rows',
        children: [],
        ...{ x: 20, y: 30, width: 400, height: 0 },
      });
    });

    it('respects fixed width and height', () => {
      const block = { rows: [], width: 200, height: 100 };

      const result = layoutRows(block, box, resources);

      expect(result).toEqual({
        type: 'rows',
        children: [],
        ...{ x: 20, y: 30, width: 200, height: 100 },
      });
    });

    it('handles row with fixed width and height', () => {
      const block = { rows: [{ width: 100, height: 50 }] };

      const result = layoutRows(block, box, resources);

      expect(result).toEqual({
        type: 'rows',
        children: [{ type: 'paragraph', x: 0, y: 0, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 },
      });
    });

    it('handles row with fixed width and margins', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { rows: [{ width: 100, height: 50, margin }] };

      const result = layoutRows(block, box, resources);

      expect(result).toEqual({
        type: 'rows',
        children: [{ type: 'paragraph', x: 5, y: 7, width: 100, height: 50 }],
        ...{ x: 20, y: 30, width: 400, height: 50 + 7 + 8 },
      });
    });

    it('handles multiple rows with fixed width and margins', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const rows = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { rows };

      const result = layoutRows(block, box, resources);

      expect(result).toEqual({
        type: 'rows',
        children: [
          { type: 'paragraph', x: 5, y: 7, width: 100, height: 50 },
          { type: 'paragraph', x: 5, y: 7 + 50 + 8, width: 100, height: 50 },
        ],
        ...{ x: 20, y: 30, width: 400, height: 7 + 50 + 8 + 50 + 8 },
      });
    });
  });
});
