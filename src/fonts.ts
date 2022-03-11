import { PDFDocument, PDFFont } from 'pdf-lib';

import { FontsDefinition, TextAttrs } from './content.js';

export type Font = {
  name: string;
  italic: boolean;
  bold: boolean;
  pdfFont: PDFFont;
};

type FontSelector = {
  name: string;
  italic?: boolean;
  bold?: boolean;
};

export async function embedFonts(fontsDef: FontsDefinition, doc: PDFDocument): Promise<Font[]> {
  const fontDefs = Object.entries(fontsDef ?? {}).flatMap(([name, fontDef]) =>
    fontDef.map((fontDef) => ({ ...fontDef, name }))
  );
  return await Promise.all(
    fontDefs.map(async (def) => {
      const pdfFont = await doc.embedFont(def.data, { subset: true });
      return { name: def.name, italic: !!def.italic, bold: !!def.bold, pdfFont };
    })
  );
}

export function selectFont(fonts: Font[], attrs: TextAttrs): PDFFont {
  const { fontFamily: name, italic, bold } = attrs;
  const font = fonts.find((font) => match(font, { name, italic, bold }))?.pdfFont;
  if (!font) {
    const style = italic ? (bold ? 'bold italic' : 'italic') : bold ? 'bold' : 'normal';
    throw new Error(`No font found for "${name} ${style}"`);
  }
  return font;
}

function match(font: Font, selector: FontSelector): boolean {
  return (
    (!selector.name || font.name === selector.name) &&
    !font.italic === !selector.italic &&
    !font.bold === !selector.bold
  );
}
