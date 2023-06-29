import { Color, PDFName, PDFPage } from 'pdf-lib';

import { Size } from './box.js';
import { Font, registerFont } from './fonts.js';
import { Image, registerImage } from './images.js';
import { Frame } from './layout.js';

export type TextState = {
  color?: Color;
  font?: string;
  size?: number;
  rise?: number;
  charSpace?: number;
};

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

export function addPageFont(page: Page, font: Font): PDFName {
  if (!page.pdfPage) throw new Error('Page not initialized');
  if (!font.pdfRef) {
    font.pdfRef = registerFont(font, page.pdfPage.doc);
  }
  page.fonts ??= {};
  const key = font.pdfRef.toString();
  if (!(key in page.fonts)) {
    page.fonts[key] = (page.pdfPage as any).node.newFontDictionary(font.name, font.pdfRef);
  }
  return page.fonts[key];
}

export function addPageImage(page: Page, image: Image): PDFName {
  if (!page.pdfPage) throw new Error('Page not initialized');
  if (!image.pdfRef) {
    image.pdfRef = registerImage(image, page.pdfPage.doc);
  }
  page.images ??= {};
  const key = image.pdfRef.toString();
  if (!(key in page.images)) {
    page.images[key] = (page.pdfPage as any).node.newXObject('Image', image.pdfRef);
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
