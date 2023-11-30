import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { Box } from '../box.js';
import { Font, FontSelector, FontStore } from '../fonts.js';
import { MakerCtx } from '../make-pdf.js';
import { extractTextRows, fakeFont, range, span } from '../test/test-utils.js';
import { layoutTextContent } from './layout-text.js';

const { objectContaining } = expect;

describe('layout-text', () => {
  let defaultFont: Font;
  let box: Box;
  let ctx: MakerCtx;

  beforeEach(() => {
    defaultFont = fakeFont('Test');
    const italicFont = fakeFont('Test', { style: 'italic' });
    const fontStore: FontStore = {
      async selectFont(selector: FontSelector) {
        return selector.fontStyle === 'italic' ? italicFont : defaultFont;
      },
    };
    box = { x: 20, y: 30, width: 400, height: 700 };
    ctx = { fontStore } as MakerCtx;
  });

  describe('layoutTextContent', () => {
    it('creates frame with full width and intrinsic height', async () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const block = { text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame).toEqual(objectContaining({ width: box.width, height: 12 }));
    });

    it('creates frame with intrinsic width for block with autoWidth', async () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const block = { text, autoWidth: true };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame).toEqual(objectContaining({ width: 30, height: 12 }));
    });

    it('does not include padding in frame height', async () => {
      const text = [span('foo', { fontSize: 10 })];
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block = { text, padding };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(12);
    });

    it('includes text baseline', async () => {
      const block = { text: [span('Test text', { fontSize: 10 })] };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 20, y: 30, width: 90, height: 12, baseline: 9 },
              segments: [{ font: defaultFont, fontSize: 10, text: 'Test text' }],
            },
          ],
        },
      ]);
    });

    it('positions text segments with different font size at common baseline', async () => {
      const block = {
        text: [
          span('Text one', { fontSize: 5 }),
          span('Text two', { fontSize: 10 }),
          span('Text three', { fontSize: 15 }),
        ],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 20, y: 30, width: 270, height: 18, baseline: 13.5 },
              segments: [
                { font: defaultFont, fontSize: 5, text: 'Text one' },
                { font: defaultFont, fontSize: 10, text: 'Text two' },
                { font: defaultFont, fontSize: 15, text: 'Text three' },
              ],
            },
          ],
        },
      ]);
    });

    it('creates link objects', async () => {
      const block = {
        text: [span('foo', { link: 'test-link', fontSize: 10 })],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30 + 1, width: 30, height: 10, url: 'test-link' },
      ]);
    });

    it('merges adjacent link objects', async () => {
      const block = {
        text: [
          span('foo ', { link: 'test-link', fontSize: 10 }),
          span('bar', { link: 'test-link', fontSize: 10, fontStyle: 'italic' }),
        ],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30 + 1, width: 70, height: 10, url: 'test-link' },
      ]);
    });

    it('includes extra text attrs in segments', async () => {
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

      const { frame } = await layoutTextContent(block, box, ctx);

      expect((frame.objects?.[0] as any).rows[0].segments).toEqual([
        {
          font: defaultFont,
          fontSize: 10,
          text: 'foo',
          color: { type: 'RGB', blue: 1, green: 0.5, red: 0 },
          rise: 3,
          letterSpacing: 5,
        },
      ]);
    });

    it('aligns rows and link objects in block to the right', async () => {
      const text = [span('foo', { fontSize: 10, link: 'test-link' })];
      const margin = { left: 10, right: 20, top: 0, bottom: 0 };
      const block = { text, textAlign: 'right' as const, margin };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [objectContaining({ x: margin.right + box.width - 30, width: 30 })],
        },
        expect.objectContaining({ type: 'link', x: margin.right + box.width - 30, width: 30 }),
      ]);
    });

    it('aligns rows and link objects in blocks to the center', async () => {
      const text = [span('foo', { fontSize: 10, link: 'test-link' })];
      const margin = { left: 10, right: 20, top: 0, bottom: 0 };
      const block = { text, textAlign: 'center' as const, margin };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            objectContaining({ x: margin.right + (box.width - 30) / 2, width: 30, height: 12 }),
          ],
        },
        expect.objectContaining({
          type: 'link',
          x: margin.right + (box.width - 30) / 2,
          width: 30,
        }),
      ]);
    });

    it('aligns rows and link objects when width is auto', async () => {
      const text = [span('foo\nline 2', { fontSize: 10, link: 'test-link' })];
      const margin = { left: 10, right: 20, top: 0, bottom: 0 };
      const block = { text, textAlign: 'right' as const, margin, autoWidth: true };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            objectContaining({ x: margin.right + 30, width: 30 }),
            objectContaining({ x: margin.right, width: 60 }),
          ],
        },
        expect.objectContaining({ type: 'link', x: margin.right + 30, width: 30 }),
        expect.objectContaining({ type: 'link', x: margin.right, width: 60 }),
      ]);
    });

    it('includes blank line for consecutive newlines', async () => {
      const text = [span('foo\n\nbar', { fontSize: 10, lineHeight: 1 })];
      const block = { text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(3 * 10);
    });

    it('includes blank line with height of previous line', async () => {
      const text = [
        span('foo\n\n', { fontSize: 10, lineHeight: 1 }),
        span('bar', { fontSize: 20, lineHeight: 1 }),
      ];
      const block = { text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(10 + 10 + 20);
    });

    it('includes blank line with height of next line', async () => {
      const text = [
        span('foo\n', { fontSize: 10, lineHeight: 1 }),
        span('\nbar', { fontSize: 20, lineHeight: 1 }),
      ];
      const block = { text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(10 + 20 + 20);
    });

    it('breaks text if it does not fit', async () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block = { text };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toEqual({
        text: [
          {
            text: expect.stringMatching(/^foo.*foo$/),
            attrs: expect.objectContaining({ fontSize: 20 }),
          },
        ],
      });
    });

    it('does not break text before the first line', async () => {
      box.height = 10;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block = { text };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toEqual({
        text: [
          {
            text: expect.stringMatching(/^foo.*foo$/),
            attrs: expect.objectContaining({ fontSize: 20 }),
          },
        ],
      });
    });

    it('does not break if breakInside = avoid', async () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block = { text, breakInside: 'avoid' as const };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toBeUndefined();
    });
  });
});
