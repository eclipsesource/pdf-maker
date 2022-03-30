import { PDFFont } from 'pdf-lib';

import { Font } from '../src/fonts.js';

export function fakeFont(name: string, opts: { italic?: boolean; bold?: boolean } = {}): Font {
  return {
    name,
    italic: opts?.italic,
    bold: opts.bold,
    pdfFont: fakePdfFont(`${name}${opts?.italic ? '-italic' : ''}${opts?.bold ? '-bold' : ''}`),
  } as any;
}

/**
 * To ease calculations in tests, we use a fake font that always returns a width of
 * `fontSize * text.length`, so that at `fontSize = 10` a text with 5 chars will have
 * a length of `10 * 5 = 50`.
 */
export function fakePdfFont(name: string): PDFFont {
  return {
    name,
    widthOfTextAtSize: (text, fontSize) => text.length * fontSize,
    heightAtSize: (fontSize) => fontSize,
  } as any;
}

export function range(n) {
  return [...Array(n).keys()];
}
