import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FontStore } from './font-store.ts';
import type { FontDef } from './fonts.ts';
import { mkData } from './test/test-utils.ts';

describe('FontStore', () => {
  let normalFont: FontDef;
  let italicFont: FontDef;
  let obliqueFont: FontDef;
  let boldFont: FontDef;
  let italicBoldFont: FontDef;
  let obliqueBoldFont: FontDef;
  let otherFont: FontDef;

  beforeEach(() => {
    normalFont = fakeFontDef('Test');
    italicFont = fakeFontDef('Test', { style: 'italic' });
    obliqueFont = fakeFontDef('Test', { style: 'oblique' });
    boldFont = fakeFontDef('Test', { weight: 700 });
    italicBoldFont = fakeFontDef('Test', { style: 'italic', weight: 700 });
    obliqueBoldFont = fakeFontDef('Test', { style: 'oblique', weight: 700 });
    otherFont = fakeFontDef('Other');
  });

  describe('selectFont', () => {
    let store: FontStore;

    beforeEach(() => {
      store = new FontStore([
        normalFont,
        italicFont,
        obliqueFont,
        boldFont,
        italicBoldFont,
        obliqueBoldFont,
        otherFont,
      ]);
      vi.spyOn(fontkit, 'create').mockReturnValue({ fake: true } as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    beforeEach(() => {
      vi.spyOn(fontkit, 'create').mockReturnValue({ fake: true } as any);
      normalFont = fakeFontDef('Test');
      italicFont = fakeFontDef('Test', { style: 'italic' });
      obliqueFont = fakeFontDef('Test', { style: 'oblique' });
      boldFont = fakeFontDef('Test', { weight: 700 });
      italicBoldFont = fakeFontDef('Test', { style: 'italic', weight: 700 });
      obliqueBoldFont = fakeFontDef('Test', { style: 'oblique', weight: 700 });
      otherFont = fakeFontDef('Other');

      store = new FontStore([
        normalFont,
        italicFont,
        obliqueFont,
        boldFont,
        italicBoldFont,
        obliqueBoldFont,
        otherFont,
      ]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects when no fonts defined', async () => {
      const store = new FontStore();

      await expect(store.selectFont({ fontFamily: 'Foo' })).rejects.toThrow(
        new Error("Could not load font for 'Foo', style=normal, weight=normal", {
          cause: new Error('No fonts defined'),
        }),
      );
    });

    it('rejects for unknown font name', async () => {
      await expect(store.selectFont({ fontFamily: 'Unknown' })).rejects.toThrow(
        new Error("Could not load font for 'Unknown', style=normal, weight=normal", {
          cause: new Error(
            "No matching font found for family 'Unknown'. Registered families are: 'Test', 'Other'.",
          ),
        }),
      );
    });

    it('rejects when no matching font style can be found', async () => {
      store = new FontStore([normalFont, boldFont]);

      await expect(store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' })).rejects.toThrow(
        new Error("Could not load font for 'Test', style=italic, weight=normal", {
          cause: new Error("No matching font found for 'Test', style=italic"),
        }),
      );
    });

    it('selects different font variants', async () => {
      const fontFamily = 'Test';

      await expect(store.selectFont({ fontFamily })).resolves.toEqual(
        expect.objectContaining({ data: normalFont.data }),
      );
      await expect(store.selectFont({ fontFamily, fontWeight: 'bold' })).resolves.toEqual(
        expect.objectContaining({ data: boldFont.data }),
      );
      await expect(store.selectFont({ fontFamily, fontStyle: 'italic' })).resolves.toEqual(
        expect.objectContaining({ data: italicFont.data }),
      );
      await expect(
        store.selectFont({ fontFamily, fontStyle: 'italic', fontWeight: 'bold' }),
      ).resolves.toEqual(expect.objectContaining({ data: italicBoldFont.data }));
    });

    it('selects first matching font if no family specified', async () => {
      await expect(store.selectFont({})).resolves.toEqual(
        expect.objectContaining({ data: normalFont.data }),
      );
      await expect(store.selectFont({ fontWeight: 'bold' })).resolves.toEqual(
        expect.objectContaining({ data: boldFont.data }),
      );
      await expect(store.selectFont({ fontStyle: 'italic' })).resolves.toEqual(
        expect.objectContaining({ data: italicFont.data }),
      );
      await expect(store.selectFont({ fontStyle: 'italic', fontWeight: 'bold' })).resolves.toEqual(
        expect.objectContaining({ data: italicBoldFont.data }),
      );
    });

    it('selects font with matching font family', async () => {
      await expect(store.selectFont({ fontFamily: 'Other' })).resolves.toEqual(
        expect.objectContaining({ data: otherFont.data }),
      );
    });

    it('falls back to oblique when no italic font can be found', async () => {
      store = new FontStore([normalFont, obliqueFont, boldFont, obliqueBoldFont]);

      await expect(store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' })).resolves.toEqual(
        expect.objectContaining({ data: obliqueFont.data }),
      );
    });

    it('falls back to italic when no oblique font can be found', async () => {
      store = new FontStore([normalFont, italicFont, boldFont, italicBoldFont]);

      await expect(store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' })).resolves.toEqual(
        expect.objectContaining({ data: italicFont.data }),
      );
    });

    it('falls back when no matching font weight can be found', async () => {
      await expect(store.selectFont({ fontFamily: 'Other', fontWeight: 'bold' })).resolves.toEqual(
        expect.objectContaining({ data: otherFont.data }),
      );
      await expect(store.selectFont({ fontFamily: 'Other', fontWeight: 200 })).resolves.toEqual(
        expect.objectContaining({ data: otherFont.data }),
      );
    });

    it('rejects if font could not be loaded', async () => {
      await expect(store.selectFont({ fontFamily: 'foo' })).rejects.toThrow(
        new Error("Could not load font for 'foo', style=normal, weight=normal", {
          cause: new Error(
            "No matching font found for family 'foo'. Registered families are: 'Test', 'Other'.",
          ),
        }),
      );
    });

    it('creates fontkit font object', async () => {
      const font = await store.selectFont({ fontFamily: 'Test' });

      expect(font).toEqual({
        key: 'Test:normal:normal',
        name: 'Test',
        style: 'normal',
        weight: 400,
        data: normalFont.data,
        fkFont: { fake: true },
      });
    });

    it('returns same font object for concurrent calls', async () => {
      const [font1, font2] = await Promise.all([
        store.selectFont({ fontFamily: 'Test' }),
        store.selectFont({ fontFamily: 'Test' }),
      ]);

      expect(font1).toBe(font2);
    });
  });

  describe('registerFont', () => {
    let store: FontStore;
    let robotoRegular: Uint8Array;
    let robotoLightItalic: Uint8Array;

    beforeAll(async () => {
      robotoRegular = await readFile(
        join(__dirname, 'test/resources/fonts/roboto/Roboto-Regular.ttf'),
      );
      robotoLightItalic = await readFile(
        join(__dirname, 'test/resources/fonts/roboto/Roboto-LightItalic.ttf'),
      );
    });

    it('registers font with extracted config', async () => {
      store = new FontStore();

      store.registerFont(robotoRegular);
      store.registerFont(robotoLightItalic);

      const selected1 = await store.selectFont({ fontFamily: 'Roboto' });
      const selected2 = await store.selectFont({ fontFamily: 'Roboto Light', fontStyle: 'italic' });
      expect(selected1.data).toBe(robotoRegular);
      expect(selected2.data).toBe(robotoLightItalic);
    });

    it('registers font with custom config', async () => {
      store = new FontStore();

      store.registerFont(robotoRegular, { family: 'Custom Name', weight: 'bold' });
      store.registerFont(robotoLightItalic, {
        family: 'Custom Name',
        weight: 400,
        style: 'normal',
      });

      const selected1 = await store.selectFont({ fontFamily: 'Custom Name' });
      const selected2 = await store.selectFont({ fontFamily: 'Custom Name', fontWeight: 'bold' });

      expect(selected1.data).toBe(robotoLightItalic);
      expect(selected2.data).toBe(robotoRegular);
    });
  });
});

function fakeFontDef(family: string, options?: Partial<FontDef>): FontDef {
  const style = options?.style ?? 'normal';
  const weight = options?.weight ?? 400;
  const data = options?.data ?? mkData([family, style, weight].join('_') as string);
  return { family, style, weight, data };
}
