import { PDFContext, PDFFont, PDFName, PDFPage, PDFRef } from 'pdf-lib';

import { Font } from '../src/fonts.js';
import { Image } from '../src/images.js';
import { Page } from '../src/page.js';

export function fakeFont(name: string, opts: { italic?: boolean; bold?: boolean } = {}): Font {
  return {
    name,
    italic: opts?.italic,
    bold: opts.bold,
    pdfFont: fakePdfFont(`${name}${opts?.italic ? '-italic' : ''}${opts?.bold ? '-bold' : ''}`),
  } as any;
}

export function fakeImage(name: string, width: number, height: number): Image {
  return {
    name,
    pdfImage: { width, height },
  } as any;
}

/**
 * To ease calculations in tests, we use a fake font that always returns a width of
 * `fontSize * text.length`, so that at `fontSize = 10` a text with 5 chars will have
 * a length of `10 * 5 = 50`.
 * Likewise, the descent is set to amount to `0.2 * fontSize`.
 */
export function fakePdfFont(name: string): PDFFont {
  return {
    name,
    ref: PDFRef.of(name.split('').reduce((a, c) => a ^ c.charCodeAt(0), 0)),
    widthOfTextAtSize: (text: string, fontSize: number) => text.length * fontSize,
    heightAtSize: (fontSize: number) => fontSize,
    embedder: { font: { descent: -200, unitsPerEm: 1000 } },
    encodeText: (text: string) => text,
  } as any;
}

export function fakePdfPage(): PDFPage {
  const context = PDFContext.create();
  const node = context.obj({});
  const contentStream: any[] = [];
  let counter = 1;
  (node as any).newFontDictionary = (name: string) => PDFName.of(`${name}-${counter++}`);
  (node as any).newXObject = (type: string, ref: string) =>
    PDFName.of(`${type}-${ref}-${counter++}`);
  (node as any).newExtGState = (type: string) => PDFName.of(`${type}-${counter++}`);
  return {
    doc: { context, catalog: context.obj({}) },
    ref: PDFRef.of(1),
    getContentStream: () => contentStream,
    node,
  } as unknown as PDFPage;
}

export function range(n: number): number[] {
  return [...Array(n).keys()];
}

export function p(x: number, y: number) {
  return { x, y };
}

export function getContentStream(page: Page) {
  const contentStream = (page.pdfPage as any).getContentStream();
  return contentStream.map((o: any) => o.toString());
}
