import type { ContentStream, PDFFont } from '@ralfstx/pdf-core';

import type { Pos } from '../box.ts';
import { type Color, rgb, setFillingColor } from '../colors.ts';
import type { TextObject } from '../frame.ts';
import type { Page, TextState } from '../page.ts';

export function renderText(object: TextObject, page: Page, base: Pos) {
  page.textState ??= {};
  const state = page.textState;
  const x = base.x;
  const y = page.size.height - base.y;
  const cs = page.pdfPage.contentStream;
  cs.beginText();
  // Reset font state so that the font is always set after beginText()
  state.font = undefined;
  state.size = undefined;
  object.rows?.forEach((row) => {
    cs.setTextMatrix(1, 0, 0, 1, x + row.x, y - row.y - row.baseline);
    row.segments?.forEach((seg) => {
      setTextColorOp(cs, state, seg.color);
      setTextFontAndSizeOp(cs, state, seg.font, seg.fontSize);
      setTextRiseOp(cs, state, seg.rise);
      setLetterSpacingOp(cs, state, seg.letterSpacing);
      cs.showPositionedText(seg.glyphs);
    });
  });
  cs.endText();
}

function setTextColorOp(cs: ContentStream, state: TextState, color?: Color): void {
  const effectiveColor = color ?? rgb(0, 0, 0);
  if (!equalsColor(state.color, effectiveColor)) {
    state.color = effectiveColor;
    setFillingColor(cs, effectiveColor);
  }
}

function setTextFontAndSizeOp(
  cs: ContentStream,
  state: TextState,
  font: PDFFont,
  size: number,
): void {
  if (state.font !== font?.key || state.size !== size) {
    state.font = font?.key;
    state.size = size;
    cs.setFontAndSize(font, size);
  }
}

function setTextRiseOp(cs: ContentStream, state: TextState, rise?: number): void {
  if ((state.rise ?? 0) !== (rise ?? 0)) {
    state.rise = rise;
    cs.setTextRise(rise ?? 0);
  }
}

function setLetterSpacingOp(cs: ContentStream, state: TextState, charSpace?: number): void {
  if ((state.charSpace ?? 0) !== (charSpace ?? 0)) {
    state.charSpace = charSpace;
    cs.setCharacterSpacing(charSpace ?? 0);
  }
}

function equalsColor(color1: Color | undefined, color2: Color | undefined) {
  if (!color1 && !color2) return true;
  return (
    !!color1 &&
    !!color2 &&
    Object.keys(color1).every(
      (key) => color1[key as keyof typeof color1] === color2[key as keyof typeof color2],
    )
  );
}
