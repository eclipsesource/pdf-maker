import type { PDFFont } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rgb } from './colors.ts';
import { FontStore } from './font-store.ts';
import { fakeFont } from './test/test-utils.ts';
import type { TextSegment } from './text.ts';
import {
  breakLine,
  buildShapeOptions,
  convertToTextSpan,
  extractTextSegments,
  findLinebreakOpportunity,
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
          lineHeight: 1.2,
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
        langSysTag: 'DEU',
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

  describe('convertToTextSpan', () => {
    it('includes shaping properties in attrs', () => {
      const segment = seg('foo', {
        fontKerning: 'none',
        fontVariantLigatures: 'none',
        fontFeatureSettings: { smcp: true },
      });

      const span = convertToTextSpan(segment);

      expect(span.attrs).toEqual(
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
      expect(buildShapeOptions({ language: 'de' })).toEqual({ langSysTag: 'DEU' });
    });

    it('combines langSysTag with scriptTag', () => {
      expect(buildShapeOptions({ language: 'de' }, 'latn')).toEqual({
        scriptTag: 'latn',
        langSysTag: 'DEU',
      });
    });

    it('combines langSysTag with features', () => {
      expect(buildShapeOptions({ language: 'de', fontKerning: 'none' })).toEqual({
        langSysTag: 'DEU',
        features: { kern: false },
      });
    });

    it('ignores unknown language', () => {
      expect(buildShapeOptions({ language: 'xx' })).toBeUndefined();
    });
  });

  describe('splitChunks', () => {
    it('handles empty string', () => {
      expect(splitChunks('')).toEqual([]);
    });

    it('handles single non-space', () => {
      expect(splitChunks('a')).toEqual(['a']);
    });

    it('handles single space', () => {
      expect(splitChunks(' ')).toEqual([' ']);
    });

    it('splits multiple non-spaces', () => {
      expect(splitChunks('aaa')).toEqual(['aaa']);
    });

    it('splits multiple spaces', () => {
      expect(splitChunks('   ')).toEqual(['   ']);
    });

    it('splits multiple spaces and non-spaces', () => {
      expect(splitChunks('  aaa  bbb  ')).toEqual(['  ', 'aaa', '  ', 'bbb', '  ']);
      expect(splitChunks('aaa  bbb  ccc')).toEqual(['aaa', '  ', 'bbb', '  ', 'ccc']);
    });

    it('splits newlines', () => {
      expect(splitChunks('aaa\nbbb')).toEqual(['aaa', '\n', 'bbb']);
      expect(splitChunks('aaa \n bbb')).toEqual(['aaa', '\n', 'bbb']);
      expect(splitChunks('aaa \n \n bbb')).toEqual(['aaa', '\n', '\n', 'bbb']);
    });
  });

  describe('findLinebreakOpportunity', () => {
    it('handles empty array', () => {
      expect(findLinebreakOpportunity([], 0)).toBeUndefined();
      expect(findLinebreakOpportunity([], 1)).toBeUndefined();
    });

    it('handles exceeding index', () => {
      expect(findLinebreakOpportunity([seg(' ')], -1)).toEqual(0);
      expect(findLinebreakOpportunity([seg(' ')], 2)).toEqual(0);
    });

    it('returns index itself if it contains whitespace', () => {
      expect(findLinebreakOpportunity([seg(' '), seg(' '), seg(' ')], 0)).toEqual(0);
      expect(findLinebreakOpportunity([seg(' '), seg(' '), seg(' ')], 1)).toEqual(1);
      expect(findLinebreakOpportunity([seg(' '), seg(' '), seg(' ')], 2)).toEqual(2);
    });

    it('returns previous opportunity', () => {
      expect(findLinebreakOpportunity([seg(' '), seg('a'), seg(' ')], 1)).toEqual(0);
      expect(findLinebreakOpportunity([seg(' '), seg(' '), seg('a')], 2)).toEqual(1);
      expect(findLinebreakOpportunity([seg(' '), seg('a'), seg('a')], 2)).toEqual(0);
    });

    it('returns next opportunity if no previous one', () => {
      expect(findLinebreakOpportunity([seg('a'), seg('a'), seg(' ')], 1)).toEqual(2);
      expect(findLinebreakOpportunity([seg('a'), seg('a'), seg(' ')], 0)).toEqual(2);
    });
  });

  describe('flattenTextSegments', () => {
    it('handles empty array', () => {
      expect(flattenTextSegments([])).toEqual([]);
    });

    it('merges subsequent segments if compatible', () => {
      const segments = [seg('foo'), seg(' '), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual([seg('foo bar')]);
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
    it('handles empty array', () => {
      expect(breakLine([], 10)).toEqual([[]]);
    });

    it('breaks at whitespace segment', () => {
      const segments = [seg('aaa'), seg(' '), seg('bbb')];

      expect(breakLine(segments, 30)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakLine(segments, 40)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakLine(segments, 50)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('breaks at newline segment', () => {
      const segments = [seg('aaa'), seg('\n'), seg('bbb')];

      expect(breakLine(segments, 30)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakLine(segments, 40)).toEqual([[seg('aaa')], [seg('bbb')]]);
      expect(breakLine(segments, 80)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('breaks at leading newline segment', () => {
      const segments = [seg('\n'), seg('aaa')];

      expect(breakLine(segments, 20)).toEqual([[seg('')], [seg('aaa')]]);
    });

    it('keeps unbreakable text on same line', () => {
      const segments = [seg('aaa'), seg(' '), seg('bbb')];

      expect(breakLine(segments, 20)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('keeps unbreakable text on same line (with newline)', () => {
      const segments = [seg('aaa'), seg('\n'), seg('bbb')];

      expect(breakLine(segments, 20)).toEqual([[seg('aaa')], [seg('bbb')]]);
    });

    it('removes leading whitespace before line break', () => {
      const segments = [seg(' '), seg('aaa')];

      expect(breakLine(segments, 0)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakLine(segments, 10)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakLine(segments, 30)).toEqual([[seg('')], [seg('aaa')]]);
      expect(breakLine(segments, 40)).toEqual([[seg(' '), seg('aaa')]]);
    });
  });
});

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
  } = attrs ?? {};
  const width = text.length * fontSize;
  const glyphs = [...text].map((c) => ({
    glyphId: c.charCodeAt(0),
    codePoints: [c.codePointAt(0)!],
    advance: 1000,
  }));
  const type = text === '\n' ? 'newline' : /^\s+$/.test(text) ? 'whitespace' : 'text';
  return {
    type,
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
  } as TextSegment;
}
