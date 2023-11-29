import fontkit from '@pdf-lib/fontkit';
import { CustomFontSubsetEmbedder, PDFDocument, PDFFont, PDFRef } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { FontStyle, FontWeight } from './content.js';
import { FontLoader, LoadedFont } from './font-loader.js';
import { printValue } from './print-value.js';
import {
  optional,
  pickDefined,
  readAs,
  readBoolean,
  readObject,
  required,
  types,
} from './types.js';

/**
 * The resolved definition of a font.
 */
export type FontDef = {
  family: string;
  style: FontStyle;
  weight: number;
  data: string | Uint8Array | ArrayBuffer;
};

export type FontStore = {
  selectFont(attrs: FontSelector): Promise<Font>;
};

export type Font = {
  name: string;
  style: FontStyle;
  weight: number;
  data: Uint8Array;
  fkFont: fontkit.Font;
  pdfRef?: PDFRef;
};

export type FontSelector = {
  fontFamily?: string;
  fontStyle?: FontStyle;
  fontWeight?: FontWeight;
};

export function readFonts(input: unknown): FontDef[] {
  return Object.entries(readObject(input)).flatMap(([name, fontDef]) => {
    return readAs(fontDef, name, required(types.array(readFont))).map(
      (font) => ({ family: name, ...font } as FontDef)
    );
  });
}

export function readFont(input: unknown): Partial<FontDef> {
  const obj = readObject(input, {
    italic: optional((value) => readBoolean(value) || undefined),
    bold: optional((value) => readBoolean(value) || undefined),
    data: required(parseBinaryData),
  });
  return {
    style: obj.italic ? 'italic' : 'normal',
    weight: obj.bold ? 700 : 400,
    data: obj.data,
  } as FontDef;
}

export function registerFont(font: Font, pdfDoc: PDFDocument) {
  const ref = pdfDoc.context.nextRef();
  const embedder = new (CustomFontSubsetEmbedder as any)(font.fkFont, font.data);
  const pdfFont = PDFFont.of(ref, pdfDoc, embedder);
  (pdfDoc as any).fonts.push(pdfFont);
  return ref;
}

export function createFontStore(fontLoader: FontLoader): FontStore {
  const fontCache: Record<string, Promise<Font>> = {};

  return {
    selectFont,
  };

  function selectFont(selector: FontSelector): Promise<Font> {
    const cacheKey = [
      selector.fontFamily ?? 'any',
      selector.fontStyle ?? 'normal',
      selector.fontWeight ?? 'normal',
    ].join(':');
    return (fontCache[cacheKey] ??= loadFont(selector));
  }

  async function loadFont(selector: FontSelector): Promise<Font> {
    let loadedFont: LoadedFont;
    try {
      loadedFont = await fontLoader.loadFont(selector);
    } catch (error) {
      const { fontFamily: family, fontStyle: style, fontWeight: weight } = selector;
      const selectorStr = `'${family}', style=${style ?? 'normal'}, weight=${weight ?? 'normal'}`;
      throw new Error(
        `Could not load font for ${selectorStr}: ${(error as Error)?.message ?? error}`
      );
    }
    const fkFont = fontkit.create(loadedFont.data);
    return pickDefined({
      name: loadedFont.name,
      data: loadedFont.data,
      style: selector.fontStyle ?? 'normal',
      weight: weightToNumber(selector.fontWeight ?? 400),
      fkFont,
    });
  }
}

export function weightToNumber(weight: FontWeight): number {
  if (weight === 'normal') {
    return 400;
  }
  if (weight === 'bold') {
    return 700;
  }
  if (typeof weight !== 'number' || !isFinite(weight) || weight < 1 || weight > 1000) {
    throw new Error(`Invalid font weight: ${printValue(weight)}`);
  }
  return weight;
}
