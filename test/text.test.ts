import { beforeEach, describe, expect, it } from '@jest/globals';

import { extractTextSegments } from '../src/text.js';
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
      expect(extractTextSegments([], {}, fonts)).toEqual([]);
    });

    it('throws on invalid text content', () => {
      expect(() => extractTextSegments([23 as any], {}, fonts)).toThrowError('Invalid text: 23');
    });

    it('returns segment with default attrs for single string', () => {
      expect(extractTextSegments('foo', {}, fonts)).toEqual([
        {
          text: 'foo',
          width: 54, // 3 * 18
          height: 18,
          fontSize: 18,
          font: normalFont,
        },
      ]);
    });

    it('respects global font attrs', () => {
      const attrs = { fontSize: 10 };

      const segments = extractTextSegments('foo', attrs, fonts);

      expect(segments).toEqual([
        objectContaining({
          width: 30, // 3 * 10
          height: 10,
          fontSize: 10,
        }),
      ]);
    });

    it('respects local font attrs', () => {
      const attrs = { fontSize: 10 };

      const segments = extractTextSegments({ text: 'foo', ...attrs }, {}, fonts);

      expect(segments).toEqual([
        objectContaining({
          fontSize: 10,
        }),
      ]);
    });

    it('returns multiple segments for multiple content parts', () => {
      const attrs = { fontSize: 10 };

      const segments = extractTextSegments(['foo', 'bar'], attrs, fonts);

      expect(segments).toEqual([
        objectContaining({ text: 'foo' }),
        objectContaining({ text: 'bar' }),
      ]);
    });
  });
});
