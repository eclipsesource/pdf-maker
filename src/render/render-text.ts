import type { Color, PDFContentStream, PDFFont, PDFName, PDFOperator } from 'pdf-lib';
import {
  beginText,
  endText,
  rgb,
  setCharacterSpacing,
  setFillingColor,
  setFontAndSize,
  setTextMatrix,
  setTextRise,
  showText,
} from 'pdf-lib';

import type { Pos } from '../box.ts';
import type { TextObject } from '../frame.ts';
import type { Page, TextState } from '../page.ts';
import { addPageFont } from '../page.ts';
import { compact } from '../utils.ts';

export function renderText(object: TextObject, page: Page, base: Pos) {
  const contentStream: PDFContentStream = (page.pdfPage as any).getContentStream();
  const state = (page.textState ??= {});
  const x = base.x;
  const y = page.size.height - base.y;
  contentStream.push(beginText());
  object.rows?.forEach((row) => {
    contentStream.push(setTextMatrix(1, 0, 0, 1, x + row.x, y - row.y - row.baseline));
    row.segments?.forEach((seg) => {
      const fontKey = addPageFont(page, seg.font);
      const pdfFont = (page.pdfPage as any)?.doc?.fonts?.find(
        (font: PDFFont) => font.ref === seg.font.pdfRef,
      );
      const encodedText = pdfFont.encodeText(seg.text);
      const operators = compact([
        setTextColorOp(state, seg.color),
        setTextFontAndSizeOp(state, fontKey, seg.fontSize),
        setTextRiseOp(state, seg.rise),
        setLetterSpacingOp(state, seg.letterSpacing),
        showText(encodedText),
      ]);
      contentStream.push(...operators);
    });
  });
  contentStream.push(endText());
}

function setTextColorOp(state: TextState, color?: Color): PDFOperator | undefined {
  const effectiveColor = color ?? rgb(0, 0, 0);
  if (!equalsColor(state.color, effectiveColor)) {
    state.color = effectiveColor;
    return setFillingColor(effectiveColor);
  }
}

function setTextFontAndSizeOp(
  state: TextState,
  font: PDFName,
  size: number,
): PDFOperator | undefined {
  if (state.font !== font?.toString() || state.size !== size) {
    state.font = font?.toString();
    state.size = size;
    return setFontAndSize(font, size);
  }
}

function setTextRiseOp(state: TextState, rise?: number): PDFOperator | undefined {
  if ((state.rise ?? 0) !== (rise ?? 0)) {
    state.rise = rise;
    return setTextRise(rise ?? 0);
  }
}

function setLetterSpacingOp(state: TextState, charSpace?: number): PDFOperator | undefined {
  if ((state.charSpace ?? 0) !== (charSpace ?? 0)) {
    state.charSpace = charSpace;
    return setCharacterSpacing(charSpace ?? 0);
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
