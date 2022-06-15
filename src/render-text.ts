import {
  beginText,
  endText,
  PDFContentStream,
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
  els.forEach((el) => {
    const x = base.x + el.x;
    const y = page.size.height - base.y - el.y;
    const options = { x, y, size: el.fontSize, font: el.font, color: el.color };
    const fontKey = getFont(page, options.font);
    const encodedText = options.font.encodeText(el.text);
    const operators = [
      setFillingColor(options.color ?? rgb(0, 0, 0)),
      setFontAndSize(fontKey, options.size),
      setTextMatrix(1, 0, 0, 1, x, y),
      showText(encodedText),
    ].filter(Boolean);
    contentStream.push(...operators);
  });
  contentStream.push(endText());
}
