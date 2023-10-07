import { beforeEach, describe, expect, it } from '@jest/globals';

import { Box } from './box.js';
import { Document } from './document.js';
import { createFontStore } from './fonts.js';
import { isBreakPossible, layoutBlock, layoutPages } from './layout.js';
import { paperSizes } from './page-sizes.js';
import { Block, TextAttrs, TextSpan } from './read-block.js';
import { PageInfo, readDocumentDefinition } from './read-document.js';
import { fakeFont, p, range } from './test/test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let doc: Document, box: Box;

  beforeEach(() => {
    const fontStore = createFontStore([fakeFont('Test')]);
    doc = { fontStore, pageSize: paperSizes.A4 } as Document;
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutPages', () => {
    it('accepts empty content', () => {
      expect(() => layoutPages({ content: [] }, doc)).not.toThrow();
    });

    it('includes defaultStyle in all blocks', () => {
      const def = readDocumentDefinition({
        content: [{ text: [span('foo')] }, { text: [span('bar')] }],
        defaultStyle: { fontSize: 14 },
      });

      const pages = layoutPages(def, doc);

      expect(pages[0].content.children).toEqual([
        objectContaining({ height: 14 * 1.2 }),
        objectContaining({ height: 14 * 1.2 }),
      ]);
    });

    it('lays out content', () => {
      const def = readDocumentDefinition({ content: [{ text: 'test' }], margin: 50 });
      const pageWidth = doc.pageSize.width;
      const pageHeight = doc.pageSize.height;

      const pages = layoutPages(def, doc);

      expect(pages).toEqual([
        objectContaining({
          content: objectContaining({
            x: 50,
            y: 50,
            width: pageWidth - 100,
            height: pageHeight - 100,
          }),
          size: { width: pageWidth, height: pageHeight },
        }),
      ]);
    });

    it('returns empty page frame for empty content', () => {
      const def = readDocumentDefinition({ content: [], margin: 50 });

      const pages = layoutPages(def, doc);

      expect(pages).toEqual([
        {
          size: { width: 595.28, height: 841.89 },
          content: expect.objectContaining({ children: [] }),
        },
      ]);
    });

    it('returns single page frame for single content block', () => {
      const def = readDocumentDefinition({ content: [{ text: 'test' }], margin: 50 });

      const pages = layoutPages(def, doc);

      expect(pages).toEqual([
        {
          size: { width: 595.28, height: 841.89 },
          content: expect.objectContaining({ children: [expect.anything()] }),
        },
      ]);
    });

    it('enforces page breaks even if all content blocks have breakAfter:avoid', () => {
      const content = range(10).map((n) => ({
        text: `block ${n}`,
        height: 100,
        breakAfter: 'avoid',
      }));
      const def = readDocumentDefinition({ content, margin: 50 });

      const pages = layoutPages(def, doc);

      expect(pages).toHaveLength(2);
    });

    it('lays out header', () => {
      const def = readDocumentDefinition({
        margin: 50,
        content: [{ text: 'content' }],
        header: { text: 'header', margin: 20, fontSize: 10 },
      });
      const pageWidth = doc.pageSize.width;

      const pages = layoutPages(def, doc);

      expect(pages[0].header).toEqual(
        objectContaining({
          x: 20,
          y: 20,
          width: pageWidth - 40,
          height: 12,
        })
      );
      expect(pages[0].footer).toBeUndefined();
    });

    it('lays out footer', () => {
      const def = readDocumentDefinition({
        margin: 50,
        content: [{ text: 'content' }],
        footer: { text: 'footer', margin: 20, fontSize: 10 },
      });
      const pageWidth = doc.pageSize.width;
      const pageHeight = doc.pageSize.height;

      const pages = layoutPages(def, doc);

      expect(pages[0].header).toBeUndefined();
      expect(pages[0].footer).toEqual(
        objectContaining({
          x: 20,
          y: pageHeight - 20 - 12,
          width: pageWidth - 40,
          height: 12,
        })
      );
    });

    it('lays out header and footer', () => {
      const def = readDocumentDefinition({
        margin: 50,
        content: [{ text: 'content' }],
        header: { text: 'header', margin: 20, fontSize: 10 },
        footer: { text: 'footer', margin: 20, fontSize: 10 },
      });
      const pageWidth = doc.pageSize.width;
      const pageHeight = doc.pageSize.height;

      const pages = layoutPages(def, doc);

      expect(pages[0].header).toEqual(
        objectContaining({
          x: 20,
          y: 20,
          width: pageWidth - 40,
          height: 12,
        })
      );
      expect(pages[0].footer).toEqual(
        objectContaining({
          x: 20,
          y: pageHeight - 20 - 12,
          width: pageWidth - 40,
          height: 12,
        })
      );
    });

    it('supports dynamic header and footer', () => {
      const def = readDocumentDefinition({
        margin: 50,
        content: [
          { text: 'content', height: 500 },
          { text: 'content', height: 500 },
        ],
        header: ({ pageCount, pageNumber }: PageInfo) => ({ text: `${pageNumber}/${pageCount}` }),
        footer: ({ pageCount, pageNumber }: PageInfo) => ({ text: `${pageNumber}/${pageCount}` }),
      });

      const pages = layoutPages(def, doc) as any;

      expect(pages[0].header.objects[0].rows[0].segments[0].text).toEqual('1/2');
      expect(pages[0].footer.objects[0].rows[0].segments[0].text).toEqual('1/2');
      expect(pages[1].header.objects[0].rows[0].segments[0].text).toEqual('2/2');
      expect(pages[1].footer.objects[0].rows[0].segments[0].text).toEqual('2/2');
    });
  });

  describe('layoutBlock', () => {
    it('creates frame with fixed width and height', () => {
      const block = { rows: [], width: 200, height: 100 };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual({
        x: box.x,
        y: box.y,
        width: 200,
        height: 100,
        children: [],
      });
    });

    it('creates frame for empty block', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { padding };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual({ x: box.x, y: box.y, width: box.width, height: 7 + 8 });
    });

    it('creates frame for empty block with auto width', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { padding, autoWidth: true };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual({ x: box.x, y: box.y, width: 5 + 6, height: 7 + 8 });
    });

    it('creates frame for empty block with fixed width and height', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { padding, width: 100, height: 200 };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual({ x: box.x, y: box.y, width: 100, height: 200 });
    });

    it('includes padding around children', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { columns: [{ width: 100, height: 200 }], padding };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual({
        x: box.x,
        y: box.y,
        width: box.width,
        height: 7 + 200 + 8,
        children: [{ x: 5, y: 7, width: 100, height: 200 }],
      });
    });

    it('includes anchor object for id', () => {
      const block = { columns: [], id: 'test' };

      const { frame } = layoutBlock(block, box, doc);

      expect(frame).toEqual(
        objectContaining({ objects: [{ type: 'anchor', name: 'test', x: 0, y: 0 }] })
      );
    });

    it('includes graphics objects in child frame', () => {
      const graphics = () => [
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        { type: 'polyline', points: [p(1, 2), p(3, 4)] },
      ];

      const { frame } = layoutBlock({ graphics } as any, box, doc);

      expect(frame).toEqual(objectContaining({ width: 400, height: 0 }));
      expect(frame.objects).toEqual([
        {
          type: 'graphics',
          shapes: [
            { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
            { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
            { type: 'polyline', points: [p(1, 2), p(3, 4)] },
          ],
        },
      ]);
    });

    it('does not apply padding to graphics objects', () => {
      const graphics = () => [
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        { type: 'polyline', points: [p(1, 2), p(3, 4)] },
      ];
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };

      const { frame } = layoutBlock({ graphics, padding } as any, box, doc);

      expect(frame).toEqual(objectContaining({ width: 400, height: 10 }));
      expect(frame.objects).toEqual([
        {
          type: 'graphics',
          shapes: [
            { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
            { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
            { type: 'polyline', points: [p(1, 2), p(3, 4)] },
          ],
        },
      ]);
    });
  });

  describe('isBreakPossible', () => {
    it('returns false if block does not exist', () => {
      const blocks: Block[] = [];

      expect(isBreakPossible(blocks, 0)).toBe(false);
    });

    it('returns true if this block has breakAfter = auto', () => {
      const blocks: Block[] = [{ breakAfter: 'auto' }, {}];

      expect(isBreakPossible(blocks, 0)).toBe(true);
    });

    it('returns true if this block has breakAfter = always', () => {
      const blocks: Block[] = [{ breakAfter: 'always' }, {}];

      expect(isBreakPossible(blocks, 0)).toBe(true);
    });

    it('returns true if this block has breakAfter = always but it is the last block', () => {
      const blocks: Block[] = [{ breakAfter: 'avoid' }];

      expect(isBreakPossible(blocks, 0)).toBe(true);
    });

    it('returns false if this block has breakAfter = avoid', () => {
      const blocks: Block[] = [{ breakAfter: 'avoid' }, {}];

      expect(isBreakPossible(blocks, 0)).toBe(false);
    });

    it('returns false if next block has breakBefore = avoid', () => {
      const blocks: Block[] = [{}, { breakBefore: 'avoid' }];

      expect(isBreakPossible(blocks, 0)).toBe(false);
    });

    it('returns true if this block has breakAfter = always event if next block has breakBefore = avoid', () => {
      const blocks: Block[] = [{ breakAfter: 'always' }, { breakBefore: 'avoid' }];

      expect(isBreakPossible(blocks, 0)).toBe(true);
    });

    it('returns true if next block has breakBefore = always even if this block has breakAfter = avoid', () => {
      const blocks: Block[] = [{ breakAfter: 'avoid' }, { breakBefore: 'always' }];

      expect(isBreakPossible(blocks, 0)).toBe(true);
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
