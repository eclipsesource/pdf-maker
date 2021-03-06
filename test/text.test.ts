import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import {
  breakLine,
  extractTextSegments,
  findLinebreakOpportunity,
  flattenTextSegments,
  splitChunks,
  TextSegment,
} from '../src/text.js';
import { fakeFont } from './test-utils.js';

const { objectContaining } = expect;

describe('text', () => {
  let fonts, normalFont;

  beforeEach(() => {
    fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    [normalFont] = fonts.map((f) => f.pdfFont);
  });

  describe('extractTextSegments', () => {
    it('handles empty array', () => {
      expect(extractTextSegments([], fonts)).toEqual([]);
    });

    it('returns segment with default attrs for single string', () => {
      expect(extractTextSegments([{ text: 'foo', attrs: {} }], fonts)).toEqual([
        {
          text: 'foo',
          width: 3 * 18,
          height: 18,
          fontSize: 18,
          lineHeight: 1.2,
          font: normalFont,
        },
      ]);
    });

    it('respects global text attrs', () => {
      const attrs = { fontSize: 10, lineHeight: 1.5, color: rgb(1, 0, 0) };

      const segments = extractTextSegments([{ text: 'foo', attrs }], fonts);

      expect(segments).toEqual([
        objectContaining({
          width: 3 * 10,
          height: 10,
          fontSize: 10,
          lineHeight: 1.5,
          color: rgb(1, 0, 0),
        }),
      ]);
    });

    it('respects local text attrs', () => {
      const attrs = { fontSize: 10, lineHeight: 1.5, color: rgb(1, 0, 0) };

      const segments = extractTextSegments([{ text: 'foo', attrs }], fonts);

      expect(segments).toEqual([
        objectContaining({
          fontSize: 10,
          lineHeight: 1.5,
          color: rgb(1, 0, 0),
        }),
      ]);
    });

    it('returns multiple segments for multiple content parts', () => {
      const segments = extractTextSegments(
        [
          { text: 'foo', attrs: {} },
          { text: 'bar', attrs: {} },
        ],
        fonts
      );

      expect(segments).toEqual([
        objectContaining({ text: 'foo' }),
        objectContaining({ text: 'bar' }),
      ]);
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
      const segments = [seg('foo', { color: 'red' }), seg(' '), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual([seg('foo', { color: 'red' }), seg(' bar')]);
    });

    it('does not merge compatible segments if not adjacent', () => {
      const segments = [seg('foo'), seg('-', { color: 'red' }), seg('bar')];

      expect(flattenTextSegments(segments)).toEqual(segments);
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

      expect(breakLine(segments, 0)).toEqual([[], [seg('aaa')]]);
      expect(breakLine(segments, 10)).toEqual([[], [seg('aaa')]]);
      expect(breakLine(segments, 30)).toEqual([[], [seg('aaa')]]);
      expect(breakLine(segments, 40)).toEqual([[seg(' '), seg('aaa')]]);
    });
  });
});

function seg(text: string, attrs?): TextSegment {
  const { font, fontSize = 10, height = 12, lineHeight = 14, link, color } = attrs ?? {};
  const width = text.length * fontSize;
  return { text, width, height, lineHeight, font, fontSize, link, color };
}
