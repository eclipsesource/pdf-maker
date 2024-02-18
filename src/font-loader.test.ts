import fontkit from '@pdf-lib/fontkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFontLoader, createFontStore, FontLoader } from './font-loader.ts';
import { Font, FontDef, FontSelector } from './fonts.ts';
import { fakeFont, mkData } from './test/test-utils.ts';

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
        "No font defined for 'Unknown'",
      );
    });

    it('rejects when no matching font style can be found', async () => {
      await expect(() =>
        fontLoader.loadFont({ fontFamily: 'Other', fontStyle: 'italic' }),
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
        await fontLoader.loadFont({ fontFamily, fontStyle: 'italic', fontWeight: 'bold' }),
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
        fontLoader.loadFont({ fontStyle: 'italic', fontWeight: 'bold' }),
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
        fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'italic' }),
      ).resolves.toEqual({
        name: 'Test',
        data: obliqueFont.data,
      });
    });

    it('falls back to italic when no oblique font can be found', async () => {
      await expect(
        fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'oblique' }),
      ).resolves.toEqual({
        name: 'Test',
        data: italicFont.data,
      });
    });

    it('falls back when no matching font weight can be found', async () => {
      await expect(
        fontLoader.loadFont({ fontFamily: 'Other', fontWeight: 'bold' }),
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

  describe('FontStore', () => {
    let testFont: Font;
    let fontLoader: FontLoader;

    beforeEach(() => {
      testFont = fakeFont('Test');
      fontLoader = {
        loadFont: vi.fn(async (selector: FontSelector) => {
          if (selector.fontFamily === 'Test') return testFont;
          throw new Error('No such font defined');
        }) as any,
      };
      vi.spyOn(fontkit, 'create').mockReturnValue({ fake: true } as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects if font could not be loaded', async () => {
      const store = createFontStore(fontLoader);

      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrowError(
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined",
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
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined",
      );
      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrowError(
        "Could not load font for 'foo', style=normal, weight=normal: No such font defined",
      );
      expect(fontLoader.loadFont).toHaveBeenCalledTimes(1);
    });
  });
});

function fakeFontDef(family: string, options?: Partial<FontDef>): FontDef {
  const style = options?.style ?? 'normal';
  const weight = options?.weight ?? 400;
  const data = options?.data ?? mkData([family, style, weight].join('_') as string);
  return { family, style, weight, data };
}
