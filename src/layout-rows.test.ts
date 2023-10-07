import { beforeEach, describe, expect, it } from '@jest/globals';

import { Box } from './box.js';
import { Document } from './document.js';
import { createFontStore } from './fonts.js';
import { Frame } from './layout.js';
import { layoutRowsContent } from './layout-rows.js';
import { Block } from './read-block.js';
import { extractTextRows, fakeFont, range, span } from './test/test-utils.js';

describe('layout-rows', () => {
  let doc: Document, box: Box;

  beforeEach(() => {
    const fontStore = createFontStore([fakeFont('Test')]);
    doc = { fontStore } as Document;
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutRowsContent', () => {
    it('creates empty frame for empty rows array', () => {
      const block = { rows: [] };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({ children: [], width: box.width, height: 0 });
      expect(remainder).toBeUndefined();
    });

    it('creates child for row with fixed width and height', () => {
      const block = { rows: [{ width: 100, height: 50 }] };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20, y: 30, width: 100, height: 50 }],
        width: box.width,
        height: 50,
      });
      expect(remainder).toBeUndefined();
    });

    it('does not include block padding in height of frame', () => {
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { rows: [{ width: 100, height: 50 }], padding };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame.height).toEqual(50);
      expect(remainder).toBeUndefined();
    });

    it('returns frame with fixed width for block with auto width', () => {
      const block = { rows: [{ width: 100, height: 50 }], autoWidth: true };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame).toEqual(expect.objectContaining({ width: 100, height: 50 }));
      expect(remainder).toBeUndefined();
    });

    it("passes auto width down to children that don't have a fixed width", () => {
      const block = {
        rows: [{ text: [span('foo')] }, { text: [span('bar')], width: 50 }],
        autoWidth: true,
      };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame.children).toEqual([
        expect.objectContaining({ width: 30 }), // intrinsic width
        expect.objectContaining({ width: 50 }), // keeps fixed width
      ]);
      expect(frame.width).toEqual(50); // max width of children
      expect(remainder).toBeUndefined();
    });

    it('respects row margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { rows: [{ width: 100, height: 50, margin }] };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [{ x: 20 + 5, y: 30 + 7, width: 100, height: 50 }],
        width: box.width,
        height: 50 + 7 + 8,
      });
      expect(remainder).toBeUndefined();
    });

    it('creates children for multiple rows with fixed size and margin', () => {
      const margin = { left: 5, right: 6, top: 7, bottom: 8 };
      const rows = [
        { width: 100, height: 50, margin },
        { width: 100, height: 50, margin },
      ];
      const block = { rows };

      const { frame, remainder } = layoutRowsContent(block, box, doc);

      expect(frame).toEqual({
        children: [
          { x: 20 + 5, y: 30 + 7, width: 100, height: 50 },
          { x: 20 + 5, y: 30 + 7 + 50 + 8, width: 100, height: 50 },
        ],
        width: box.width,
        height: 7 + 50 + 8 + 50 + 8,
      });
      expect(remainder).toBeUndefined();
    });

    describe('page breaks', () => {
      const makeBlocks = (n: number, idPrefix?: string) => {
        return range(n).map(
          (n) => ({ id: idPrefix ? `${idPrefix}.${n}` : `${n}`, height: 100 } as Block)
        );
      };
      const renderedIds = (frame?: Pick<Frame, 'children'>) =>
        frame?.children?.map((c) => (c.objects?.find((o) => o.type === 'anchor') as any)?.name);
      const box = { x: 20, y: 30, width: 400, height: 700 };

      it('creates page break after last fitting block', () => {
        const rows = makeBlocks(10);

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({ rows: rows.slice(7) });
      });

      it('includes extra block after page break', () => {
        const rows = makeBlocks(10);
        const insertAfterBreak = () => ({ text: 'contd', id: 'extra' });

        const { frame, remainder } = layoutRowsContent({ rows, insertAfterBreak }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({
          rows: [{ text: 'contd', id: 'extra' }, ...rows.slice(7)],
          insertAfterBreak,
        });
      });

      it('supports nested rows blocks', () => {
        const nestedRows = makeBlocks(5, 'nested');
        const rows = [...makeBlocks(5), { rows: nestedRows, id: 'nested' }];

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(['0', '1', '2', '3', '4', 'nested']);
        expect(renderedIds(frame.children?.[5])).toEqual(['nested.0', 'nested.1']);
        expect(remainder).toEqual({ rows: [{ rows: nestedRows.slice(2) }] });
      });

      it('respects breakBefore = always', () => {
        const rows = makeBlocks(10);
        rows[3].breakBefore = 'always';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(3).map(String));
        expect(remainder).toEqual({ rows: rows.slice(3) });
      });

      it('ignores breakBefore = always on first block', () => {
        const rows = makeBlocks(10);
        rows[0].breakBefore = 'always';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({ rows: rows.slice(7) });
      });

      it('respects breakAfter = always', () => {
        const rows = makeBlocks(10);
        rows[3].breakAfter = 'always';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(4).map(String));
        expect(remainder).toEqual({ rows: rows.slice(4) });
      });

      it('ignores breakAfter = always on last block', () => {
        const rows = makeBlocks(7);
        rows[6].breakAfter = 'always';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toBeUndefined();
      });

      it('respects breakBefore = avoid', () => {
        const rows = makeBlocks(10);
        rows[7].breakBefore = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(6).map(String));
        expect(remainder).toEqual({ rows: rows.slice(6) });
      });

      it('respects breakBefore = avoid on subsequent blocks', () => {
        const rows = makeBlocks(10);
        rows[6].breakBefore = 'avoid';
        rows[7].breakBefore = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(5).map(String));
        expect(remainder).toEqual({ rows: rows.slice(5) });
      });

      it('ignores breakBefore = avoid on first block', () => {
        const rows = makeBlocks(10);
        rows[0].breakBefore = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({ rows: rows.slice(7) });
      });

      it('ignores breakBefore = avoid if previous has breakAfter = always', () => {
        const rows = makeBlocks(10);
        rows[3].breakAfter = 'always';
        rows[4].breakBefore = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(4).map(String));
        expect(remainder).toEqual({ rows: rows.slice(4) });
      });

      it('respects breakAfter = avoid', () => {
        const rows = makeBlocks(10);
        rows[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(6).map(String));
        expect(remainder).toEqual({ rows: rows.slice(6) });
      });

      it('respects breakAfter = avoid on subsequent blocks', () => {
        const rows = makeBlocks(10);
        rows[5].breakAfter = 'avoid';
        rows[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(5).map(String));
        expect(remainder).toEqual({ rows: rows.slice(5) });
      });

      it('ignores breakAfter = avoid on last blocks', () => {
        const rows = makeBlocks(7);
        rows[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toBeUndefined();
      });

      it('ignores breakAfter = avoid if next has breakBefore = always', () => {
        const rows = makeBlocks(10);
        rows[3].breakAfter = 'avoid';
        rows[4].breakBefore = 'always';

        const { frame, remainder } = layoutRowsContent({ rows }, box, doc);

        expect(renderedIds(frame)).toEqual(range(4).map(String));
        expect(remainder).toEqual({ rows: rows.slice(4) });
      });

      it('ignores breakBefore = avoid if there is no previous break point and breakInside = enforce-auto', () => {
        const rows = makeBlocks(10);
        rows.forEach((b) => (b.breakBefore = 'avoid'));

        const { frame, remainder } = layoutRowsContent(
          { rows, breakInside: 'enforce-auto' as any },
          box,
          doc
        );

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({ rows: rows.slice(7) });
      });

      it('ignores breakAfter = avoid if there is no previous break point and breakInside = enforce-auto', () => {
        const rows = makeBlocks(10);
        rows.forEach((b) => (b.breakAfter = 'avoid'));

        const { frame, remainder } = layoutRowsContent(
          { rows, breakInside: 'enforce-auto' as any },
          box,
          doc
        );

        expect(renderedIds(frame)).toEqual(range(7).map(String));
        expect(remainder).toEqual({ rows: rows.slice(7) });
      });

      it('includes partial remainder', () => {
        const rows = makeBlocks(6);
        rows.push({ id: '6', height: 70 }); // leave just enough space for a single line of text
        rows.push({ id: 'extra', text: [{ text: 'line1\nline2', attrs: {} }] });

        const { frame, remainder } = layoutRowsContent(
          { rows, breakInside: 'enforce-auto' as any },
          box,
          doc
        );

        expect(renderedIds(frame)).toEqual(['0', '1', '2', '3', '4', '5', '6', 'extra']);
        expect(extractTextRows(frame)).toEqual(['line1']);
        expect(remainder).toEqual({
          rows: [expect.objectContaining({ text: [expect.objectContaining({ text: 'line2' })] })],
        });
      });

      it('skips remainder if frame empty', () => {
        const rows = makeBlocks(6);
        rows.push({ id: '6', height: 90 }); // leave some space, but not enough for a line of text
        rows.push({
          id: 'extra',
          text: [{ text: 'line1\nline2', attrs: {} }],
          margin: { top: 10, left: 0, right: 0, bottom: 10 },
        });

        const { frame, remainder } = layoutRowsContent(
          { rows, breakInside: 'enforce-auto' as any },
          box,
          doc
        );

        expect(renderedIds(frame)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
        expect(extractTextRows(frame)).toEqual([]);
        expect(remainder).toEqual({ rows: rows.slice(-1) });
      });
    });
  });
});
