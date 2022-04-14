import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import {
  breakLine,
  extractTextSegments,
  findLinebreakOpportunity,
  flattenTextSegments,
  parseColumns,
  parseContent,
  parseParagraph,
  parseRows,
  parseText,
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

  describe('parseContent', () => {
    it('accepts empty content', () => {
      expect(parseContent([], {})).toEqual([]);
    });

    it('includes all paragraphs with defaultStyle', () => {
      const content = [{ text: 'foo' }, { text: 'bar' }];
      const defaultStyle = { fontSize: 14 };

      const result = parseContent(content, defaultStyle);

      expect(result).toEqual([
        { text: [{ text: 'foo', attrs: { fontSize: 14 } }] },
        { text: [{ text: 'bar', attrs: { fontSize: 14 } }] },
      ]);
    });

    it('checks content', () => {
      const content = [{ text: 'foo' }, { text: 23 }];

      expect(() => parseContent(content, {})).toThrowError('Invalid value for "content block #2":');
    });
  });

  describe('parseColumns', () => {
    it('merges text attributes with default style', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = parseColumns(content, defaultStyle);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, italic: true } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, italic: true } }] },
        ],
      });
    });

    it('passes textAlign attribute to included paragraphs', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = parseColumns(content);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('parseRows', () => {
    it('merges text attributes with default style', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = parseRows(content, defaultStyle);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, italic: true } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, italic: true } }] },
        ],
      });
    });

    it('passes textAlign attribute to included paragraphs', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = parseRows(content);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('parseParagraph', () => {
    it('accepts empty object', () => {
      expect(parseParagraph({})).toEqual({});
    });

    it('includes all properties of a paragraph', () => {
      const input = {
        text: 'foo',
        graphics: [{ type: 'rect', x: 1, y: 2, width: 3, height: 4 }],
        margin: 5,
        padding: 6,
        width: '50pt',
        height: '80pt',
      };

      const result = parseParagraph(input);

      expect(result).toEqual({
        text: [{ text: 'foo', attrs: {} }],
        graphics: [{ type: 'rect', x: 1, y: 2, width: 3, height: 4 }],
        margin: { left: 5, right: 5, top: 5, bottom: 5 },
        padding: { left: 6, right: 6, top: 6, bottom: 6 },
        width: 50,
        height: 80,
      });
    });

    it('includes default attrs in text', () => {
      const input = { text: 'foo' };
      const defaultAttrs = { fontSize: 14, lineHeight: 1.5 };

      const result = parseParagraph(input, defaultAttrs);

      expect(result).toEqual({ text: [{ text: 'foo', attrs: { fontSize: 14, lineHeight: 1.5 } }] });
    });

    it('checks text', () => {
      const input = { text: 23 };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "text":');
    });

    it('checks graphics', () => {
      const input = { graphics: 'foo' };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "graphics":');
    });

    it('checks margin', () => {
      const input = { margin: 'foo' };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "margin":');
    });

    it('checks padding', () => {
      const input = { padding: 'foo' };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "padding":');
    });

    it('checks width', () => {
      const input = { width: 'foo' };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "width":');
    });

    it('checks height', () => {
      const input = { height: 'foo' };

      expect(() => parseParagraph(input)).toThrowError('Invalid value for "height":');
    });
  });

  describe('parseText', () => {
    it('accepts a string', () => {
      const attrs = { italic: true };

      expect(parseText('foo', attrs)).toEqual([{ text: 'foo', attrs }]);
    });

    it('accepts an object', () => {
      const result = parseText({ text: 'foo', bold: true }, { italic: true });

      expect(result).toEqual([{ text: 'foo', attrs: { italic: true, bold: true } }]);
    });

    it('accepts an array', () => {
      const result = parseText([{ text: 'foo', bold: true }], { italic: true });

      expect(result).toEqual([{ text: 'foo', attrs: { italic: true, bold: true } }]);
    });

    it('accepts empty array', () => {
      expect(parseText([], {})).toEqual([]);
    });

    it('flattens nested structures', () => {
      const input = [
        { text: 'foo', bold: true },
        { text: [{ text: 'bar' }] },
        { text: { text: { text: 'baz', fontSize: 23 } } },
      ];

      const result = parseText(input, { italic: true });

      expect(result).toEqual([
        { text: 'foo', attrs: { italic: true, bold: true } },
        { text: 'bar', attrs: { italic: true } },
        { text: 'baz', attrs: { italic: true, fontSize: 23 } },
      ]);
    });

    it('throws on invalid type', () => {
      expect(() => parseText([23 as any], {})).toThrowError(
        'Expected string, object with text attribute, or array of text, got: 23'
      );
    });
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
