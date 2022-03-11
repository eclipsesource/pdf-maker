import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { embedFonts, selectFont } from '../src/fonts.js';
import { fakeFont } from './test-utils.js';

describe('fonts', () => {
  describe('embedFont', () => {
    it('returns an empty array for missing fonts definition', async () => {
      const fonts = await embedFonts(undefined, {} as any);

      expect(fonts).toEqual([]);
    });

    it('returns an empty array for empty fonts definition', async () => {
      const fonts = await embedFonts({}, {} as any);

      expect(fonts).toEqual([]);
    });

    it('embeds fonts in PDF document and returns fonts array', async () => {
      const doc = { embedFont: jest.fn().mockImplementation((font) => `PDF_${font}`) } as any;
      const fontsDef = {
        Test: [
          { data: 'Test_Sans_Normal' },
          { data: 'Test_Sans_Italic', italic: true },
          { data: 'Test_Sans_Bold', bold: true },
          { data: 'Test_Sans_BoldItalic', italic: true, bold: true },
        ],
        Other: [{ data: 'Other_Normal' }],
      };

      const fonts = await embedFonts(fontsDef, doc);

      expect(fonts).toEqual([
        { name: 'Test', italic: false, bold: false, pdfFont: 'PDF_Test_Sans_Normal' },
        { name: 'Test', italic: true, bold: false, pdfFont: 'PDF_Test_Sans_Italic' },
        { name: 'Test', italic: false, bold: true, pdfFont: 'PDF_Test_Sans_Bold' },
        { name: 'Test', italic: true, bold: true, pdfFont: 'PDF_Test_Sans_BoldItalic' },
        { name: 'Other', italic: false, bold: false, pdfFont: 'PDF_Other_Normal' },
      ]);
    });
  });

  describe('selectFont', () => {
    let fonts, normalFont, italicFont, boldFont, italicBoldFont, otherFont;

    beforeEach(() => {
      fonts = [
        fakeFont('Test'),
        fakeFont('Test', { italic: true }),
        fakeFont('Test', { bold: true }),
        fakeFont('Test', { italic: true, bold: true }),
        fakeFont('Other'),
      ];
      [normalFont, italicFont, boldFont, italicBoldFont, otherFont] = fonts.map((f) => f.pdfFont);
    });

    it('selects different font variants', () => {
      const fontFamily = 'Test';

      expect(selectFont(fonts, { fontFamily })).toEqual(normalFont);
      expect(selectFont(fonts, { fontFamily, bold: true })).toEqual(boldFont);
      expect(selectFont(fonts, { fontFamily, italic: true })).toEqual(italicFont);
      expect(selectFont(fonts, { fontFamily, italic: true, bold: true })).toEqual(italicBoldFont);
    });

    it('selects first matching font if no family specified', () => {
      expect(selectFont(fonts, {})).toEqual(normalFont);
      expect(selectFont(fonts, { bold: true })).toEqual(boldFont);
      expect(selectFont(fonts, { italic: true })).toEqual(italicFont);
      expect(selectFont(fonts, { italic: true, bold: true })).toEqual(italicBoldFont);
    });

    it('selects font with matching font family', () => {
      expect(selectFont(fonts, { fontFamily: 'Other' })).toEqual(otherFont);
    });

    it('throws when no matching font can be found', () => {
      const fontFamily = 'Other';

      expect(() => selectFont(fonts, { fontFamily, italic: true })).toThrowError(
        'No font found for "Other italic"'
      );
      expect(() => selectFont(fonts, { fontFamily, bold: true })).toThrowError(
        'No font found for "Other bold"'
      );
      expect(() => selectFont(fonts, { fontFamily, italic: true, bold: true })).toThrowError(
        'No font found for "Other bold italic"'
      );
    });

    it('throws when font family can be found', () => {
      const fontFamily = 'Foo';

      expect(() => selectFont(fonts, { fontFamily })).toThrowError(
        'No font found for "Foo normal"'
      );
    });
  });
});
