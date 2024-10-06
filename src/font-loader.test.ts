import fontkit from '@pdf-lib/fontkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FontLoader, FontStore } from './font-loader.ts';
import type { Font, FontDef, FontSelector } from './fonts.ts';
import { catchErrorAsync, fakeFont, mkData } from './test/test-utils.ts';

describe('font-loader', () => {
  let normalFont: FontDef;
  let italicFont: FontDef;
  let obliqueFont: FontDef;
  let boldFont: FontDef;
  let italicBoldFont: FontDef;
  let obliqueBoldFont: FontDef;
  let otherFont: FontDef;
  let fontLoader: FontLoader;

  describe('new FontLoader', () => {
    beforeEach(() => {
      normalFont = fakeFontDef('Test');
      italicFont = fakeFontDef('Test', { style: 'italic' });
      obliqueFont = fakeFontDef('Test', { style: 'oblique' });
      boldFont = fakeFontDef('Test', { weight: 700 });
      italicBoldFont = fakeFontDef('Test', { style: 'italic', weight: 700 });
      obliqueBoldFont = fakeFontDef('Test', { style: 'oblique', weight: 700 });
      otherFont = fakeFontDef('Other');
      fontLoader = new FontLoader([normalFont, italicFont, boldFont, italicBoldFont, otherFont]);
    });

    it('rejects when no fonts defined', () => {
      const loader = new FontLoader([]);

      expect(() => loader.loadFont({})).toThrowError('No fonts defined');
    });

    it('rejects for unknown font name', () => {
      expect(() => fontLoader.loadFont({ fontFamily: 'Unknown' })).toThrowError(
        "No font defined for 'Unknown'",
      );
    });

    it('rejects when no matching font style can be found', () => {
      expect(() => fontLoader.loadFont({ fontFamily: 'Other', fontStyle: 'italic' })).toThrowError(
        "No font defined for 'Other', style=italic",
      );
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

    it('selects first matching font if no family specified', () => {
      expect(fontLoader.loadFont({})).toEqual({
        name: 'Test',
        data: normalFont.data,
      });
      expect(fontLoader.loadFont({ fontWeight: 'bold' })).toEqual({
        name: 'Test',
        data: boldFont.data,
      });
      expect(fontLoader.loadFont({ fontStyle: 'italic' })).toEqual({
        name: 'Test',
        data: italicFont.data,
      });
      expect(fontLoader.loadFont({ fontStyle: 'italic', fontWeight: 'bold' })).toEqual({
        name: 'Test',
        data: italicBoldFont.data,
      });
    });

    it('selects font with matching font family', () => {
      expect(fontLoader.loadFont({ fontFamily: 'Other' })).toEqual({
        name: 'Other',
        data: otherFont.data,
      });
    });

    it('falls back to oblique when no italic font can be found', () => {
      fontLoader = new FontLoader([normalFont, obliqueFont, boldFont, obliqueBoldFont]);
      expect(fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'italic' })).toEqual({
        name: 'Test',
        data: obliqueFont.data,
      });
    });

    it('falls back to italic when no oblique font can be found', () => {
      expect(fontLoader.loadFont({ fontFamily: 'Test', fontStyle: 'oblique' })).toEqual({
        name: 'Test',
        data: italicFont.data,
      });
    });

    it('falls back when no matching font weight can be found', () => {
      expect(fontLoader.loadFont({ fontFamily: 'Other', fontWeight: 'bold' })).toEqual({
        name: 'Other',
        data: otherFont.data,
      });
      expect(fontLoader.loadFont({ fontFamily: 'Other', fontWeight: 200 })).toEqual({
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
      fontLoader = new FontLoader([]);
      fontLoader.loadFont = vi.fn((selector: FontSelector) => {
        if (selector.fontFamily === 'Test') return testFont;
        throw new Error('No such font defined');
      });
      vi.spyOn(fontkit, 'create').mockReturnValue({ fake: true } as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects if font could not be loaded', async () => {
      const store = new FontStore(fontLoader);

      const error = await catchErrorAsync(() => store.selectFont({ fontFamily: 'foo' }));

      expect(error.message).toBe("Could not load font for 'foo', style=normal, weight=normal");
      expect(error.cause).toEqual(new Error('No such font defined'));
    });

    it('creates fontkit font object', async () => {
      const store = new FontStore(fontLoader);

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
      const store = new FontStore(fontLoader);

      await store.selectFont({ fontFamily: 'Test' });
      await store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' });
      await store.selectFont({ fontFamily: 'Test' });
      await store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' });

      expect(fontLoader.loadFont).toHaveBeenCalledTimes(2);
    });

    it('returns same font object for concurrent calls', async () => {
      const store = new FontStore(fontLoader);

      const [font1, font2] = await Promise.all([
        store.selectFont({ fontFamily: 'Test' }),
        store.selectFont({ fontFamily: 'Test' }),
      ]);

      expect(font1).toBe(font2);
    });

    it('caches errors from font loader', async () => {
      const store = new FontStore(fontLoader);

      const error = await catchErrorAsync(() => store.selectFont({ fontFamily: 'foo' }));

      expect(error.message).toBe("Could not load font for 'foo', style=normal, weight=normal");
      expect(error.cause).toEqual(new Error('No such font defined'));
    });
  });
});

function fakeFontDef(family: string, options?: Partial<FontDef>): FontDef {
  const style = options?.style ?? 'normal';
  const weight = options?.weight ?? 400;
  const data = options?.data ?? mkData([family, style, weight].join('_') as string);
  return { family, style, weight, data };
}
