import { PDFFont } from 'pdf-lib';

import { Text, TextAttrs } from './content.js';
import { Font, selectFont } from './fonts.js';

const defaultFontSize = 18;
const defaultLineHeight = 1.2;

export type TextSegment = {
  text: string;
  width: number;
  height: number;
  lineHeight: number;
  font: PDFFont;
  fontSize: number;
};

export function extractTextSegments(text: Text, attrs: TextAttrs, fonts: Font[]): TextSegment[] {
  return measureSpans(normalizeText(text, attrs), fonts);
}

type TextSpan = {
  text: string;
  attrs: TextAttrs;
};

function normalizeText(text: Text, attrs: TextAttrs): TextSpan[] {
  if (Array.isArray(text)) {
    return text.flatMap((text) => normalizeText(text, attrs));
  }
  if (typeof text === 'string') {
    return [{ text, attrs }];
  }
  if (typeof text === 'object' && 'text' in text) {
    return normalizeText(text.text, { ...attrs, ...text });
  }
  throw new TypeError(`Invalid text: ${text}`);
}

function measureSpans(spans: TextSpan[], fonts: Font[]): TextSegment[] {
  return spans.map((span) => {
    const { text, attrs } = span;
    const { fontSize = defaultFontSize, lineHeight = defaultLineHeight } = attrs;
    const font = selectFont(fonts, attrs);
    const height = font.heightAtSize(fontSize);
    return {
      text,
      width: font.widthOfTextAtSize(text, fontSize),
      height,
      lineHeight,
      font,
      fontSize,
    };
  });
}
