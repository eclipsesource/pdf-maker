import { PDFFont, PDFImage, PDFName, PDFPage } from 'pdf-lib';

import { Pos, Size } from './box.js';
import { Document } from './document.js';
import { renderGuide } from './guides.js';
import { Frame, TextObject } from './layout.js';
import { renderAnchor, renderLink } from './render-annotations.js';
import { renderGraphics } from './render-graphics.js';
import { renderImage } from './render-image.js';
import { renderTexts } from './render-text.js';

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  guides?: boolean;
  pdfPage?: PDFPage;
  fonts?: { [ref: string]: PDFName };
  images?: { [ref: string]: PDFName };
  extGStates?: { [ref: string]: PDFName };
};

export function getPageFont(page: Page, font: PDFFont): PDFName {
  if (!page.fonts) page.fonts = {};
  const key = font.ref.toString();
  if (!(key in page.fonts)) {
    page.fonts[key] = (page.pdfPage as any).node.newFontDictionary(font.name, font.ref);
  }
  return page.fonts[key];
}

export function getPageImage(page: Page, image: PDFImage): PDFName {
  if (!page.images) page.images = {};
  const key = image.ref.toString();
  if (!(key in page.images)) {
    page.images[key] = (page.pdfPage as any).node.newXObject('Image', image.ref);
  }
  return page.images[key];
}

type GraphicsState = { ca: number; CA: number };

export function getPageGraphicsState(page: Page, graphicsState: GraphicsState): PDFName {
  if (!page.extGStates) page.extGStates = {};
  const key = `CA:${graphicsState.CA},ca:${graphicsState.ca}`;
  if (!(key in page.extGStates)) {
    const dict = page.pdfPage.doc.context.obj({ Type: 'ExtGState', ...graphicsState });
    page.extGStates[key] = (page.pdfPage as any).node.newExtGState('GS', dict);
  }
  return page.extGStates[key];
}

export function renderPage(page: Page, doc: Document) {
  page.pdfPage = doc.pdfDoc.addPage([page.size.width, page.size.height]);
  renderFrame(page.content, page);
  page.header && renderFrame(page.header, page);
  page.footer && renderFrame(page.footer, page);
}

export function renderFrame(frame: Frame, page: Page, base: Pos = null) {
  const { width, height } = frame;
  const topLeft = { x: frame.x + (base?.x ?? 0), y: frame.y + (base?.y ?? 0) };
  const bottomLeft = { x: topLeft.x, y: topLeft.y + height };
  renderGuide(page, { ...tr(bottomLeft, page), width, height }, frame.type);

  const textObjects = frame.objects?.filter((object) => object.type === 'text') as TextObject[];
  textObjects?.length && renderTexts(textObjects, page, bottomLeft);

  frame.objects?.forEach((object) => {
    if (object.type === 'graphics') {
      renderGraphics(object, page, topLeft);
    }
    if (object.type === 'anchor') {
      renderAnchor(object, page, topLeft);
    }
    if (object.type === 'link') {
      renderLink(object, page, bottomLeft);
    }
    if (object.type === 'image') {
      renderImage(object, page, bottomLeft);
    }
  });
  frame.children?.forEach((frame) => {
    renderFrame(frame, page, topLeft);
  });
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}
