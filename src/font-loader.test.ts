import { beforeEach, describe, expect, it } from '@jest/globals';

import { createFontLoader, FontLoader } from './font-loader.js';
import { FontDef } from './fonts.js';
import { mkData } from './test/test-utils.js';

describe('font-loader', () => {
  let normalFont: FontDef;
  let italicFont: FontDef;
  let obliqueFont: FontDef;
  let boldFont: FontDef;
  let italicBoldFont: FontDef;
  let obliqueBoldFont: FontDef;
  let otherFont: FontDef;
  let fontLoader: FontLoader;

  describe('createFontLoader', () => {
    beforeEach(() => {
      normalFont = fakeFontDef('Test');
      italicFont = fakeFontDef('Test', { style: 'italic' });
      obliqueFont = fakeFontDef('Test', { style: 'oblique' });
      boldFont = fakeFontDef('Test', { weight: 700 });
      italicBoldFont = fakeFontDef('Test', { style: 'italic', weight: 700 });
      obliqueBoldFont = fakeFontDef('Test', { style: 'oblique', weight: 700 });
      otherFont = fakeFontDef('Other');
      fontLoader = createFontLoader([normalFont, italicFont, boldFont, italicBoldFont, otherFont]);
    });

    it('rejects when no fonts defined', async () => {
      const loader = createFontLoader([]);

      await expect(loader.loadFont({})).rejects.toThrowError('No fonts defined');
    });

    it('rejects for unknown font name', async () => {
      await expect(fontLoader.loadFont({ fontFamily: 'Unknown' })).rejects.toThrowError(
        "No font defined for 'Unknown'"
      );
    });

    it('rejects when no matching font style can be found', async () => {
      await expect(() =>
        fontLoader.loadFont({ fontFamily: 'Other', fontStyle: 'italic' })
      ).rejects.toThrowError("No font defined for 'Other', style=italic");
    });

    it('selects different font variants', async () => {
      const fontFamily = 'Test';

      expect(await fontLoader.loadFont({ fontFamily })).toEqual({
        name: 'Test',
        data: normalFont.data,
      });
      expect(await fontLoader.loadFont({ fontFamily, fontWeight: 'bold' })).toEqual({
        name: 'Test',
        data: boldFont.data,
      });
      expect(await fontLoader.loadFont({ fontFamily, fontStyle: 'italic' })).toEqual({
        name: 'Test',
        data: italicFont.data,
      });
      expect(
        await fontLoader.loadFont({ fontFamily, fontStyle: 'italic', fontWeight: 'bold' })
      ).toEqual({
        name: 'Test',
        data: italicBoldFont.data,
      });
    });

    it('selects first matching font if no family specified', async () => {
      await expect(fontLoader.loadFont({})).resolves.toEqual({
        name: 'Test',
        data: normalFont.data,
      });
      await expect(fontLoader.loadFont({ fontWeight: 'bold' })).resolves.toEqual({
        name: 'Test',
        data: boldFont.data,
      });
      await expect(fontLoader.loadFont({ fontStyle: 'italic' })).resolves.toEqual({
        name: 'Test',
        data: italicFont.data,
      });
      await expect(
        fontLoader.loadFont({ fontStyle: 'italic', fontWeight: 'bold' })
      ).resolves.toEqual({
        name: 'Test',
        data: italicBoldFont.data,
      });
    });

    it('selects font with matching font family', async () => {
      await expect(fontLoader.loadFont({ fontFamily: 'Other' })).resolves.toEqual({
        name: 'Other',
        data: otherFont.data,
      });
    });

    it('falls back to oblique when no italic font can be found', async () => {
      fontLoader = createFontLoader([normalFont, obliqueFont, boldFont, obliqueBoldFont]);
      await expect(
        fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'italic' })
      ).resolves.toEqual({
        name: 'Test',
        data: obliqueFont.data,
      });
    });

    it('falls back to italic when no oblique font can be found', async () => {
      await expect(
        fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'oblique' })
      ).resolves.toEqual({
        name: 'Test',
        data: italicFont.data,
      });
    });

    it('falls back when no matching font weight can be found', async () => {
      await expect(
        fontLoader.loadFont({ fontFamily: 'Other', fontWeight: 'bold' })
      ).resolves.toEqual({
        name: 'Other',
        data: otherFont.data,
      });
      await expect(fontLoader.loadFont({ fontFamily: 'Other', fontWeight: 200 })).resolves.toEqual({
        name: 'Other',
        data: otherFont.data,
      });
    });
  });
});

function fakeFontDef(family: string, options?: Partial<FontDef>): FontDef {
  const style = options?.style ?? 'normal';
  const weight = options?.weight ?? 400;
  const data = options?.data ?? mkData([family, style, weight].join('_') as string);
  return { family, style, weight, data };
}
