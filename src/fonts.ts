import type fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFRef } from 'pdf-lib';
import { CustomFontSubsetEmbedder, PDFFont } from 'pdf-lib';

import type { FontStyle, FontWeight } from './api/text.ts';
import { parseBinaryData } from './binary-data.ts';
import { printValue } from './print-value.ts';
import { optional, readAs, readBoolean, readObject, required, types } from './types.ts';

/**
 * The resolved definition of a font.
 */
export type FontDef = {
  family: string;
  style: FontStyle;
  weight: number;
  data: string | Uint8Array | ArrayBuffer;
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
      (font) => ({ family: name, ...font }) as FontDef,
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
