import type { PDFFont } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rgb } from './colors.ts';
import { FontStore } from './font-store.ts';
import { findLineBreaks } from './line-break.ts';
import { fakeFont } from './test/test-utils.ts';
import type { ShapeCache, TextSegment } from './text.ts';
import {
  breakLine,
  buildShapeOptions,
  extractTextSegments,
  flattenTextSegments,
  splitChunks,
} from './text.ts';

describe('text', () => {
  let normalFont: PDFFont;
  let fontStore: FontStore;

  beforeEach(() => {
    normalFont = fakeFont('Test');
    const italicFont = fakeFont('Test', { style: 'italic' });
    fontStore = new FontStore();
    fontStore.selectFont = (selector) => {
      return Promise.resolve(selector.fontStyle === 'italic' ? italicFont : normalFont);
    };
  });

  describe('extractTextSegments', () => {
    it('handles empty array', async () => {
      const segments = await extractTextSegments([], fontStore);

      expect(segments).toEqual([]);
    });

    it('returns segment with default attrs for single string', async () => {
      const segments = await extractTextSegments([{ text: 'foo', attrs: {} }], fontStore);

      expect(segments).toEqual([
        expect.objectContaining({
          width: 3 * 18,
          height: 18,
          fontSize: 18,
          lineHeight: 1,
          font: normalFont,
        }),
      ]);
      expect(segments[0].glyphs).toHaveLength(3);
    });

    it('respects global text attrs', async () => {
      const attrs = {
        fontSize: 10,
        lineHeight: 1.5,
        color: rgb(1, 0, 0),
        rise: 3,
        letterSpacing: 5,
      };

      const segments = await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(segments).toEqual([
        expect.objectContaining({
          width: 3 * (10 + 5), // 3 chars * 10pt + 5pt letterSpacing
          height: 10,
          fontSize: 10,
          lineHeight: 1.5,
          color: rgb(1, 0, 0),
          rise: 3,
          letterSpacing: 5,
        }),
      ]);
    });

    it('respects local text attrs', async () => {
      const attrs = { fontSize: 10, lineHeight: 1.5, color: rgb(1, 0, 0) };

      const segments = await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(segments).toEqual([
        expect.objectContaining({
          fontSize: 10,
          lineHeight: 1.5,
          color: rgb(1, 0, 0),
        }),
      ]);
    });

    it('returns multiple segments for multiple content parts', async () => {
      const segments = await extractTextSegments(
        [
          { text: 'foo', attrs: {} },
          { text: 'bar', attrs: {} },
        ],
        fontStore,
      );

      expect(segments).toHaveLength(2);
      expect(segments[0].glyphs).toHaveLength(3);
      expect(segments[1].glyphs).toHaveLength(3);
    });

    it('passes fontKerning none as shape options', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const attrs = { fontSize: 10, fontKerning: 'none' as const };

      await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', {
        scriptTag: 'latn',
        features: { kern: false },
      });
    });

    it('passes fontVariantLigatures none as shape options', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const attrs = { fontSize: 10, fontVariantLigatures: 'none' as const };

      await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', {
        scriptTag: 'latn',
        features: { liga: false, clig: false, calt: false },
      });
    });

    it('passes fontFeatureSettings as shape options', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const attrs = { fontSize: 10, fontFeatureSettings: { smcp: true, tnum: true } };

      await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', {
        scriptTag: 'latn',
        features: { smcp: true, tnum: true },
      });
    });

    it('combines all shaping properties', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const attrs = {
        fontSize: 10,
        fontKerning: 'none' as const,
        fontVariantLigatures: 'none' as const,
        fontFeatureSettings: { smcp: true },
      };

      await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', {
        scriptTag: 'latn',
        features: { smcp: true, liga: false, clig: false, calt: false, kern: false },
      });
    });

    it('shapes repeated words only once', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const shapeCache: ShapeCache = new Map();

      await extractTextSegments([{ text: 'foo bar foo', attrs: {} }], fontStore, shapeCache);
      await extractTextSegments([{ text: 'bar foo', attrs: {} }], fontStore, shapeCache);

      expect(shapeTextSpy.mock.calls.map(([text]) => text)).toEqual(['foo', ' ', 'bar']);
    });

    it('shapes words again with different shape options', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;
      const shapeCache: ShapeCache = new Map();

      await extractTextSegments([{ text: 'foo', attrs: {} }], fontStore, shapeCache);
      await extractTextSegments(
        [{ text: 'foo', attrs: { fontKerning: 'none' } }],
        fontStore,
        shapeCache,
      );

      expect(shapeTextSpy).toHaveBeenCalledTimes(2);
    });

    it('passes scriptTag for Latin text', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;

      await extractTextSegments([{ text: 'foo', attrs: { fontSize: 10 } }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', { scriptTag: 'latn' });
    });

    it('passes scriptTag for Cyrillic text', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;

      await extractTextSegments([{ text: 'Мир', attrs: { fontSize: 10 } }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('Мир', { scriptTag: 'cyrl' });
    });

    it('splits mixed-script text into separate shapeText calls', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;

      await extractTextSegments([{ text: 'HiМир', attrs: { fontSize: 10 } }], fontStore);

      expect(shapeTextSpy).toHaveBeenCalledWith('Hi', { scriptTag: 'latn' });
      expect(shapeTextSpy).toHaveBeenCalledWith('Мир', { scriptTag: 'cyrl' });
    });

    it('passes langSysTag when language is set', async () => {
      const shapeTextSpy = vi.fn(normalFont.shapeText.bind(normalFont));
      normalFont.shapeText = shapeTextSpy;

      await extractTextSegments(
        [{ text: 'foo', attrs: { fontSize: 10, language: 'de' } }],
        fontStore,
      );

      expect(shapeTextSpy).toHaveBeenCalledWith('foo', {
        scriptTag: 'latn',
        langSysTag: 'DEU ',
      });
    });

    it('preserves shaping properties on segments', async () => {
      const attrs = {
        fontSize: 10,
        fontKerning: 'none' as const,
        fontVariantLigatures: 'none' as const,
        fontFeatureSettings: { smcp: true },
      };

      const segments = await extractTextSegments([{ text: 'foo', attrs }], fontStore);

      expect(segments[0]).toEqual(
        expect.objectContaining({
          fontKerning: 'none',
          fontVariantLigatures: 'none',
          fontFeatureSettings: { smcp: true },
        }),
      );
    });
  });

  describe('buildShapeOptions', () => {
    it('returns undefined when no options set', () => {
      expect(buildShapeOptions({})).toBeUndefined();
    });

    it('returns undefined when default options set', () => {
      expect(
        buildShapeOptions({ fontKerning: 'normal', fontVariantLigatures: 'normal' }),
      ).toBeUndefined();
    });

    it('disables kern for fontKerning none', () => {
      expect(buildShapeOptions({ fontKerning: 'none' })).toEqual({ features: { kern: false } });
    });

    it('disables ligatures for fontVariantLigatures none', () => {
      expect(buildShapeOptions({ fontVariantLigatures: 'none' })).toEqual({
        features: { liga: false, clig: false, calt: false },
      });
    });

    it('passes through fontFeatureSettings', () => {
      expect(buildShapeOptions({ fontFeatureSettings: { smcp: true } })).toEqual({
        features: { smcp: true },
      });
    });

    it('lets high-level properties override fontFeatureSettings', () => {
      const result = buildShapeOptions({
        fontKerning: 'none',
        fontVariantLigatures: 'none',
        fontFeatureSettings: { kern: true, liga: true, smcp: true },
      });

      expect(result).toEqual({
        features: { kern: false, liga: false, clig: false, calt: false, smcp: true },
      });
    });

    it('includes scriptTag when provided', () => {
      expect(buildShapeOptions({}, 'latn')).toEqual({ scriptTag: 'latn' });
    });

    it('omits DFLT scriptTag', () => {
      expect(buildShapeOptions({}, 'DFLT')).toBeUndefined();
    });

    it('combines scriptTag with features', () => {
      expect(buildShapeOptions({ fontKerning: 'none' }, 'arab')).toEqual({
        scriptTag: 'arab',
        features: { kern: false },
      });
    });

    it('returns undefined when no scriptTag and no features', () => {
      expect(buildShapeOptions({}, undefined)).toBeUndefined();
    });

    it('includes langSysTag when language is set', () => {
      expect(buildShapeOptions({ language: 'de' })).toEqual({ langSysTag: 'DEU ' });
    });

    it('combines langSysTag with scriptTag', () => {
      expect(buildShapeOptions({ language: 'de' }, 'latn')).toEqual({
        scriptTag: 'latn',
        langSysTag: 'DEU ',
      });
    });

    it('combines langSysTag with features', () => {
      expect(buildShapeOptions({ language: 'de', fontKerning: 'none' })).toEqual({
        langSysTag: 'DEU ',
        features: { kern: false },
      });
    });

    it('ignores unknown language', () => {
      expect(buildShapeOptions({ language: 'xx' })).toBeUndefined();
    });
  });

  describe('splitChunks', () => {
    it('handles empty string', () => {
      expect(chunkTexts('')).toEqual([]);
    });

    it('handles single non-space', () => {
      expect(chunkTexts('a')).toEqual(['a']);
    });

    it('handles single space', () => {
      expect(chunkTexts(' ')).toEqual([' ']);
    });

    it('splits multiple non-spaces', () => {
      expect(chunkTexts('aaa')).toEqual(['aaa']);
    });

    it('splits multiple spaces', () => {
      expect(chunkTexts('   ')).toEqual(['   ']);
    });

    it('splits multiple spaces and non-spaces', () => {
      expect(chunkTexts('  aaa  bbb  ')).toEqual(['  ', 'aaa', '  ', 'bbb', '  ']);
      expect(chunkTexts('aaa  bbb  ccc')).toEqual(['aaa', '  ', 'bbb', '  ', 'ccc']);
    });

    it('does not split at no-break spaces', () => {
      expect(chunkTexts('aaa\u00a0bbb')).toEqual(['aaa\u00a0bbb']);
      expect(chunkTexts('aaa\u202f\u2007bbb ccc')).toEqual(['aaa\u202f\u2007bbb', ' ', 'ccc']);
    });

    it('splits after hyphens and dashes', () => {
      expect(chunkTexts('state-of-the-art')).toEqual(['state-', 'of-', 'the-', 'art']);
      expect(chunkTexts('a\u2013b\u2014c')).toEqual(['a\u2013', 'b\u2014', 'c']);
    });

    it('does not split after word-initial hyphen or before digits', () => {
      expect(chunkTexts('-foo')).toEqual(['-foo']);
      expect(chunkTexts('a -b')).toEqual(['a', ' ', '-b']);
      expect(chunkTexts('a-1')).toEqual(['a-1']);
    });

    it('does not split at non-breaking hyphen', () => {
      expect(chunkTexts('a\u2011b')).toEqual(['a\u2011b']);
    });

    it('marks chunks that allow a line break after them', () => {
      expect(splitChunks('a b-c')).toEqual([
        { text: 'a', type: 'text' },
        { text: ' ', type: 'whitespace', breakAfter: true },
        { text: 'b-', type: 'text', breakAfter: true },
        { text: 'c', type: 'text' },
      ]);
    });

    it('removes soft hyphens and marks chunk before them', () => {
      expect(splitChunks('hy\u00adphen')).toEqual([
        { text: 'hy', type: 'text', breakAfter: true, softHyphen: true },
        { text: 'phen', type: 'text' },
      ]);
    });

    it('removes zero-width spaces and marks chunk before them', () => {
      expect(splitChunks('foo\u200bbar')).toEqual([
        { text: 'foo', type: 'text', breakAfter: true },
        { text: 'bar', type: 'text' },
      ]);
    });

    it('keeps empty chunk of soft hyphen at the start of the text', () => {
      const breaks = findLineBreaks('aaa\u00adbbb');

      expect(splitChunks('\u00adbbb', breaks, 3)).toEqual([
        { text: '', type: 'text', breakAfter: true, softHyphen: true },
        { text: 'bbb', type: 'text' },
      ]);
    });

    it('uses breaks with offset', () => {
      const breaks = findLineBreaks('foo bar-baz');

      expect(splitChunks('bar-baz', breaks, 4)).toEqual([
        { text: 'bar-', type: 'text', breakAfter: true },
        { text: 'baz', type: 'text' },
      ]);
    });

    it('splits newlines', () => {
      expect(chunkTexts('aaa\nbbb')).toEqual(['aaa', '\n', 'bbb']);
      expect(chunkTexts('aaa \n bbb')).toEqual(['aaa', '\n', 'bbb']);
      expect(chunkTexts('aaa \n \n bbb')).toEqual(['aaa', '\n', '\n', 'bbb']);
    });
  });

  describe('flattenTextSegments', () => {
    it('handles empty array', () => {
      expect(flattenTextSegments([])).toEqual([]);
    });

    it('merges very long segments', () => {
      const segments = [seg('a'), seg('x'.repeat(200_000))];

      expect(flattenTextSegments(segments)[0].glyphs).toHaveLength(200_001);
    });

    it('merges subsequent segments if compatible', () => {
      const segments = [seg('foo'), seg(' '), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual([seg('foo bar')]);
    });

    it('does not merge newline segments', () => {
      const segments = [seg('foo'), seg('\n'), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual(segments);
    });

    it('does not merge segments with different language', () => {
      const segments = [seg('foo', { language: 'de' }), seg('bar', { language: 'fr' })];

      expect(flattenTextSegments(segments)).toEqual(segments);
    });

    it('does not merge segments with different lineHeight', () => {
      const segments = [seg('foo', { lineHeight: 1.5 }), seg('bar', { lineHeight: 1.3 })];

      expect(flattenTextSegments(segments)).toEqual(segments);
    });

    it('does not merge adjacent segments if incompatible', () => {
      const segments = [seg('foo', { color: rgb(1, 0, 0) }), seg(' '), seg('bar')];

      const result = flattenTextSegments(segments);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(seg('foo', { color: rgb(1, 0, 0) }));
      expect(result[1].glyphs).toEqual(seg(' bar').glyphs);
      expect(result[1].width).toEqual(seg(' bar').width);
    });

    it('does not merge compatible segments if not adjacent', () => {
      const segments = [seg('foo'), seg('-', { color: rgb(1, 0, 0) }), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual(segments);
    });

    it('does not merge segments with different fontKerning', () => {
      const segments = [seg('foo', { fontKerning: 'none' }), seg('bar')];

      expect(flattenTextSegments(segments)).toHaveLength(2);
    });

    it('does not merge segments with different fontVariantLigatures', () => {
      const segments = [seg('foo', { fontVariantLigatures: 'none' }), seg('bar')];

      expect(flattenTextSegments(segments)).toHaveLength(2);
    });

    it('merges segments with equal font', () => {
      const segments = [
        seg('foo', { font: fakeFont('Test') }),
        seg('bar', { font: fakeFont('Test') }),
      ];

      expect(flattenTextSegments(segments)).toHaveLength(1);
    });

    it('merges segments with equal color', () => {
      const segments = [seg('foo', { color: rgb(1, 0, 0) }), seg('bar', { color: rgb(1, 0, 0) })];

      expect(flattenTextSegments(segments)).toHaveLength(1);
    });

    it('merges segments with equal fontFeatureSettings', () => {
      const segments = [
        seg('foo', { fontFeatureSettings: { smcp: true } }),
        seg('bar', { fontFeatureSettings: { smcp: true } }),
      ];

      expect(flattenTextSegments(segments)).toHaveLength(1);
    });

    it('does not merge segments with different fontFeatureSettings', () => {
      const segments = [
        seg('foo', { fontFeatureSettings: { smcp: true } }),
        seg('bar', { fontFeatureSettings: { liga: true } }),
      ];

      expect(flattenTextSegments(segments)).toHaveLength(2);
    });
  });

  describe('breakLine', () => {
    it('breaks after segment that allows it', () => {
      const segments = [seg('aaa-', { breakAfter: true }), seg('bbb')];

      expect(breakFirstLine(segments, 50)).toEqual([[segments[0]], [seg('bbb')]]);
      expect(breakFirstLine(segments, 70)).toEqual([segments]);
    });

    it('breaks after last segment that fits', () => {
      const segments = [
        seg('a-', { breakAfter: true }),
        seg('b-', { breakAfter: true }),
        seg('ccc'),
      ];

      expect(breakFirstLine(segments, 40)).toEqual([segments.slice(0, 2), [seg('ccc')]]);
    });

    it('breaks overflowing text at next opportunity', () => {
      const segments = [seg('aaaa-', { breakAfter: true }), seg('bbb')];

      expect(breakFirstLine(segments, 20)).toEqual([[segments[0]], [seg('bbb')]]);
    });

    it('adds hyphen when breaking after soft hyphen', () => {
      const hyphen = { glyphs: seg('-').glyphs, width: 10 };
      const segments = [seg('aaa', { breakAfter: true, hyphen }), seg('bbb')];

      const [line, rest] = breakFirstLine(segments, 50);

      expect(line.map((s) => s.glyphs.length)).toEqual([3, 1]);
      expect(line[1]).toEqual(expect.objectContaining({ glyphs: hyphen.glyphs, width: 10 }));
      expect(rest).toEqual([seg('bbb')]);
    });

    it('does not add hyphen to unbroken line', () => {
      const hyphen = { glyphs: seg('-').glyphs, width: 10 };
      const segments = [seg('aaa', { breakAfter: true, hyphen }), seg('bbb')];

      expect(breakFirstLine(segments, 60)).toEqual([segments]);
    });

    it('does not break at soft hyphen if hyphen does not fit', () => {
      const hyphen = { glyphs: seg('-').glyphs, width: 10 };
      const segments = [
        seg('aa', { breakAfter: true }),
        seg('bb', { breakAfter: true, hyphen }),
        seg('cc'),
      ];

      expect(breakFirstLine(segments, 45)).toEqual([[segments[0]], segments.slice(1)]);
    });

    it('removes whitespace at the end of the last line', () => {
      expect(breakFirstLine([seg('aaa'), seg(' ')], 100)).toEqual([[seg('aaa')]]);
    });

    it('lets whitespace exceed the width at a line break', () => {
      const segments = [seg('aaa'), seg(' ', { breakAfter: false }), seg(' '), seg('bbb')];

      expect(breakFirstLine(segments, 30)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('breaks line that starts at given index', () => {
      const segments = [seg('aaa'), seg(' '), seg('bbb'), seg(' '), seg('ccc')];

      expect(breakLine(segments, 30, 2)).toEqual({ line: [seg('bbb')], next: 4 });
      expect(breakLine(segments, 80, 2)).toEqual({ line: segments.slice(2), next: 5 });
    });

    it('handles empty array', () => {
      expect(breakFirstLine([], 10)).toEqual([[]]);
    });

    it('breaks at whitespace segment', () => {
      const segments = [seg('aaa'), seg(' '), seg('bbb')];

      expect(breakFirstLine(segments, 30)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakFirstLine(segments, 40)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakFirstLine(segments, 50)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('breaks at newline segment', () => {
      const segments = [seg('aaa'), seg('\n'), seg('bbb')];

      expect(breakFirstLine(segments, 30)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakFirstLine(segments, 40)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakFirstLine(segments, 80)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('breaks at leading newline segment', () => {
      const segments = [seg('\n'), seg('aaa')];

      expect(breakFirstLine(segments, 20)).toEqual([[seg('')], [seg('aaa')]]);
    });

    it('keeps unbreakable text on same line', () => {
      const segments = [seg('aaa'), seg(' '), seg('bbb')];

      expect(breakFirstLine(segments, 20)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('keeps unbreakable text on same line (with newline)', () => {
      const segments = [seg('aaa'), seg('\n'), seg('bbb')];

      expect(breakFirstLine(segments, 20)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('removes all whitespace around line break', () => {
      const segments = [seg('aaa'), seg(' '), seg(' '), seg('bbb'), seg(' '), seg(' '), seg('ccc')];

      expect(breakFirstLine(segments, 90)).toEqual([
        [seg('aaa'), seg(' '), seg(' '), seg('bbb')],
        [seg('ccc')],
      ]);
      expect(breakFirstLine(segments, 70)).toEqual([
        [seg('aaa')],
        [seg('bbb'), seg(' '), seg(' '), seg('ccc')],
      ]);
    });

    it('removes whitespace after newline', () => {
      const segments = [seg('aaa'), seg('\n'), seg(' '), seg('bbb')];

      expect(breakFirstLine(segments, 80)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('removes leading whitespace before line break', () => {
      const segments = [seg(' '), seg('aaa')];

      expect(breakFirstLine(segments, 0)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakFirstLine(segments, 10)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakFirstLine(segments, 30)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakFirstLine(segments, 40)).toEqual([[seg(' '), seg('aaa')]]);
    });
  });
});

function chunkTexts(text: string): string[] {
  return splitChunks(text).map((chunk) => chunk.text);
}

// Returns the first line and, if any, the remaining segments.
function breakFirstLine(segments: TextSegment[], maxWidth: number): TextSegment[][] {
  const { line, next } = breakLine(segments, maxWidth);
  return next < segments.length ? [line, segments.slice(next)] : [line];
}

function seg(text: string, attrs?: Partial<TextSegment>): TextSegment {
  const {
    font,
    fontSize = 10,
    height = 12,
    lineHeight = 14,
    link,
    color,
    fontKerning,
    fontVariantLigatures,
    fontFeatureSettings,
    language,
  } = attrs ?? {};
  const width = text.length * fontSize;
  const glyphs = [...text].map((c) => ({
    glyphId: c.charCodeAt(0),
    codePoints: [c.codePointAt(0)!],
    advance: 1000,
  }));
  const type = text === '\n' ? 'newline' : /^\s+$/.test(text) ? 'whitespace' : 'text';
  const { breakAfter = type === 'whitespace' || undefined, hyphen } = attrs ?? {};
  return {
    type,
    breakAfter,
    hyphen,
    glyphs,
    width,
    height,
    lineHeight,
    font,
    fontSize,
    link,
    color,
    fontKerning,
    fontVariantLigatures,
    fontFeatureSettings,
    language,
  } as TextSegment;
}
