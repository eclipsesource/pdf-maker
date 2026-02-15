import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PDFEmbeddedFont } from '@ralfstx/pdf-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FontStore } from './font-store.ts';
import { mkData } from './test/test-utils.ts';

vi.mock('@ralfstx/pdf-core', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const original = await importOriginal<typeof import('@ralfstx/pdf-core')>();
  return {
    ...original,
    PDFEmbeddedFont: class MockPDFEmbeddedFont extends original.PDFEmbeddedFont {
      constructor(data: Uint8Array) {
        // For fake test data (small buffers), return mock values
        // For real font data (larger buffers), use the real implementation
        if (data.length < 100) {
          // Reverse of mkData (new Uint8Array(value.split('').map((c) => c.charCodeAt(0))))
          const key = String.fromCharCode(...data);

          // Skip the parent constructor for fake data by using a proxy approach
          return {
            fontName: 'MockFont:' + key,
            familyName: 'MockFamily',
            style: 'normal',
            weight: 400,
            ascent: 800,
            descent: -200,
            lineGap: 0,
          } as PDFEmbeddedFont;
        }
        super(data);
      }
    },
  };
});

describe('FontStore', () => {
  describe('registerFont', () => {
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
      const store = new FontStore();
      store.registerFont(robotoRegular);
      store.registerFont(robotoLightItalic);

      const selected1 = await store.selectFont({ fontFamily: 'Roboto' });
      const selected2 = await store.selectFont({ fontFamily: 'Roboto Light', fontStyle: 'italic' });

      expect(selected1.fontName).toBe('Roboto');
      expect(selected2.fontName).toBe('Roboto Light Italic');
    });

    it('registers font with custom config', async () => {
      const store = new FontStore();
      store.registerFont(robotoRegular, { family: 'Custom Name', weight: 'bold' });
      store.registerFont(robotoLightItalic, {
        family: 'Custom Name',
        weight: 400,
        style: 'normal',
      });

      const selected1 = await store.selectFont({ fontFamily: 'Custom Name' });
      const selected2 = await store.selectFont({ fontFamily: 'Custom Name', fontWeight: 'bold' });

      expect(selected1.fontName).toBe('Roboto Light Italic');
      expect(selected2.fontName).toBe('Roboto');
    });
  });

  describe('selectFont', () => {
    let store: FontStore;

    beforeEach(() => {
      store = createTestStore();
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
      const store = new FontStore();
      registerFakeFont(store, 'Test');
      registerFakeFont(store, 'Test', { weight: 700 });

      await expect(store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' })).rejects.toThrow(
        new Error("Could not load font for 'Test', style=italic, weight=normal", {
          cause: new Error("No matching font found for 'Test', style=italic"),
        }),
      );
    });

    it('selects different font variants', async () => {
      const fontFamily = 'Test';

      const font1 = await store.selectFont({ fontFamily });
      const font2 = await store.selectFont({ fontFamily, fontWeight: 'bold' });
      const font3 = await store.selectFont({ fontFamily, fontStyle: 'italic' });
      const font4 = await store.selectFont({ fontFamily, fontStyle: 'italic', fontWeight: 'bold' });

      expect(font1.fontName).toBe('MockFont:Test:normal:400');
      expect(font2.fontName).toBe('MockFont:Test:normal:700');
      expect(font3.fontName).toBe('MockFont:Test:italic:400');
      expect(font4.fontName).toBe('MockFont:Test:italic:700');
    });

    it('selects first matching font if no family specified', async () => {
      const font1 = await store.selectFont({});
      expect(font1.fontName).toBe('MockFont:Test:normal:400');

      const font2 = await store.selectFont({ fontWeight: 'bold' });
      expect(font2.fontName).toBe('MockFont:Test:normal:700');

      const font3 = await store.selectFont({ fontStyle: 'italic' });
      expect(font3.fontName).toBe('MockFont:Test:italic:400');

      const font4 = await store.selectFont({ fontStyle: 'italic', fontWeight: 'bold' });
      expect(font4.fontName).toBe('MockFont:Test:italic:700');
    });

    it('selects font with matching font family', async () => {
      await expect(store.selectFont({ fontFamily: 'Other' })).resolves.toEqual(
        expect.objectContaining({ fontName: 'MockFont:Other:normal:400' }),
      );
    });

    it('falls back to oblique when no italic font can be found', async () => {
      const store = new FontStore();
      registerFakeFont(store, 'Test');
      registerFakeFont(store, 'Test', { style: 'oblique' });
      registerFakeFont(store, 'Test', { weight: 700 });
      registerFakeFont(store, 'Test', { style: 'oblique', weight: 700 });

      await expect(store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' })).resolves.toEqual(
        expect.objectContaining({ fontName: 'MockFont:Test:oblique:400' }),
      );
    });

    it('falls back to italic when no oblique font can be found', async () => {
      const store = new FontStore();
      registerFakeFont(store, 'Test');
      registerFakeFont(store, 'Test', { style: 'italic' });
      registerFakeFont(store, 'Test', { weight: 700 });
      registerFakeFont(store, 'Test', { style: 'italic', weight: 700 });

      const font = await store.selectFont({ fontFamily: 'Test', fontStyle: 'italic' });

      expect(font).toEqual(expect.objectContaining({ fontName: 'MockFont:Test:italic:400' }));
    });

    it('falls back when no matching font weight can be found', async () => {
      await expect(store.selectFont({ fontFamily: 'Other', fontWeight: 'bold' })).resolves.toEqual(
        expect.objectContaining({ fontName: 'MockFont:Other:normal:400' }),
      );
      await expect(store.selectFont({ fontFamily: 'Other', fontWeight: 200 })).resolves.toEqual(
        expect.objectContaining({ fontName: 'MockFont:Other:normal:400' }),
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

    it('returns same font object for concurrent calls', async () => {
      const [font1, font2] = await Promise.all([
        store.selectFont({ fontFamily: 'Test' }),
        store.selectFont({ fontFamily: 'Test' }),
      ]);

      expect(font1).toBe(font2);
    });
  });
});

function registerFakeFont(
  store: FontStore,
  family: string,
  options?: { style?: string; weight?: number },
) {
  const style = options?.style ?? 'normal';
  const weight = options?.weight ?? 400;
  const data = mkData([family, style, weight].join(':'));
  store.registerFont(data, { family, style: style as 'normal', weight });
}

function createTestStore(): FontStore {
  const store = new FontStore();
  registerFakeFont(store, 'Test');
  registerFakeFont(store, 'Test', { style: 'italic' });
  registerFakeFont(store, 'Test', { style: 'oblique' });
  registerFakeFont(store, 'Test', { weight: 700 });
  registerFakeFont(store, 'Test', { style: 'italic', weight: 700 });
  registerFakeFont(store, 'Test', { style: 'oblique', weight: 700 });
  registerFakeFont(store, 'Other');
  return store;
}
