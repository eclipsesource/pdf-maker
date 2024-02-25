import { describe, expect, it } from 'vitest';

import {
  readBlock,
  readColumnsBlock,
  readRowsBlock,
  readText,
  readTextBlock,
} from './read-block.ts';

describe('read-block', () => {
  describe('readBlock', () => {
    it('accepts empty object', () => {
      expect(readBlock({})).toEqual({});
    });

    it('includes all block properties', () => {
      const input = {
        padding: 6,
        margin: 5,
        width: '50pt',
        height: '80pt',
        verticalAlign: 'middle',
        graphics: [{ type: 'rect', x: 1, y: 2, width: 3, height: 4 }],
      };

      const result = readBlock(input);

      expect(result).toEqual({
        padding: { left: 6, right: 6, top: 6, bottom: 6 },
        margin: { left: 5, right: 5, top: 5, bottom: 5 },
        width: 50,
        height: 80,
        verticalAlign: 'middle',
        graphics: expect.any(Function),
      });
    });
  });

  describe('readColumnsBlock', () => {
    it('merges text properties with default style', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = readColumnsBlock(content, defaultStyle);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, fontStyle: 'italic' } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, fontStyle: 'italic' } }] },
        ],
      });
    });

    it('passes textAlign property to included blocks', () => {
      const content = { columns: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = readColumnsBlock(content);

      expect(result).toEqual({
        columns: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('readRowsBlock', () => {
    it('merges text properties with default style', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], fontSize: 8 };
      const defaultStyle = { fontSize: 10, italic: true };

      const result = readRowsBlock(content, defaultStyle);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: { fontSize: 8, fontStyle: 'italic' } }] },
          { text: [{ text: 'bar', attrs: { fontSize: 8, fontStyle: 'italic' } }] },
        ],
      });
    });

    it('passes textAlign property to included blocks', () => {
      const content = { rows: [{ text: 'foo' }, { text: 'bar' }], textAlign: 'right' };

      const result = readRowsBlock(content);

      expect(result).toEqual({
        rows: [
          { text: [{ text: 'foo', attrs: {} }], textAlign: 'right' },
          { text: [{ text: 'bar', attrs: {} }], textAlign: 'right' },
        ],
      });
    });
  });

  describe('readTextBlock', () => {
    it('includes all block properties', () => {
      const input = {
        text: 'foo',
        graphics: [{ type: 'rect', x: 1, y: 2, width: 3, height: 4 }],
        margin: 5,
        padding: 6,
        width: '50pt',
        height: '80pt',
        verticalAlign: 'middle',
      };

      const result = readTextBlock(input);

      expect(result).toEqual({
        text: [{ text: 'foo', attrs: {} }],
        graphics: expect.any(Function),
        margin: { left: 5, right: 5, top: 5, bottom: 5 },
        padding: { left: 6, right: 6, top: 6, bottom: 6 },
        width: 50,
        height: 80,
        verticalAlign: 'middle',
      });
    });

    it('includes text properties', () => {
      const input = {
        text: ['foo', 'bar'],
        rise: 3,
        letterSpacing: 5,
      };

      const result = readTextBlock(input);

      expect(result.text).toEqual([
        { text: 'foo', attrs: { rise: 3, letterSpacing: 5 } },
        { text: 'bar', attrs: { rise: 3, letterSpacing: 5 } },
      ]);
    });

    it('includes default attrs in text', () => {
      const input = { text: 'foo' };
      const defaultAttrs = { fontSize: 14, lineHeight: 1.5 };

      const result = readTextBlock(input, defaultAttrs);

      expect(result).toEqual({ text: [{ text: 'foo', attrs: { fontSize: 14, lineHeight: 1.5 } }] });
    });

    it('checks text', () => {
      const input = { text: 23 };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "text":');
    });

    it('checks graphics', () => {
      const input = { text: [], graphics: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "graphics":');
    });

    it('checks margin', () => {
      const input = { text: [], margin: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "margin":');
    });

    it('checks padding', () => {
      const input = { text: [], padding: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "padding":');
    });

    it('checks width', () => {
      const input = { text: [], width: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "width":');
    });

    it('checks height', () => {
      const input = { text: [], height: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "height":');
    });

    it('checks verticalAlign', () => {
      const input = { text: [], verticalAlign: 'foo' };

      expect(() => readTextBlock(input)).toThrowError('Invalid value for "verticalAlign":');
    });
  });

  describe('readText', () => {
    it('accepts a string', () => {
      const attrs = { fontStyle: 'italic' } as const;

      expect(readText('foo', attrs)).toEqual([{ text: 'foo', attrs }]);
    });

    it('accepts an object', () => {
      const result = readText({ text: 'foo', bold: true }, { fontStyle: 'italic' });

      expect(result).toEqual([{ text: 'foo', attrs: { fontStyle: 'italic', fontWeight: 700 } }]);
    });

    it('accepts fontWeight and fontStyle', () => {
      const result = readText({ text: 'foo', fontStyle: 'oblique', fontWeight: 900 }, {});

      expect(result).toEqual([{ text: 'foo', attrs: { fontStyle: 'oblique', fontWeight: 900 } }]);
    });

    it('overrides italic with fontStyle', () => {
      const result = readText({ text: 'foo', italic: true, fontStyle: 'oblique' }, {});

      expect(result).toEqual([{ text: 'foo', attrs: { fontStyle: 'oblique' } }]);
    });

    it('overrides bold with fontWeight', () => {
      const result = readText({ text: 'foo', bold: true, fontWeight: 500 }, {});

      expect(result).toEqual([{ text: 'foo', attrs: { fontWeight: 500 } }]);
    });

    it('accepts an array', () => {
      const result = readText([{ text: 'foo', bold: true }], { fontStyle: 'italic' });

      expect(result).toEqual([{ text: 'foo', attrs: { fontStyle: 'italic', fontWeight: 700 } }]);
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

      const result = readText(input, { fontStyle: 'italic' });

      expect(result).toEqual([
        { text: 'foo', attrs: { fontStyle: 'italic', fontWeight: 700 } },
        { text: 'bar', attrs: { fontStyle: 'italic' } },
        { text: 'baz', attrs: { fontStyle: 'italic', fontSize: 23 } },
      ]);
    });

    it('throws on invalid type', () => {
      expect(() => readText([23 as any], {})).toThrowError(
        'Expected string, object with text property, or array of text, got: 23',
      );
    });
  });
});
