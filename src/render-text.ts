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
import { getFont, Page } from './page.js';

export function renderTexts(els: TextObject[], page: Page, base: Pos) {
  const contentStream: PDFContentStream = (page.pdfPage as any).getContentStream();
  contentStream.push(beginText());
  const state: TextState = {};
  els.forEach((el) => {
    const x = base.x + el.x;
    const y = page.size.height - base.y - el.y;
    const options = { x, y, size: el.fontSize, font: el.font, color: el.color };
    const fontKey = getFont(page, options.font);
    const encodedText = options.font.encodeText(el.text);
    const operators = [
      setTextColor(state, options.color),
      setTextFontAndSize(state, fontKey, options.size),
      setTextMatrix(1, 0, 0, 1, x, y),
      showText(encodedText),
    ].filter(Boolean);
    contentStream.push(...operators);
  });
  contentStream.push(endText());
}

type TextState = { color?: Color; font?: string; size?: number };

function setTextColor(state: TextState, color: Color): PDFOperator {
  const effectiveColor = color ?? rgb(0, 0, 0);
  if (!equalsColor(state.color, effectiveColor)) {
    state.color = effectiveColor;
    return setFillingColor(effectiveColor);
  }
}

function setTextFontAndSize(state: TextState, font: PDFName, size: number): PDFOperator {
  if (state.font !== font?.toString() || state.size !== size) {
    state.font = font?.toString();
    state.size = size;
    return setFontAndSize(font, size);
  }
}

function equalsColor(color1: Color, color2: Color) {
  if (!color1 && !color2) return true;
  return !!color1 && !!color2 && Object.keys(color1).every((key) => color1[key] === color2[key]);
}
