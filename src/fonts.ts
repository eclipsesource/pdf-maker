import { PDFDocument, PDFFont } from 'pdf-lib';

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

export type Font = {
  name: string;
  italic?: boolean;
  bold?: boolean;
  pdfFont: PDFFont;
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

export async function embedFonts(fontDefs: FontDef[], doc: PDFDocument): Promise<Font[]> {
  return await Promise.all(
    fontDefs.map(async (def) => {
      const pdfFont = await doc.embedFont(def.data, { subset: true }).catch((error) => {
        throw new Error(`Could not embed font "${def.name}": ${error.message ?? error}`);
      });
      return pickDefined({ name: def.name, italic: def.italic, bold: def.bold, pdfFont });
    })
  );
}

export function selectFont(fonts: Font[], attrs: FontSelector): PDFFont {
  const { fontFamily, italic, bold } = attrs;
  const font = fonts.find((font) => match(font, { fontFamily, italic, bold }))?.pdfFont;
  if (!font) {
    const style = italic ? (bold ? 'bold italic' : 'italic') : bold ? 'bold' : 'normal';
    throw new Error(`No font found for "${fontFamily} ${style}"`);
  }
  return font;
}

function match(font: Font, selector: FontSelector): boolean {
  return (
    (!selector.fontFamily || font.name === selector.fontFamily) &&
    !font.italic === !selector.italic &&
    !font.bold === !selector.bold
  );
}
