import {
  beginText,
  Color,
  endText,
  PDFContentStream,
  PDFName,
  PDFOperator,
  rgb,
  setFillingColor,
  setFontAndSize,
  setTextMatrix,
  showText,
} from 'pdf-lib';

import { Pos } from './box.js';
import { TextObject } from './layout.js';
import { getPageFont, Page } from './page.js';

export function renderText(object: TextObject, page: Page, base: Pos) {
  const contentStream: PDFContentStream = (page.pdfPage as any).getContentStream();
  const state: TextState = {};
  const x = base.x;
  const y = page.size.height - base.y;
  contentStream.push(beginText());
  object.rows?.forEach((row) => {
    contentStream.push(setTextMatrix(1, 0, 0, 1, x + row.x, y - row.y - row.baseline));
    row.segments?.forEach((seg) => {
      const fontKey = getPageFont(page, seg.font);
      const encodedText = seg.font.encodeText(seg.text);
      const operators = [
        setTextColor(state, seg.color),
        setTextFontAndSize(state, fontKey, seg.fontSize),
        showText(encodedText),
      ].filter(Boolean) as PDFOperator[];
      contentStream.push(...operators);
    });
  });
  contentStream.push(endText());
}

type TextState = { color?: Color; font?: string; size?: number };

function setTextColor(state: TextState, color?: Color): PDFOperator | undefined {
  const effectiveColor = color ?? rgb(0, 0, 0);
  if (!equalsColor(state.color, effectiveColor)) {
    state.color = effectiveColor;
    return setFillingColor(effectiveColor);
  }
}

function setTextFontAndSize(
  state: TextState,
  font: PDFName,
  size: number
): PDFOperator | undefined {
  if (state.font !== font?.toString() || state.size !== size) {
    state.font = font?.toString();
    state.size = size;
    return setFontAndSize(font, size);
  }
}

function equalsColor(color1: Color | undefined, color2: Color | undefined) {
  if (!color1 && !color2) return true;
  return (
    !!color1 &&
    !!color2 &&
    Object.keys(color1).every(
      (key) => color1[key as keyof typeof color1] === color2[key as keyof typeof color2]
    )
  );
}
