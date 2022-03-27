import { PDFDocument, PDFFont } from 'pdf-lib';

import {
  asArray,
  asBoolean,
  asObject,
  check,
  optional,
  pick,
  pickDefined,
  required,
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

export function parseFonts(input: unknown): FontDef[] {
  const obj = check(input, 'fonts', optional(asObject)) ?? {};
  return Object.entries(obj).flatMap(([name, fontDef]) => {
    const array = check(fontDef, 'font definition', required(asArray));
    return array.map((fontDef) => {
      const obj = check(fontDef, 'font', required(asObject));
      return pickDefined({
        name,
        italic: pick(obj, 'italic', optional(asBoolean)) || undefined,
        bold: pick(obj, 'bold', optional(asBoolean)) || undefined,
        data: pick(obj, 'data', required()),
      }) as FontDef;
    });
  });
}

export async function embedFonts(fontDefs: FontDef[], doc: PDFDocument): Promise<Font[]> {
  return await Promise.all(
    fontDefs.map(async (def) => {
      const pdfFont = await doc.embedFont(def.data, { subset: true }).catch((error) => {
        throw new Error(`Could not embed font "${def.name}": ${error.message ?? error}`);
      });
      return pickDefined({ name: def.name, italic: def.italic, bold: def.bold, pdfFont }) as Font;
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
