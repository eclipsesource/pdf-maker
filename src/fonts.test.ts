import { afterEach } from 'node:test';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fontkit from '@pdf-lib/fontkit';

import { FontLoader } from './font-loader.js';
import { createFontStore, Font, FontSelector, readFonts } from './fonts.js';
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
        { name: 'Test', data: mkData('Test_Sans_Normal') },
        { name: 'Test', data: mkData('Test_Sans_Italic'), italic: true },
        { name: 'Test', data: mkData('Test_Sans_Bold'), bold: true },
        { name: 'Test', data: mkData('Test_Sans_BoldItalic'), italic: true, bold: true },
        { name: 'Other', data: mkData('Other_Normal') },
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

    it('removes redundant false values for italic and bold', () => {
      const data = mkData('data');
      const fontsDef = { Test: [{ data, italic: false, bold: false }] };

      const fonts = readFonts(fontsDef);

      expect(fonts).toEqual([{ name: 'Test', data }]);
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
          throw new Error('No font defined');
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
        "Could not load font for 'foo', normal: No font defined"
      );
    });

    it('creates fontkit font object', async () => {
      const store = createFontStore(fontLoader);

      const font = await store.selectFont({ fontFamily: 'Test' });

      expect(font).toEqual({
        name: 'Test',
        data: testFont.data,
        fkFont: { fake: true },
      });
    });
  });
});

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
