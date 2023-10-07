import fontkit from '@pdf-lib/fontkit';
import { CustomFontSubsetEmbedder, PDFDocument, PDFFont, PDFRef, toUint8Array } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
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

export function loadFonts(fontDefs: FontDef[]): Font[] {
  return fontDefs.map((def) => {
    const data = toUint8Array(def.data);
    const fkFont = fontkit.create(data);
    return pickDefined({
      name: def.name,
      italic: def.italic,
      bold: def.bold,
      fkFont,
      data,
    });
  });
}

export function registerFont(font: Font, pdfDoc: PDFDocument) {
  const ref = pdfDoc.context.nextRef();
  const embedder = new (CustomFontSubsetEmbedder as any)(font.fkFont, font.data);
  const pdfFont = PDFFont.of(ref, pdfDoc, embedder);
  (pdfDoc as any).fonts.push(pdfFont);
  return ref;
}

export function createFontStore(fonts: Font[]): FontStore {
  return {
    selectFont,
  };

  async function selectFont(attrs: FontSelector) {
    const { fontFamily, italic, bold } = attrs;
    const font = fonts.find((font) => match(font, { fontFamily, italic, bold }));
    if (!font) {
      const style = italic ? (bold ? 'bold italic' : 'italic') : bold ? 'bold' : 'normal';
      throw new Error(`No font found for "${fontFamily} ${style}"`);
    }
    return font;
  }
}

function match(font: Font, selector: FontSelector): boolean {
  return (
    (!selector.fontFamily || font.name === selector.fontFamily) &&
    !font.italic === !selector.italic &&
    !font.bold === !selector.bold
  );
}
