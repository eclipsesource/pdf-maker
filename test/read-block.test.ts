import { describe, expect, it } from '@jest/globals';

import { readColumns, readParagraph, readRows, readText } from '../src/read-block.js';

describe('read-block', () => {
  describe('readColumns', () => {
    it('merges text attributes with default style', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = readColumns(content, defaultStyle);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, italic: true } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, italic: true } }] },
        ],
      });
    });

    it('passes textAlign attribute to included paragraphs', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = readColumns(content);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('readRows', () => {
    it('merges text attributes with default style', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = readRows(content, defaultStyle);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, italic: true } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, italic: true } }] },
        ],
      });
    });

    it('passes textAlign attribute to included paragraphs', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = readRows(content);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('readParagraph', () => {
    it('accepts empty object', () => {
      expect(readParagraph({})).toEqual({});
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

      const result = readParagraph(input);

      expect(result).toEqual({
        text: [{ text: 'foo', attrs: {} }],
        graphics: expect.any(Function),
        margin: { left: 5, right: 5, top: 5, bottom: 5 },
        padding: { left: 6, right: 6, top: 6, bottom: 6 },
        width: 50,
        height: 80,
      });
    });

    it('includes default attrs in text', () => {
      const input = { text: 'foo' };
      const defaultAttrs = { fontSize: 14, lineHeight: 1.5 };

      const result = readParagraph(input, defaultAttrs);

      expect(result).toEqual({ text: [{ text: 'foo', attrs: { fontSize: 14, lineHeight: 1.5 } }] });
    });

    it('checks text', () => {
      const input = { text: 23 };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "text":');
    });

    it('checks graphics', () => {
      const input = { graphics: 'foo' };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "graphics":');
    });

    it('checks margin', () => {
      const input = { margin: 'foo' };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "margin":');
    });

    it('checks padding', () => {
      const input = { padding: 'foo' };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "padding":');
    });

    it('checks width', () => {
      const input = { width: 'foo' };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "width":');
    });

    it('checks height', () => {
      const input = { height: 'foo' };

      expect(() => readParagraph(input)).toThrowError('Invalid value for "height":');
    });
  });

  describe('readText', () => {
    it('accepts a string', () => {
      const attrs = { italic: true };

      expect(readText('foo', attrs)).toEqual([{ text: 'foo', attrs }]);
    });

    it('accepts an object', () => {
      const result = readText({ text: 'foo', bold: true }, { italic: true });

      expect(result).toEqual([{ text: 'foo', attrs: { italic: true, bold: true } }]);
    });

    it('accepts an array', () => {
      const result = readText([{ text: 'foo', bold: true }], { italic: true });

      expect(result).toEqual([{ text: 'foo', attrs: { italic: true, bold: true } }]);
    });

    it('accepts empty array', () => {
      expect(readText([], {})).toEqual([]);
    });

    it('flattens nested structures', () => {
      const input = [
        { text: 'foo', bold: true },
        { text: [{ text: 'bar' }] },
        { text: { text: { text: 'baz', fontSize: 23 } } },
      ];

      const result = readText(input, { italic: true });

      expect(result).toEqual([
        { text: 'foo', attrs: { italic: true, bold: true } },
        { text: 'bar', attrs: { italic: true } },
        { text: 'baz', attrs: { italic: true, fontSize: 23 } },
      ]);
    });

    it('throws on invalid type', () => {
      expect(() => readText([23 as any], {})).toThrowError(
        'Expected string, object with text attribute, or array of text, got: 23'
      );
    });
  });
});
