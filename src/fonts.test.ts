import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fontkit from '@pdf-lib/fontkit';

import { FontLoader } from './font-loader.js';
import { createFontStore, Font, FontSelector, readFonts, weightToNumber } from './fonts.js';
import { fakeFont } from './test/test-utils.js';

describe('fonts', () => {
  describe('readFonts', () => {
    it('returns fonts array', () => {
      const fontsDef = {
        Test: [
          { data: mkData('Test_Sans_Normal') },
          { data: mkData('Test_Sans_Italic'), italic: true },
          { data: mkData('Test_Sans_Bold'), bold: true },
          { data: mkData('Test_Sans_BoldItalic'), italic: true, bold: true },
        ],
        Other: [{ data: mkData('Other_Normal') }],
      };

      const fonts = readFonts(fontsDef);

      expect(fonts).toEqual([
        { family: 'Test', style: 'normal', weight: 400, data: mkData('Test_Sans_Normal') },
        { family: 'Test', style: 'italic', weight: 400, data: mkData('Test_Sans_Italic') },
        { family: 'Test', style: 'normal', weight: 700, data: mkData('Test_Sans_Bold') },
        { family: 'Test', style: 'italic', weight: 700, data: mkData('Test_Sans_BoldItalic') },
        { family: 'Other', style: 'normal', weight: 400, data: mkData('Other_Normal') },
      ]);
    });

    it('throws on missing input', () => {
      expect(() => readFonts(undefined)).toThrowError('Expected object, got: undefined');
    });

    it('throws on invalid type', () => {
      expect(() => readFonts(23)).toThrowError('Expected object, got: 23');
    });

    it('throws on invalid italic value', () => {
      const fn = () => readFonts({ Test: [{ data: 'data', italic: 23 }] });

      expect(fn).toThrowError('Invalid value for "Test/0/italic":');
    });

    it('throws on invalid bold value', () => {
      const fn = () => readFonts({ Test: [{ data: 'data', bold: 23 }] });

      expect(fn).toThrowError('Invalid value for "Test/0/bold":');
    });

    it('throws on missing data', () => {
      const fn = () => readFonts({ Test: [{ italic: true }] });

      expect(fn).toThrowError('Missing value for "data"');
    });
  });

  describe('FontStore', () => {
    let testFont: Font;
    let fontLoader: FontLoader;

    beforeEach(() => {
      testFont = fakeFont('Test');
      fontLoader = {
        loadFont: jest.fn(async (selector: FontSelector) => {
          if (selector.fontFamily === 'Test') return testFont;
          throw new Error('No such font defined');
        }) as any,
      };
      jest.spyOn(fontkit, 'create').mockReturnValue({ fake: true } as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('rejects if font could not be loaded', async () => {
      const store = createFontStore(fontLoader);

      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrowError(
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined"
      );
    });

    it('creates fontkit font object', async () => {
      const store = createFontStore(fontLoader);

      const font = await store.selectFont({ fontFamily: 'Test' });

      expect(font).toEqual({
        name: 'Test',
        style: 'normal',
        weight: 400,
        data: testFont.data,
        fkFont: { fake: true },
      });
    });

    it('calls font loader only once per selector', async () => {
      const store = createFontStore(fontLoader);

      await store.selectFont({ fontFamily: 'Test' });
      await store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' });
      await store.selectFont({ fontFamily: 'Test' });
      await store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' });

      expect(fontLoader.loadFont).toHaveBeenCalledTimes(2);
    });

    it('returns same font object for concurrent calls', async () => {
      const store = createFontStore(fontLoader);

      const [font1, font2] = await Promise.all([
        store.selectFont({ fontFamily: 'Test' }),
        store.selectFont({ fontFamily: 'Test' }),
      ]);

      expect(font1).toBe(font2);
    });

    it('caches errors from font loader', async () => {
      const store = createFontStore(fontLoader);

      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrowError(
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined"
      );
      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrowError(
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined"
      );
      expect(fontLoader.loadFont).toHaveBeenCalledTimes(1);
    });
  });

  describe('weightToNumber', () => {
    it('supports keywords `normal` and `bold`', () => {
      expect(weightToNumber('normal')).toBe(400);
      expect(weightToNumber('bold')).toBe(700);
    });

    it('supports numbers', () => {
      expect(weightToNumber(1)).toBe(1);
    });

    it('throws for invalid types', () => {
      expect(() => weightToNumber('foo' as any)).toThrowError("Invalid font weight: 'foo'");
      expect(() => weightToNumber(null as any)).toThrowError('Invalid font weight: null');
    });

    it('throws for invalid numbers', () => {
      expect(() => weightToNumber(NaN)).toThrowError('Invalid font weight: NaN');
      expect(() => weightToNumber(0.1)).toThrowError('Invalid font weight: 0.1');
    });
  });
});

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
