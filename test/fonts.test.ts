import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFDocument, PDFFont } from 'pdf-lib';

import { embedFonts, Font, readFonts, selectFont } from '../src/fonts.js';
import { fakeFont } from './test-utils.js';

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

  describe('embedFont', () => {
    it('returns an empty array for empty fonts definition', async () => {
      const fonts = await embedFonts([], {} as any);

      expect(fonts).toEqual([]);
    });

    it('embeds fonts in PDF document and returns fonts array', async () => {
      const embedFont = jest.fn().mockImplementation((font) => Promise.resolve(`PDF_${font}`));
      const doc = { embedFont } as any;
      const fontsDef = [
        { name: 'Test', data: 'Test_Sans_Normal' },
        { name: 'Test', data: 'Test_Sans_Italic', italic: true },
        { name: 'Test', data: 'Test_Sans_Bold', bold: true },
        { name: 'Test', data: 'Test_Sans_BoldItalic', italic: true, bold: true },
        { name: 'Other', data: 'Other_Normal' },
      ];

      const fonts = await embedFonts(fontsDef, doc);

      expect(fonts).toEqual([
        { name: 'Test', pdfFont: 'PDF_Test_Sans_Normal' },
        { name: 'Test', pdfFont: 'PDF_Test_Sans_Italic', italic: true },
        { name: 'Test', pdfFont: 'PDF_Test_Sans_Bold', bold: true },
        { name: 'Test', pdfFont: 'PDF_Test_Sans_BoldItalic', italic: true, bold: true },
        { name: 'Other', pdfFont: 'PDF_Other_Normal' },
      ]);
    });

    it('throws when embedding fails', async () => {
      const embedFont = (data: any) =>
        data === 'Bad_Data' ? Promise.reject('Bad font') : Promise.resolve(data);
      const doc = { embedFont } as PDFDocument;
      const fontsDef = [
        { name: 'Good', data: 'Good_Data' },
        { name: 'Bad', data: 'Bad_Data' },
      ];

      const promise = embedFonts(fontsDef, doc);

      await expect(promise).rejects.toThrowError('Could not embed font "Bad": Bad font');
    });
  });

  describe('selectFont', () => {
    let fonts: Font[];
    let normalFont: PDFFont;
    let italicFont: PDFFont;
    let boldFont: PDFFont;
    let italicBoldFont: PDFFont;
    let otherFont: PDFFont;

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

function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
