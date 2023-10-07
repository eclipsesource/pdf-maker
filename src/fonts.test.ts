import { beforeEach, describe, expect, it } from '@jest/globals';

import { createFontStore, Font, FontStore, loadFonts, readFonts } from './fonts.js';
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

  describe('loadFont', () => {
    it('returns an empty array for empty fonts definition', async () => {
      const fonts = loadFonts([]);

      expect(fonts).toEqual([]);
    });
  });

  describe('selectFont', () => {
    let normalFont: Font;
    let italicFont: Font;
    let boldFont: Font;
    let italicBoldFont: Font;
    let otherFont: Font;
    let fontStore: FontStore;

    beforeEach(() => {
      normalFont = fakeFont('Test');
      italicFont = fakeFont('Test', { italic: true });
      boldFont = fakeFont('Test', { bold: true });
      italicBoldFont = fakeFont('Test', { italic: true, bold: true });
      otherFont = fakeFont('Other');
      fontStore = createFontStore([normalFont, italicFont, boldFont, italicBoldFont, otherFont]);
    });

    it('selects different font variants', () => {
      const fontFamily = 'Test';

      expect(fontStore.selectFont({ fontFamily })).toEqual(normalFont);
      expect(fontStore.selectFont({ fontFamily, bold: true })).toEqual(boldFont);
      expect(fontStore.selectFont({ fontFamily, italic: true })).toEqual(italicFont);
      expect(fontStore.selectFont({ fontFamily, italic: true, bold: true })).toEqual(
        italicBoldFont
      );
    });

    it('selects first matching font if no family specified', () => {
      expect(fontStore.selectFont({})).toEqual(normalFont);
      expect(fontStore.selectFont({ bold: true })).toEqual(boldFont);
      expect(fontStore.selectFont({ italic: true })).toEqual(italicFont);
      expect(fontStore.selectFont({ italic: true, bold: true })).toEqual(italicBoldFont);
    });

    it('selects font with matching font family', () => {
      expect(fontStore.selectFont({ fontFamily: 'Other' })).toEqual(otherFont);
    });

    it('throws when no matching font can be found', () => {
      const fontFamily = 'Other';

      expect(() => fontStore.selectFont({ fontFamily, italic: true })).toThrowError(
        'No font found for "Other italic"'
      );
      expect(() => fontStore.selectFont({ fontFamily, bold: true })).toThrowError(
        'No font found for "Other bold"'
      );
      expect(() => fontStore.selectFont({ fontFamily, italic: true, bold: true })).toThrowError(
        'No font found for "Other bold italic"'
      );
    });

    it('throws when font family can be found', () => {
      const fontFamily = 'Foo';

      expect(() => fontStore.selectFont({ fontFamily })).toThrowError(
        'No font found for "Foo normal"'
      );
    });
  });
});

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
