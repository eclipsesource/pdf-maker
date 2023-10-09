import fontkit from '@pdf-lib/fontkit';
import { CustomFontSubsetEmbedder, PDFDocument, PDFFont, PDFRef } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { FontLoader } from './font-loader.js';
import {
  optional,
  pickDefined,
  readAs,
  readBoolean,
  readObject,
  required,
  types,
} from './types.js';

export type FontDef = {
  name: string;
  italic?: boolean;
  bold?: boolean;
  data: string | Uint8Array | ArrayBuffer;
};

export type FontStore = {
  selectFont(attrs: FontSelector): Promise<Font>;
};

export type Font = {
  name: string;
  italic?: boolean;
  bold?: boolean;
  data: Uint8Array;
  fkFont: fontkit.Font;
  pdfRef?: PDFRef;
};

export type FontSelector = {
  fontFamily?: string;
  italic?: boolean;
  bold?: boolean;
};

export function readFonts(input: unknown): FontDef[] {
  return Object.entries(readObject(input)).flatMap(([name, fontDef]) => {
    return readAs(fontDef, name, required(types.array(readFont))).map(
      (font) => ({ name, ...font } as FontDef)
    );
  });
}

export function readFont(input: unknown): Partial<FontDef> {
  return readObject(input, {
    italic: optional((value) => readBoolean(value) || undefined),
    bold: optional((value) => readBoolean(value) || undefined),
    data: required(parseBinaryData),
  }) as FontDef;
}

export function registerFont(font: Font, pdfDoc: PDFDocument) {
  const ref = pdfDoc.context.nextRef();
  const embedder = new (CustomFontSubsetEmbedder as any)(font.fkFont, font.data);
  const pdfFont = PDFFont.of(ref, pdfDoc, embedder);
  (pdfDoc as any).fonts.push(pdfFont);
  return ref;
}

export function createFontStore(fontLoader: FontLoader): FontStore {
  return {
    selectFont,
  };

  async function selectFont(selector: FontSelector): Promise<Font> {
    let loadedFont;
    try {
      loadedFont = await fontLoader.loadFont(selector);
    } catch (error) {
      const { fontFamily, italic, bold } = selector;
      const style = italic ? (bold ? 'bold italic' : 'italic') : bold ? 'bold' : 'normal';
      const selectorStr = `'${fontFamily}', ${style}`;
      throw new Error(
        `Could not load font for ${selectorStr}: ${(error as Error)?.message ?? error}`
      );
    }
    const fkFont = fontkit.create(loadedFont.data);
    return pickDefined({
      name: loadedFont.name,
      data: loadedFont.data,
      italic: selector.italic,
      bold: selector.bold,
      fkFont,
    });
  }
}
