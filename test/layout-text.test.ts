import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { Box } from '../src/box.js';
import { Document } from '../src/document.js';
import { layoutTextContent } from '../src/layout-text.js';
import { paperSizes } from '../src/page-sizes.js';
import { TextAttrs, TextSpan } from '../src/read-block.js';
import { fakeFont, range } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let box: Box, doc: Document;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { fonts, pageSize: paperSizes.A4 } as Document;
  });

  describe('layoutTextContent', () => {
    it('creates frame with intrinsic size', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const block = { text };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame).toEqual(objectContaining({ height: 12 }));
    });

    it('does not include padding in frame height', () => {
      const text = [span('foo', { fontSize: 10 })];
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { text, padding };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame.height).toEqual(12);
    });

    it('includes text baseline', () => {
      const block = { text: [span('Test text', { fontSize: 10 })] };

      const { frame } = layoutTextContent(block, box, doc) as any;

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 20, y: 30, width: 90, height: 12, baseline: 9 },
              segments: [{ font: doc.fonts[0].pdfFont, fontSize: 10, text: 'Test text' }],
            },
          ],
        },
      ]);
    });

    it('positions text segments with different font size at common baseline', () => {
      const block = {
        text: [
          span('Text one', { fontSize: 5 }),
          span('Text two', { fontSize: 10 }),
          span('Text three', { fontSize: 15 }),
        ],
      };

      const { frame } = layoutTextContent(block, box, doc) as any;

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 20, y: 30, width: 270, height: 18, baseline: 13.5 },
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

    it('align texts in block to the right', () => {
      const text = [span('foo', { fontSize: 10 })];
      const block = {
        text,
        textAlign: 'right' as const,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [objectContaining({ x: 20 + 400 - 30, y: 30, width: 30, height: 12 })],
        },
      ]);
    });

    it('align texts in blocks to the center', () => {
      const text = [span('foo', { fontSize: 10 })];
      const block = {
        text,
        textAlign: 'center' as const,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [objectContaining({ x: 20 + (400 - 30) / 2, y: 30, width: 30, height: 12 })],
        },
      ]);
    });

    it('creates link objects', () => {
      const block = {
        text: [span('foo', { link: 'test-link', fontSize: 10 })],
      };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30 + 1, width: 30, height: 10, url: 'test-link' },
      ]);
    });

    it('merges adjacent link objects', () => {
      const block = {
        text: [
          span('foo ', { link: 'test-link', fontSize: 10 }),
          span('bar', { italic: true, link: 'test-link', fontSize: 10 }),
        ],
      };

      const { frame } = layoutTextContent(block, box, doc);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30 + 1, width: 70, height: 10, url: 'test-link' },
      ]);
    });

    it('includes extra text attrs in segments', () => {
      const block = {
        text: [
          span('foo', {
            fontSize: 10,
            lineHeight: 1.2,
            color: rgb(0, 0.5, 1),
            rise: 3,
            letterSpacing: 5,
          }),
        ],
      };

      const { frame } = layoutTextContent(block, box, doc);

      expect((frame.objects?.[0] as any).rows[0].segments).toEqual([
        {
          font: doc.fonts[0].pdfFont,
          fontSize: 10,
          text: 'foo',
          color: { type: 'RGB', blue: 1, green: 0.5, red: 0 },
          rise: 3,
          letterSpacing: 5,
        },
      ]);
    });

    it('breaks text if it does not fit', () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20, italic: true })];
      const block = { text };

      const { remainder } = layoutTextContent(block, box, doc);

      expect(remainder).toEqual({
        text: [
          {
            text: expect.stringMatching(/^foo.*foo$/),
            attrs: expect.objectContaining({ fontSize: 20, italic: true }),
          },
        ],
      });
    });

    it('does not break if breakInside = avoid', () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20, italic: true })];
      const block = { text, breakInside: 'avoid' as const };

      const { remainder } = layoutTextContent(block, box, doc);

      expect(remainder).toBeUndefined();
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
