import type { Font } from '@pdf-lib/fontkit';

export function getTextWidth(text: string, font: Font, fontSize: number): number {
  const { glyphs } = font.layout(text);
  const scale = 1000 / font.unitsPerEm;
  let totalWidth = 0;
  for (let idx = 0, len = glyphs.length; idx < len; idx++) {
    totalWidth += glyphs[idx].advanceWidth * scale;
  }
  return (totalWidth * fontSize) / 1000;
}

export function getTextHeight(font: Font, fontSize: number): number {
  const { ascent, descent, bbox } = font;
  const scale = 1000 / font.unitsPerEm;
  const yTop = (ascent || bbox.maxY) * scale;
  const yBottom = (descent || bbox.minY) * scale;
  const height = yTop - yBottom;
  return (height / 1000) * fontSize;
}
