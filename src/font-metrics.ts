import type { PDFFont } from '@ralfstx/pdf-core';

export function getTextWidth(text: string, font: PDFFont, fontSize: number): number {
  const glyphs = font.shapeText(text, { defaultFeatures: false });
  return glyphs.reduce(
    (sum, glyph) => sum + (glyph.advance + (glyph.advanceAdjust ?? 0)) * (fontSize / 1000),
    0,
  );
}

export function getTextHeight(font: PDFFont, fontSize: number): number {
  const ascent = font.ascent;
  const descent = font.descent;
  const height = ascent - descent;
  return (height * fontSize) / 1000;
}
