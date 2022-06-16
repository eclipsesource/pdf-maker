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
};

export function getFont(page: Page, font: PDFFont): PDFName {
  if (!page.fonts) page.fonts = {};
  const refStr = font.ref.toString();
  if (!(refStr in page.fonts)) {
    page.fonts[refStr] = (page.pdfPage as any).node.newFontDictionary(font.name, font.ref);
  }
  return page.fonts[refStr];
}

export function getImage(page: Page, image: PDFImage): PDFName {
  if (!page.images) page.images = {};
  const refStr = image.ref.toString();
  if (!(refStr in page.images)) {
    page.images[refStr] = (page.pdfPage as any).node.newXObject('Image', image.ref);
  }
  return page.images[refStr];
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
