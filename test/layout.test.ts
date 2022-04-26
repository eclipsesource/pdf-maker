import { beforeEach, describe, expect, it } from '@jest/globals';

import { Alignment } from '../src/content.js';
import { layoutPageContent, layoutPages, layoutParagraph } from '../src/layout.js';
import { TextAttrs, TextSpan } from '../src/text.js';
import { fakeFont, range } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let resources, normalFont, box;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    resources = { fonts };
    [normalFont] = fonts.map((f) => f.pdfFont);
    box = { x: 20, y: 30, width: 400, height: 700 };
  });

  describe('layoutPages', () => {
    it('checks defaultStyle', () => {
      const def = { defaultStyle: { fontSize: -1 }, content: [] };

      expect(() => layoutPages(def, resources)).toThrowError(
        'Invalid value for "defaultStyle.fontSize":'
      );
    });

    it('checks margin', () => {
      const def = { margin: 'foo', content: [] };

      expect(() => layoutPages(def, resources)).toThrowError('Invalid value for "margin":');
    });

    it('checks content', () => {
      const def = { content: 'foo' };

      expect(() => layoutPages(def, resources)).toThrowError('Invalid value for "content":');
    });

    it('lays out content', () => {
      const def = { content: [span('test')], margin: 50 };
      const pageWidth = (210 * 72) / 25.4;
      const pageHeight = (297 * 72) / 25.4;

      const pages = layoutPages(def, resources);

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
      const def = {
        margin: 50,
        content: [span('content')],
        header: { text: 'header', margin: 20, fontSize: 10 },
        footer: { text: 'footer', margin: 20, fontSize: 10 },
      };
      const pageWidth = (210 * 72) / 25.4;
      const pageHeight = (297 * 72) / 25.4;

      const pages = layoutPages(def, resources);

      expect(pages[0].header).toEqual(
        objectContaining({
          type: 'paragraph',
          x: 20,
          y: 20,
          width: pageWidth - 40,
          height: 12,
        })
      );
      expect(pages[0].footer).toEqual(
        objectContaining({
          type: 'paragraph',
          x: 20,
          y: pageHeight - 20 - 12,
          width: pageWidth - 40,
          height: 12,
        })
      );
    });

    it('supports dynamic header and footer', () => {
      const def = {
        margin: 50,
        content: [
          { text: 'content', height: 500 },
          { text: 'content', height: 500 },
        ],
        header: ({ pageCount, pageNumber }) => ({ text: `${pageNumber}/${pageCount}` }),
        footer: ({ pageCount, pageNumber }) => ({ text: `${pageNumber}/${pageCount}` }),
      };

      const pages = layoutPages(def, resources);

      expect((pages[0].header.children[0].objects[0] as any).text).toEqual('1/2');
      expect((pages[0].footer.children[0].objects[0] as any).text).toEqual('1/2');
      expect((pages[1].header.children[0].objects[0] as any).text).toEqual('2/2');
      expect((pages[1].footer.children[0].objects[0] as any).text).toEqual('2/2');
    });
  });

  describe('layoutPageContent', () => {
    it('returns empty page frame for empty content', () => {
      const { frame } = layoutPageContent([], box, resources);

      expect(frame).toEqual({ type: 'page', ...box, children: [] });
    });

    it('returns a paragraph with a single text row for single text content', () => {
      const text = [span('Test')];

      const { frame, remainder } = layoutPageContent([{ text }], box, resources);

      expect(remainder).toBeUndefined();
      expect(frame).toEqual({
        ...{ type: 'page', ...box },
        children: [
          {
            ...{ type: 'paragraph', x: 0, y: 0, width: 400, height: 18 * 1.2 },
            children: [
              {
                ...{ type: 'row', x: 0, y: 0, width: 72, height: 18 * 1.2 },
                objects: [
                  { type: 'text', x: 0, y: -3.6, text: 'Test', font: normalFont, fontSize: 18 },
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

      const { remainder } = layoutPageContent(paragraphs, box, resources);

      // 10 paragraphs * fontSize 10 * lineHeight 1.2 = height 120
      expect(remainder).toEqual(paragraphs.slice(10));
    });

    it('includes padding around text in paragraph', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const paragraphs = [{ text, padding: { left: 1, right: 2, top: 3, bottom: 4 } }];

      const { frame } = layoutPageContent(paragraphs, box, resources);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 0, y: 0, width: 400, height: 12 + 3 + 4 }),
      ]);
      expect(frame.children[0].children).toEqual([
        objectContaining({ type: 'row', x: 1, y: 3, width: 30, height: 12 }),
      ]);
    });

    it('surrounds paragraphs with margins', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const paragraphs = [
        { text, margin: { left: 1, right: 2, top: 3, bottom: 4 } },
        { text, margin: { left: 5, right: 6, top: 7, bottom: 8 } },
      ];

      const { frame } = layoutPageContent(paragraphs, box, resources);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 1, y: 3, width: 400 - 1 - 2, height: 12 }),
        objectContaining({ type: 'paragraph', x: 5, y: 3 + 12 + 7, width: 400 - 5 - 6 }),
      ]);
    });

    it('creates link objects', () => {
      const text = [{ text: 'foo', attrs: { link: 'test-link', fontSize: 10 } }];

      const { frame } = layoutPageContent([{ text }], box, resources);

      expect(frame.children[0].children[0].objects).toEqual([
        objectContaining({ type: 'text', x: 0, y: -2, text: 'foo' }),
        objectContaining({ type: 'link', x: 0, y: 0, width: 30, height: 10, url: 'test-link' }),
      ]);
    });

    it('merges adjacent link objects', () => {
      const text = [
        { text: 'foo ', attrs: { link: 'test-link', fontSize: 10 } },
        { text: 'bar', attrs: { italic: true, link: 'test-link', fontSize: 10 } },
      ];

      const { frame } = layoutPageContent([{ text }], box, resources);

      expect(frame.children[0].children[0].objects).toEqual([
        objectContaining({ type: 'text', x: 0, y: -2, text: 'foo ' }),
        objectContaining({ type: 'text', x: 40, y: -2, text: 'bar' }),
        objectContaining({ type: 'link', x: 0, y: 0, width: 70, height: 10, url: 'test-link' }),
      ]);
    });

    it('align texts in paragraphs to right', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const paragraphs = [
        {
          text,
          textAlign: 'right' as Alignment,
          margin: { left: 10, right: 20, top: 0, bottom: 0 },
          padding: { left: 15, right: 25, top: 0, bottom: 0 },
        },
      ];

      const { frame } = layoutPageContent(paragraphs, box, resources);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 10, y: 0, width: 400 - 10 - 20, height: 12 }),
      ]);
      expect(frame.children[0].children).toEqual([
        objectContaining({ type: 'row', x: 400 - 10 - 20 - 30 - 25, y: 0, width: 30, height: 12 }),
      ]);
    });

    it('align texts in paragraphs to center', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const paragraphs = [
        {
          text,
          textAlign: 'center' as Alignment,
          margin: { left: 10, right: 20, top: 0, bottom: 0 },
          padding: { left: 15, right: 25, top: 0, bottom: 0 },
        },
      ];

      const { frame } = layoutPageContent(paragraphs, box, resources);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 10, y: 0, width: 400 - 10 - 20, height: 12 }),
      ]);
      expect(frame.children[0].children).toEqual([
        objectContaining({
          type: 'row',
          x: (400 - 10 - 20 - 30 - 25 + 15) / 2,
          y: 0,
          width: 30,
          height: 12,
        }),
      ]);
    });

    it('includes graphics objects in child frame', () => {
      const graphics = [
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        { type: 'polyline', points: [p(1, 2), p(3, 4)] },
      ] as any;

      const { frame } = layoutPageContent([{ graphics }], box, resources);

      expect(frame).toEqual(objectContaining({ type: 'page', ...box }));
      expect(frame.children).toEqual([
        objectContaining({
          ...{ type: 'paragraph', x: 0, y: 0, width: 400, height: 0 },
          objects: [
            { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
            { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
            { type: 'polyline', points: [p(1, 2), p(3, 4)] },
          ],
        }),
      ]);
    });

    it('applies padding to graphics objects', () => {
      const graphics = [
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        { type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        { type: 'polyline', points: [p(1, 2), p(3, 4)] },
      ] as any;
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };

      const { frame } = layoutPageContent([{ graphics, padding }], box, resources);

      expect(frame).toEqual(objectContaining({ type: 'page', ...box }));
      expect(frame.children).toEqual([
        objectContaining({
          ...{ type: 'paragraph', x: 0, y: 0, width: 400, height: 10 },
          objects: [
            { type: 'line', x1: 6, y1: 7, x2: 8, y2: 9 },
            { type: 'rect', x: 6, y: 7, width: 10, height: 20 },
            { type: 'polyline', points: [p(6, 7), p(8, 9)] },
          ],
        }),
      ]);
    });
  });

  describe('layoutParagraph', () => {
    it('creates paragraph with intrinsic size', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { text, padding };

      const frame = layoutParagraph(paragraph, box, resources);

      expect(frame).toEqual(
        objectContaining({ type: 'paragraph', x: 20, y: 30, width: 400, height: 22 })
      );
    });

    it('creates paragraph with fixed size', () => {
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { padding, width: 80, height: 50 };

      const frame = layoutParagraph(paragraph, box, resources);

      expect(frame).toEqual({ type: 'paragraph', x: 20, y: 30, width: 80, height: 50 });
    });

    it('raises text by font descent', () => {
      const paragraph = { text: [span('Test text', { fontSize: 10 })] };

      const frame = layoutParagraph(paragraph, box, resources);

      expect(frame.children).toEqual([objectContaining({ type: 'row', y: 0, height: 12 })]);
      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', y: -2, fontSize: 10 }),
      ]);
    });

    it('raises text segments with different font size to common baseline', () => {
      const paragraph = {
        text: [
          span('Text one', { fontSize: 5 }),
          span('Text two', { fontSize: 10 }),
          span('Text three', { fontSize: 15 }),
        ],
      };

      const frame = layoutParagraph(paragraph, box, resources);

      expect(frame.children).toEqual([objectContaining({ type: 'row', y: 0, height: 18 })]);
      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', y: -3, fontSize: 5 }),
        objectContaining({ type: 'text', y: -3, fontSize: 10 }),
        objectContaining({ type: 'text', y: -3, fontSize: 15 }),
      ]);
    });
  });
});

function p(x: number, y: number) {
  return { x, y };
}

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
