import {
  PDFDocument,
  PDFPage,
  PDFPageDrawImageOptions,
  PDFPageDrawLineOptions,
  PDFPageDrawRectangleOptions,
  PDFPageDrawSVGOptions,
  PDFPageDrawTextOptions,
} from 'pdf-lib';

import { Pos, Size } from './box.js';
import { ImageObject, LineObject, PolylineObject, RectObject } from './graphics.js';
import { renderGuide } from './guides.js';
import { DestObject, Frame, LinkObject, TextObject } from './layout.js';
import { createLinkAnnotation, createNamedDest } from './pdf-annotations.js';

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  guides?: boolean;
  pdfPage?: PDFPage;
};

export function renderPage(page: Page, doc: PDFDocument) {
  page.pdfPage = doc.addPage([page.size.width, page.size.height]);
  renderFrame(page.content, page);
  page.header && renderFrame(page.header, page);
  page.footer && renderFrame(page.footer, page);
}

export function renderFrame(frame: Frame, page: Page, base: Pos = null) {
  const { width, height } = frame;
  const topLeft = { x: frame.x + (base?.x ?? 0), y: frame.y + (base?.y ?? 0) };
  const bottomLeft = { x: topLeft.x, y: topLeft.y + height };
  renderGuide(page, { ...tr(bottomLeft, page), width, height }, frame.type);
  frame.objects?.forEach((object) => {
    if (object.type === 'text') {
      renderText(object, page, bottomLeft);
    }
    if (object.type === 'dest') {
      renderDest(object, page, topLeft);
    }
    if (object.type === 'link') {
      renderLink(object, page, bottomLeft);
    }
    if (object.type === 'rect') {
      renderRect(object, page, topLeft);
    }
    if (object.type === 'line') {
      renderLine(object, page, topLeft);
    }
    if (object.type === 'polyline') {
      renderPolyline(object, page, topLeft);
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

function renderDest(el: DestObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  createNamedDest(page.pdfPage, el.name, { x, y });
}

function renderLink(el: LinkObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  const { width, height, url } = el;
  createLinkAnnotation(page.pdfPage, { x, y, width, height }, url);
}

function renderRect(rect: RectObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: rect.x + base.x, y: rect.y + base.y + rect.height }, page);
  const { width, height } = rect;
  const options: PDFPageDrawRectangleOptions = { x, y, width, height };
  if ('strokeColor' in rect) options.borderColor = rect.strokeColor;
  if ('strokeWidth' in rect) options.borderWidth = rect.strokeWidth;
  if ('fillColor' in rect) options.color = rect.fillColor;
  page.pdfPage.drawRectangle(options);
}

function renderLine(line: LineObject, page: Page, base: Pos) {
  const options: PDFPageDrawLineOptions = {
    start: tr({ x: line.x1 + base.x, y: line.y1 + base.y }, page),
    end: tr({ x: line.x2 + base.x, y: line.y2 + base.y }, page),
  };
  if ('strokeWidth' in line) options.thickness = line.strokeWidth;
  if ('strokeColor' in line) options.color = line.strokeColor;
  page.pdfPage.drawLine(options);
}

function renderPolyline(polyline: PolylineObject, page: Page, base: Pos) {
  const path = createSvgPath(polyline.points, polyline.closePath);
  const { x, y } = tr(base, page);
  const options: PDFPageDrawSVGOptions = { x, y };
  if ('strokeColor' in polyline) options.borderColor = polyline.strokeColor;
  if ('strokeWidth' in polyline) options.borderWidth = polyline.strokeWidth;
  if ('fillColor' in polyline) options.color = polyline.fillColor;
  page.pdfPage.drawSvgPath(path, options);
}

function renderImage(object: ImageObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: object.x + base.x, y: object.y + base.y + object.height }, page);
  const { width, height } = object;
  const options: PDFPageDrawImageOptions = { x, y, width, height };
  page.pdfPage.drawImage(object.image, options);
}

function createSvgPath(points: { x: number; y: number }[], closePath = false): string {
  const z = closePath ? ' Z' : '';
  return points.reduce((s, p) => (s ? `${s} L` : `M`) + `${p.x},${p.y}`, '') + z;
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}
