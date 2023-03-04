import { beforeEach, describe, expect, it } from '@jest/globals';
import { PDFFont } from 'pdf-lib';

import { Box } from '../src/box.js';
import { Document } from '../src/document.js';
import { Frame, layoutBlock, layoutPageContent, layoutPages } from '../src/layout.js';
import { paperSizes } from '../src/page-sizes.js';
import { Block, TextAttrs, TextSpan } from '../src/read-block.js';
import { PageInfo, readDocumentDefinition } from '../src/read-document.js';
import { fakeFont, p, range } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let doc: Document, normalFont: PDFFont, box: Box;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    doc = { fonts, pageSize: paperSizes.A4 } as Document;
    [normalFont] = fonts.map((f) => f.pdfFont);
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

  describe('layoutPageContent', () => {
    it('returns empty page frame for empty content', () => {
      const { frame } = layoutPageContent([], box, doc);

      expect(frame).toEqual({ ...box, children: [] });
    });

    it('returns a frame with a single text row for single text content', () => {
      const text = [span('Test')];

      const { frame, remainder } = layoutPageContent([{ text }], box, doc) as any;

      expect(remainder).toEqual([]);
      expect(frame).toEqual(objectContaining(box));
      expect(frame.children).toEqual([
        objectContaining({ x: 0, y: 0, width: 400, height: 18 * 1.2 }),
      ]);
      expect(frame.children[0].objects).toEqual([objectContaining({ type: 'text' })]);
      expect(frame.children[0].objects[0].rows).toEqual([
        objectContaining({ x: 0, y: 0, width: 72, height: 18 * 1.2, baseline: 16.2 }),
      ]);
      expect(frame.children[0].objects[0].rows[0].segments).toEqual([
        { text: 'Test', font: normalFont, fontSize: 18 },
      ]);
    });

    it('returns remaining blocks along with the page', () => {
      const box = { x: 20, y: 30, width: 400, height: 120 };
      const block = range(23).map((n) => ({
        text: [{ text: `Paragraph ${n + 1}`, attrs: { fontSize: 10 } }],
      }));

      const { remainder } = layoutPageContent(block, box, doc);

      // 10 blocks * fontSize 10 * lineHeight 1.2 = height 120
      expect(remainder).toEqual(block.slice(10));
    });

    it('surrounds blocks with margins', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const blocks = [
        { text, margin: { left: 1, right: 2, top: 3, bottom: 4 } },
        { text, margin: { left: 5, right: 6, top: 7, bottom: 8 } },
      ];

      const { frame } = layoutPageContent(blocks, box, doc);

      expect(frame.children).toEqual([
        objectContaining({ x: 1, y: 3, width: 400 - 1 - 2, height: 12 }),
        objectContaining({ x: 5, y: 3 + 12 + 7, width: 400 - 5 - 6 }),
      ]);
    });

    describe('page breaks', () => {
      const makeBlocks = (n: number) => range(n).map((n) => ({ id: `${n}`, height: 100 } as Block));
      const renderedIds = (frame: Frame) =>
        frame.children?.map((c) => parseInt((c.objects?.[0] as any)?.name));

      it('includes page break after last fitting block', () => {
        const blocks = makeBlocks(10);

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual(blocks.slice(7));
      });

      it('respects breakBefore = always', () => {
        const blocks = makeBlocks(10);
        blocks[3].breakBefore = 'always';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(3));
        expect(remainder).toEqual(blocks.slice(3));
      });

      it('ignores breakBefore = always on first block', () => {
        const blocks = makeBlocks(10);
        blocks[0].breakBefore = 'always';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual(blocks.slice(7));
      });

      it('respects breakAfter = always', () => {
        const blocks = makeBlocks(10);
        blocks[3].breakAfter = 'always';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(4));
        expect(remainder).toEqual(blocks.slice(4));
      });

      it('ignores breakAfter = always on last block', () => {
        const blocks = makeBlocks(7);
        blocks[6].breakAfter = 'always';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual([]);
      });

      it('respects breakBefore = avoid', () => {
        const blocks = makeBlocks(10);
        blocks[7].breakBefore = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(6));
        expect(remainder).toEqual(blocks.slice(6));
      });

      it('respects breakBefore = avoid on subsequent blocks', () => {
        const blocks = makeBlocks(10);
        blocks[6].breakBefore = 'avoid';
        blocks[7].breakBefore = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(5));
        expect(remainder).toEqual(blocks.slice(5));
      });

      it('ignores breakBefore = avoid on first block', () => {
        const blocks = makeBlocks(10);
        blocks[0].breakBefore = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual(blocks.slice(7));
      });

      it('ignores breakBefore = avoid if previous has breakAfter = always', () => {
        const blocks = makeBlocks(10);
        blocks[3].breakAfter = 'always';
        blocks[4].breakBefore = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(4));
        expect(remainder).toEqual(blocks.slice(4));
      });

      it('ignores breakBefore = avoid if there is no previous block that allows a break', () => {
        const blocks = makeBlocks(10);
        blocks.forEach((b) => (b.breakBefore = 'avoid'));

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual(blocks.slice(7));
      });

      it('respects breakAfter = avoid', () => {
        const blocks = makeBlocks(10);
        blocks[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(6));
        expect(remainder).toEqual(blocks.slice(6));
      });

      it('respects breakAfter = avoid on subsequent blocks', () => {
        const blocks = makeBlocks(10);
        blocks[5].breakAfter = 'avoid';
        blocks[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(5));
        expect(remainder).toEqual(blocks.slice(5));
      });

      it('ignores breakAfter = avoid on last blocks', () => {
        const blocks = makeBlocks(7);
        blocks[6].breakAfter = 'avoid';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual([]);
      });

      it('ignores breakAfter = avoid if next has breakBefore = always', () => {
        const blocks = makeBlocks(10);
        blocks[3].breakAfter = 'avoid';
        blocks[4].breakBefore = 'always';

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(4));
        expect(remainder).toEqual(blocks.slice(4));
      });

      it('ignores breakAfter = avoid if there is no previous block that allows a break', () => {
        const blocks = makeBlocks(10);
        blocks.forEach((b) => (b.breakAfter = 'avoid'));

        const { frame, remainder } = layoutPageContent(blocks, box, doc);

        expect(renderedIds(frame)).toEqual(range(7));
        expect(remainder).toEqual(blocks.slice(7));
      });
    });
  });

  describe('layoutBlock', () => {
    it('creates frame with fixed width and height', () => {
      const block = { rows: [], width: 200, height: 100 };

      const frame = layoutBlock(block, box, doc);

      expect(frame).toEqual({
        x: 20,
        y: 30,
        width: 200,
        height: 100,
        children: [],
      });
    });

    it('includes padding', () => {
      const padding = { left: 5, right: 6, top: 7, bottom: 8 };
      const block = { columns: [{ width: 100, height: 200 }], padding };

      const frame = layoutBlock(block, box, doc);

      expect(frame).toEqual({
        x: 20,
        y: 30,
        width: 400,
        height: 7 + 200 + 8,
        children: [{ x: 5, y: 7, width: 100, height: 200 }],
      });
    });

    it('includes anchor object for id', () => {
      const block = { columns: [], id: 'test' };

      const result = layoutBlock(block, box, doc);

      expect(result).toEqual(
        objectContaining({ objects: [{ type: 'anchor', name: 'test', x: 0, y: 0 }] })
      );
    });

    it('includes graphics objects in child frame', () => {
      const graphics = () => [
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        { type: 'polyline', points: [p(1, 2), p(3, 4)] },
      ];

      const frame = layoutBlock({ graphics } as any, box, doc);

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

      const frame = layoutBlock({ graphics, padding } as any, box, doc);

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
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
