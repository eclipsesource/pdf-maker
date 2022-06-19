import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutParagraph } from '../src/layout-text.js';
import { paperSizes } from '../src/page-sizes.js';
import { TextAttrs, TextSpan } from '../src/read-block.js';
import { fakeFont } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let box, doc;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { fonts, pageSize: paperSizes.A4 };
  });

  describe('layoutParagraph', () => {
    it('creates paragraph with intrinsic size', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { text, padding };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual(
        objectContaining({ type: 'text', x: 20, y: 30, width: 400, height: 22 })
      );
    });

    it('creates paragraph with fixed size', () => {
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { padding, width: 80, height: 50 };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual({ type: 'text', x: 20, y: 30, width: 80, height: 50 });
    });

    it('includes text baseline', () => {
      const paragraph = { text: [span('Test text', { fontSize: 10 })] };

      const frame = layoutParagraph(paragraph, box, doc) as any;

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 0, y: 0, width: 90, height: 12, baseline: 9 },
              segments: [{ font: doc.fonts[0].pdfFont, fontSize: 10, text: 'Test text' }],
            },
          ],
        },
      ]);
    });

    it('positions text segments with different font size at common baseline', () => {
      const paragraph = {
        text: [
          span('Text one', { fontSize: 5 }),
          span('Text two', { fontSize: 10 }),
          span('Text three', { fontSize: 15 }),
        ],
      };

      const frame = layoutParagraph(paragraph, box, doc) as any;

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 0, y: 0, width: 270, height: 18, baseline: 13.5 },
              segments: [
                { font: doc.fonts[0].pdfFont, fontSize: 5, text: 'Text one' },
                { font: doc.fonts[0].pdfFont, fontSize: 10, text: 'Text two' },
                { font: doc.fonts[0].pdfFont, fontSize: 15, text: 'Text three' },
              ],
            },
          ],
        },
      ]);
    });

    it('includes padding around text in paragraph', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = { text, padding: { left: 1, right: 2, top: 3, bottom: 4 } };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual(objectContaining({ type: 'text', width: 400, height: 12 + 3 + 4 }));
      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 1, y: 3, width: 30, height: 12 })] },
      ]);
    });

    it('align texts in paragraph to right', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = {
        text,
        textAlign: 'right' as const,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [objectContaining({ x: 400 - 30 - 25, y: 0, width: 30, height: 12 })],
        },
      ]);
    });

    it('align texts in paragraphs to center', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = {
        text,
        textAlign: 'center' as const,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [objectContaining({ x: (400 - 30 - 25 + 15) / 2, y: 0, width: 30, height: 12 })],
        },
      ]);
    });

    it('creates link objects', () => {
      const paragraph = {
        text: [span('foo', { link: 'test-link', fontSize: 10 })],
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 0, y: 0 })] },
        objectContaining({ type: 'link', x: 0, y: 1, width: 30, height: 10, url: 'test-link' }),
      ]);
    });

    it('merges adjacent link objects', () => {
      const paragraph = {
        text: [
          span('foo ', { link: 'test-link', fontSize: 10 }),
          span('bar', { italic: true, link: 'test-link', fontSize: 10 }),
        ],
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 0, y: 0 })] },
        objectContaining({ type: 'link', x: 0, y: 1, width: 70, height: 10, url: 'test-link' }),
      ]);
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
