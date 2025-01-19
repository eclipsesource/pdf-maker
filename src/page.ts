import type { Color, PDFName, PDFPage } from 'pdf-lib';

import type { Size } from './box.ts';
import type { Font } from './fonts.ts';
import { registerFont } from './fonts.ts';
import type { Frame } from './frame.ts';
import type { Image } from './images.ts';
import { registerImage } from './images.ts';

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
  page.fonts ??= {};
  if (!(font.key in page.fonts)) {
    const pdfRef = registerFont(font, page.pdfPage.doc);
    page.fonts[font.key] = (page.pdfPage as any).node.newFontDictionary(font.name, pdfRef);
  }
  return page.fonts[font.key];
}

export function addPageImage(page: Page, image: Image): PDFName {
  if (!page.pdfPage) throw new Error('Page not initialized');
  page.images ??= {};
  if (!(image.url in page.images)) {
    const pdfRef = registerImage(image, page.pdfPage.doc);
    page.images[image.url] = (page.pdfPage as any).node.newXObject('Image', pdfRef);
  }
  return page.images[image.url];
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
