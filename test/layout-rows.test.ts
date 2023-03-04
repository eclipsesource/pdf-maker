import { beforeEach, describe, expect, it } from '@jest/globals';

import { Box } from '../src/box.js';
import { Document } from '../src/document.js';
import { layoutRowsContent } from '../src/layout-rows.js';
import { fakeFont } from './test-utils.js';

describe('layout-rows', () => {
  let doc: Document, box: Box;

  beforeEach(() => {
    const fonts = [fakeFont('Test')];
    doc = { fonts } as Document;
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutRowsContent', () => {
    it('creates empty frame for empty rows array', () => {
      const block = { rows: [] };

      const frame = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({ children: [], height: 0 });
    });

    it('creates child for row with fixed width and height', () => {
      const block = { rows: [{ width: 100, height: 50 }] };

      const frame = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20, y: 30, width: 100, height: 50 }],
        height: 50,
      });
    });

    it('does not include block padding in height of frame', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { rows: [{ width: 100, height: 50 }], padding };

      const frame = layoutRowsContent(block, box, doc);

      expect(frame.height).toEqual(50);
    });

    it('respects row margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { rows: [{ width: 100, height: 50, margin }] };

      const frame = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20 + 5, y: 30 + 7, width: 100, height: 50 }],
        height: 50 + 7 + 8,
      });
    });

    it('creates children for multiple rows with fixed size and margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const rows = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { rows };

      const frame = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          { x: 20 + 5, y: 30 + 7, width: 100, height: 50 },
          { x: 20 + 5, y: 30 + 7 + 50 + 8, width: 100, height: 50 },
        ],
        height: 7 + 50 + 8 + 50 + 8,
      });
    });
  });
});
