import { Color, PDFFont, PDFImage, PDFName, PDFPage } from 'pdf-lib';

import { Size } from './box.js';
import { Frame } from './layout.js';

export type TextState = { color?: Color; font?: string; size?: number; rise?: number };

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  pdfPage?: PDFPage;
  fonts?: { [ref: string]: PDFName };
  images?: { [ref: string]: PDFName };
  textState?: TextState;
  extGStates?: { [ref: string]: PDFName };
};

export function getPageFont(page: Page, font: PDFFont): PDFName {
  page.fonts ??= {};
  const key = font.ref.toString();
  if (!(key in page.fonts)) {
    page.fonts[key] = (page.pdfPage as any).node.newFontDictionary(font.name, font.ref);
  }
  return page.fonts[key];
}

export function getPageImage(page: Page, image: PDFImage): PDFName {
  page.images ??= {};
  const key = image.ref.toString();
  if (!(key in page.images)) {
    page.images[key] = (page.pdfPage as any).node.newXObject('Image', image.ref);
  }
  return page.images[key];
}

type ExtGraphicsParams = { ca: number; CA: number };

export function getExtGraphicsState(page: Page, params: ExtGraphicsParams): PDFName {
  if (!page.pdfPage) throw new Error('Page not initialized');
  page.extGStates ??= {};
  const key = `CA:${params.CA},ca:${params.ca}`;
  if (!(key in page.extGStates)) {
    const dict = page.pdfPage.doc.context.obj({ Type: 'ExtGState', ...params });
    page.extGStates[key] = (page.pdfPage as any).node.newExtGState('GS', dict);
  }
  return page.extGStates[key];
}
