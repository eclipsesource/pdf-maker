import { PDFPage, PDFPageDrawImageOptions, PDFPageDrawTextOptions } from 'pdf-lib';

import { Pos, Size } from './box.js';
import { Document } from './document.js';
import { renderGuide } from './guides.js';
import { AnchorObject, Frame, LinkObject, TextObject } from './layout.js';
import { ImageObject } from './layout-image.js';
import { createLinkAnnotation, createNamedDest } from './pdf-annotations.js';
import { GraphicsObject } from './read-graphics.js';
import { renderGraphics } from './render-graphics.js';

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  guides?: boolean;
  pdfPage?: PDFPage;
};

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

  const graphicsObjects = frame.objects?.filter(
    (object) => object.type === 'rect' || object.type === 'line' || object.type === 'polyline'
  ) as GraphicsObject[];
  graphicsObjects?.length && renderGraphics(graphicsObjects, page, topLeft);

  frame.objects?.forEach((object) => {
    if (object.type === 'text') {
      renderText(object, page, bottomLeft);
    }
    if (object.type === 'anchor') {
      renderAnchor(object, page, topLeft);
    }
    if (object.type === 'link') {
      renderLink(object, page, bottomLeft);
    }
    if (object.type === 'image') {
      renderImage(object, page, topLeft);
    }
  });
  frame.children?.forEach((frame) => {
    renderFrame(frame, page, topLeft);
  });
}

function renderText(el: TextObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  const options: PDFPageDrawTextOptions = { x, y, size: el.fontSize, font: el.font };
  if (el.color) options.color = el.color;
  page.pdfPage.drawText(el.text, options);
}

function renderAnchor(el: AnchorObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  createNamedDest(page.pdfPage, el.name, { x, y });
}

function renderLink(el: LinkObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  const { width, height, url } = el;
  createLinkAnnotation(page.pdfPage, { x, y, width, height }, url);
}

function renderImage(object: ImageObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: object.x + base.x, y: object.y + base.y + object.height }, page);
  const { width, height } = object;
  const options: PDFPageDrawImageOptions = { x, y, width, height };
  page.pdfPage.drawImage(object.image, options);
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}
