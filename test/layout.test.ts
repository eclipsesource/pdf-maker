import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutBlock, layoutPageContent, layoutPages } from '../src/layout.js';
import { paperSizes } from '../src/page-sizes.js';
import { readDocumentDefinition } from '../src/read-document.js';
import { TextAttrs, TextSpan } from '../src/text.js';
import { fakeFont, range } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let doc, normalFont, box;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    doc = { fonts, pageSize: paperSizes.A4 };
    [normalFont] = fonts.map((f) => f.pdfFont);
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutPages', () => {
    it('accepts empty content', () => {
      expect(() => layoutPages({ content: [] }, doc)).not.toThrow();
    });

    it('includes defaultStyle in all paragraphs', () => {
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
            type: 'page',
            x: 50,
            y: 50,
            width: pageWidth - 100,
            height: pageHeight - 100,
          }),
          size: { width: pageWidth, height: pageHeight },
        }),
      ]);
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
          type: 'text',
          x: 20,
          y: 20,
          width: pageWidth - 40,
          height: 12,
        })
      );
      expect(pages[0].footer).toEqual(
        objectContaining({
          type: 'text',
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
        header: ({ pageCount, pageNumber }) => ({ text: `${pageNumber}/${pageCount}` }),
        footer: ({ pageCount, pageNumber }) => ({ text: `${pageNumber}/${pageCount}` }),
      });

      const pages = layoutPages(def, doc);

      expect((pages[0].header.children[0].objects[0] as any).text).toEqual('1/2');
      expect((pages[0].footer.children[0].objects[0] as any).text).toEqual('1/2');
      expect((pages[1].header.children[0].objects[0] as any).text).toEqual('2/2');
      expect((pages[1].footer.children[0].objects[0] as any).text).toEqual('2/2');
    });
  });

  describe('layoutPageContent', () => {
    it('returns empty page frame for empty content', () => {
      const { frame } = layoutPageContent([], box, doc);

      expect(frame).toEqual({ type: 'page', ...box, children: [] });
    });

    it('returns a paragraph with a single text row for single text content', () => {
      const text = [span('Test')];

      const { frame, remainder } = layoutPageContent([{ text }], box, doc);

      expect(remainder).toBeUndefined();
      expect(frame).toEqual({
        ...{ type: 'page', ...box },
        children: [
          {
            ...{ type: 'text', x: 0, y: 0, width: 400, height: 18 * 1.2 },
            children: [
              {
                ...{ type: 'row', x: 0, y: 0, width: 72, height: 18 * 1.2 },
                objects: [
                  objectContaining({ type: 'text', text: 'Test', font: normalFont, fontSize: 18 }),
                ],
              },
            ],
          },
        ],
      });
    });

    it('returns remaining paragraphs along with the page', () => {
      const box = { x: 20, y: 30, width: 400, height: 120 };
      const paragraphs = range(23).map((n) => ({
        text: [{ text: `Paragraph ${n + 1}`, attrs: { fontSize: 10 } }],
      }));

      const { remainder } = layoutPageContent(paragraphs, box, doc);

      // 10 paragraphs * fontSize 10 * lineHeight 1.2 = height 120
      expect(remainder).toEqual(paragraphs.slice(10));
    });

    it('surrounds paragraphs with margins', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const paragraphs = [
        { text, margin: { left: 1, right: 2, top: 3, bottom: 4 } },
        { text, margin: { left: 5, right: 6, top: 7, bottom: 8 } },
      ];

      const { frame } = layoutPageContent(paragraphs, box, doc);

      expect(frame.children).toEqual([
        objectContaining({ type: 'text', x: 1, y: 3, width: 400 - 1 - 2, height: 12 }),
        objectContaining({ type: 'text', x: 5, y: 3 + 12 + 7, width: 400 - 5 - 6 }),
      ]);
    });
  });

  describe('layoutBlock', () => {
    it('includes anchor object for id', () => {
      const block = { columns: [], id: 'test' };

      const result = layoutBlock(block, box, doc);

      expect(result).toEqual(
        objectContaining({ objects: [{ type: 'anchor', name: 'test', x: 0, y: 0 }] })
      );
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
