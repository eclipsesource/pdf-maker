import { PDFFont, PDFImage, PDFName, PDFPage } from 'pdf-lib';

import { Size } from './box.js';
import { Frame } from './layout.js';

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  pdfPage?: PDFPage;
  fonts?: { [ref: string]: PDFName };
  images?: { [ref: string]: PDFName };
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

type GraphicsState = { ca: number; CA: number };

export function getPageGraphicsState(page: Page, graphicsState: GraphicsState): PDFName {
  page.extGStates ??= {};
  const key = `CA:${graphicsState.CA},ca:${graphicsState.ca}`;
  if (!(key in page.extGStates)) {
    const dict = page.pdfPage.doc.context.obj({ Type: 'ExtGState', ...graphicsState });
    page.extGStates[key] = (page.pdfPage as any).node.newExtGState('GS', dict);
  }
  return page.extGStates[key];
}
