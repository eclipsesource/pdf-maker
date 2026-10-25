import type { PDFFont } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Box } from '../box.ts';
import { rgb } from '../colors.ts';
import { FontStore } from '../font-store.ts';
import type { FontSelector } from '../fonts.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { Block, ShapedTextBlock, TextBlock } from '../read/read-block.ts';
import { extractTextRows, fakeFont, range, span } from '../test/test-utils.ts';
import type { TextSegment } from '../text.ts';
import { getGlyphRunText } from '../text.ts';
import { layoutTextContent } from './layout-text.ts';

describe('layout-text', () => {
  let defaultFont: PDFFont;
  let box: Box;
  let ctx: MakerCtx;

  beforeEach(() => {
    defaultFont = fakeFont('Test');
    const italicFont = fakeFont('Test', { style: 'italic' });
    const fontStore = new FontStore();
    fontStore.selectFont = (selector: FontSelector) => {
      return Promise.resolve(selector.fontStyle === 'italic' ? italicFont : defaultFont);
    };
    box = { x: 20, y: 30, width: 400, height: 700 };
    ctx = { fontStore } as MakerCtx;
  });

  describe('layoutTextContent', () => {
    it('creates frame with full width and intrinsic height', async () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const block: TextBlock = { type: 'text', text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame).toEqual(expect.objectContaining({ width: box.width, height: 10 }));
    });

    it('creates frame with intrinsic width for block with autoWidth', async () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const block: TextBlock = { type: 'text', text, autoWidth: true };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame).toEqual(expect.objectContaining({ width: 30, height: 10 }));
    });

    it('does not include padding in frame height', async () => {
      const text = [span('foo', { fontSize: 10 })];
      const padding = { left: 1, right: 2, top: 3, bottom: 4 };
      const block: TextBlock = { type: 'text', text, padding };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(10);
    });

    it('includes text baseline', async () => {
      const block: TextBlock = { type: 'text', text: [span('Test text', { fontSize: 10 })] };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            {
              ...{ x: 20, y: 30, width: 90, height: 10, baseline: 8 },
              segments: [expect.objectContaining({ font: defaultFont, fontSize: 10 })],
            },
          ],
        },
      ]);
    });

    it('positions text segments with different font size at common baseline', async () => {
      const block: TextBlock = {
        type: 'text',
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
              ...{ x: 20, y: 30, width: 270, height: 15, baseline: 12 },
              segments: [
                expect.objectContaining({ font: defaultFont, fontSize: 5 }),
                expect.objectContaining({ font: defaultFont, fontSize: 10 }),
                expect.objectContaining({ font: defaultFont, fontSize: 15 }),
              ],
            },
          ],
        },
      ]);
    });

    it('creates row with small line height', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [span('foo', { fontSize: 10, lineHeight: 0.5 })],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ height: 5, baseline: 5.5 })] },
      ]);
    });

    it('creates row with zero line height', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [span('foo', { fontSize: 10, lineHeight: 0 })],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ height: 0, baseline: 3 })] },
      ]);
    });

    it('fits row to segments with different line heights', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [
          span('foo', { fontSize: 10, lineHeight: 3 }),
          span('bar', { fontSize: 25, link: 'test-link' }),
        ],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      // foo: 18 above and 12 below the baseline, bar: 20 above and 5 below
      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ height: 32, baseline: 20 })] },
        expect.objectContaining({ type: 'link', y: box.y, height: 25 }),
      ]);
    });

    it('creates link objects', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [span('foo', { link: 'test-link', fontSize: 10 })],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30, width: 30, height: 10, url: 'test-link' },
      ]);
    });

    it('merges adjacent link objects', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [
          span('foo ', { link: 'test-link', fontSize: 10 }),
          span('bar', { link: 'test-link', fontSize: 10, fontStyle: 'italic' }),
        ],
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ x: 20, y: 30 })] },
        { type: 'link', x: 20, y: 30, width: 70, height: 10, url: 'test-link' },
      ]);
    });

    it('includes extra text attrs in segments', async () => {
      const block: TextBlock = {
        type: 'text',
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
        expect.objectContaining({
          font: defaultFont,
          fontSize: 10,
          color: { type: 'RGB', blue: 1, green: 0.5, red: 0 },
          rise: 3,
          letterSpacing: 5,
        }),
      ]);
    });

    it('aligns rows and link objects in block to the right', async () => {
      const text = [span('foo', { fontSize: 10, link: 'test-link' })];
      const margin = { left: 10, right: 20, top: 0, bottom: 0 };
      const block: TextBlock = { type: 'text', text, textAlign: 'right' as const, margin };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [expect.objectContaining({ x: margin.right + box.width - 30, width: 30 })],
        },
        expect.objectContaining({
          type: 'link',
          x: margin.right + box.width - 30,
          width: 30,
        }),
      ]);
    });

    it('aligns rows and link objects in blocks to the center', async () => {
      const text = [span('foo', { fontSize: 10, link: 'test-link' })];
      const margin = { left: 10, right: 20, top: 0, bottom: 0 };
      const block: TextBlock = { type: 'text', text, textAlign: 'center' as const, margin };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            expect.objectContaining({
              x: margin.right + (box.width - 30) / 2,
              width: 30,
              height: 10,
            }),
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
      const block: TextBlock = {
        type: 'text',
        text,
        textAlign: 'right' as const,
        margin,
        autoWidth: true,
      };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            expect.objectContaining({ x: margin.right + 30, width: 30 }),
            expect.objectContaining({ x: margin.right, width: 60 }),
          ],
        },
        expect.objectContaining({ type: 'link', x: margin.right + 30, width: 30 }),
        expect.objectContaining({ type: 'link', x: margin.right, width: 60 }),
      ]);
    });

    it('ignores whitespace around line breaks when aligning', async () => {
      box.width = 50;
      const text = [span('foo '), span(' bar', { fontStyle: 'italic' })];
      const block: TextBlock = { type: 'text', text, textAlign: 'right' as const };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        {
          type: 'text',
          rows: [
            expect.objectContaining({ x: box.x + 20, width: 30 }),
            expect.objectContaining({ x: box.x + 20, width: 30 }),
          ],
        },
      ]);
    });

    it('aligns link objects with their row', async () => {
      const text = [span('foo '), span('bar', { link: 'test-link' })];
      const block: TextBlock = { type: 'text', text, textAlign: 'right' as const };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.objects).toEqual([
        { type: 'text', rows: [expect.objectContaining({ x: box.x + box.width - 70 })] },
        expect.objectContaining({ type: 'link', x: box.x + box.width - 30, width: 30 }),
      ]);
    });

    it('breaks lines after hyphens', async () => {
      const block: TextBlock = { type: 'text', text: [span('foo-bar-baz')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 80 }, ctx);

      expect(extractTextRows(frame)).toEqual(['foo-bar-', 'baz']);
    });

    it('breaks lines after hyphen at the end of a span', async () => {
      const block: TextBlock = {
        type: 'text',
        text: [span('foo-'), span('bar', { fontStyle: 'italic' })],
      };

      const { frame } = await layoutTextContent(block, { ...box, width: 50 }, ctx);

      expect(extractTextRows(frame)).toEqual(['foo-', 'bar']);
    });

    it('shows soft hyphen only at line break', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa\u00adbbb ccc')] };

      const { frame: wide } = await layoutTextContent(block, box, ctx);
      const { frame: narrow } = await layoutTextContent(block, { ...box, width: 40 }, ctx);

      expect(extractTextRows(wide)).toEqual(['aaabbb ccc']);
      expect(extractTextRows(narrow)).toEqual(['aaa-', 'bbb', 'ccc']);
    });

    it('breaks lines at soft hyphen at the start of a span', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa'), span('\u00adbbb')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 40 }, ctx);

      expect(extractTextRows(frame)).toEqual(['aaa-', 'bbb']);
    });

    it('breaks lines at zero-width space at the start of a span', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa'), span('\u200bbbb')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 40 }, ctx);

      expect(extractTextRows(frame)).toEqual(['aaa', 'bbb']);
    });

    it('breaks lines after whitespace split across spans', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa bbb '), span(' ccc')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 70 }, ctx);

      expect(extractTextRows(frame)).toEqual(['aaa bbb', 'ccc']);
    });

    it('does not insert blank line for whitespace before newline in next span', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa '), span('\nbbb')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 30 }, ctx);

      expect(extractTextRows(frame)).toEqual(['aaa', 'bbb']);
    });

    it('breaks lines at zero-width spaces without showing them', async () => {
      const block: TextBlock = { type: 'text', text: [span('aaa\u200bbbb')] };

      const { frame } = await layoutTextContent(block, { ...box, width: 40 }, ctx);

      expect(extractTextRows(frame)).toEqual(['aaa', 'bbb']);
    });

    it('includes blank line for consecutive newlines', async () => {
      const text = [span('foo\n\nbar', { fontSize: 10, lineHeight: 1 })];
      const block: TextBlock = { type: 'text', text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(3 * 10);
    });

    it('includes blank line with height of previous line', async () => {
      const text = [
        span('foo\n\n', { fontSize: 10, lineHeight: 1 }),
        span('bar', { fontSize: 20, lineHeight: 1 }),
      ];
      const block: TextBlock = { type: 'text', text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(10 + 10 + 20);
    });

    it('includes blank line with height of next line', async () => {
      const text = [
        span('foo\n', { fontSize: 10, lineHeight: 1 }),
        span('\nbar', { fontSize: 20, lineHeight: 1 }),
      ];
      const block: TextBlock = { type: 'text', text };

      const { frame } = await layoutTextContent(block, box, ctx);

      expect(frame.height).toEqual(10 + 20 + 20);
    });

    it('breaks text if it does not fit', async () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block: TextBlock = { type: 'text', text };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toEqual({ type: 'text', shapedText: expect.any(Array) });
      expect(getRemainingText(remainder)).toMatch(/^foo.*foo$/);
      expect(getShapedText(remainder)[0]).toEqual(expect.objectContaining({ fontSize: 20 }));
    });

    it('does not break text before the first line', async () => {
      box.height = 10;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block: TextBlock = { type: 'text', text };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toEqual({ type: 'text', shapedText: expect.any(Array) });
      expect(getRemainingText(remainder)).toMatch(/^foo.*foo$/);
      expect(getShapedText(remainder)[0]).toEqual(expect.objectContaining({ fontSize: 20 }));
    });

    it('keeps newlines in remainder', async () => {
      box.height = 10;
      const text = [span('foo\nbar\nbaz')];
      const block: TextBlock = { type: 'text', text };

      const { remainder } = await layoutTextContent(block, box, ctx);

      expect(getRemainingText(remainder)).toBe('bar\nbaz');
    });

    it('keeps language in remainder', async () => {
      box.height = 10;
      const text = [span('foo\nbar', { language: 'de' })];
      const block: TextBlock = { type: 'text', text };

      const { remainder } = await layoutTextContent(block, box, ctx);

      expect(getShapedText(remainder)).toEqual([expect.objectContaining({ language: 'de' })]);
    });

    it('continues remainder at new width without shaping again', async () => {
      const shapeText = vi.spyOn(defaultFont, 'shapeText');
      const text = [span('aaa bbb ccc ddd eee', { fontSize: 10 })];
      const first = await layoutTextContent(
        { type: 'text', text },
        { ...box, width: 80, height: 10 },
        ctx,
      );
      shapeText.mockClear();

      const { frame } = await layoutTextContent(first.remainder as ShapedTextBlock, box, ctx);

      expect(extractTextRows(first.frame)).toEqual(['aaa bbb']);
      expect(extractTextRows(frame)).toEqual(['ccc ddd eee']);
      expect(shapeText).not.toHaveBeenCalled();
    });

    it('does not break if breakInside = avoid', async () => {
      box.height = 100;
      const longText = range(100)
        .map(() => 'foo')
        .join(' ');
      const text = [span(longText, { fontSize: 20 })];
      const block: TextBlock = { type: 'text', text, breakInside: 'avoid' as const };

      const { frame, remainder } = await layoutTextContent(block, box, ctx);

      expect(extractTextRows(frame).join()).toMatch(/^foo.*foo$/);
      expect(remainder).toBeUndefined();
    });
  });
});

function getRemainingText(remainder: Block | undefined): string {
  return getShapedText(remainder)
    .map((seg) => (seg.type === 'newline' ? '\n' : getGlyphRunText(seg.glyphs)))
    .join('');
}

function getShapedText(block: Block | undefined): TextSegment[] {
  return (block as ShapedTextBlock).shapedText;
}
