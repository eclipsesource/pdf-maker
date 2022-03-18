import { PDFDocument, PDFPage, PDFPageDrawTextOptions } from 'pdf-lib';

import { BoxEdges, parseEdges, Pos, Size } from './box.js';
import { DocumentDefinition } from './content.js';
import { renderGuide } from './guides.js';
import { Frame, TextObject } from './layout.js';

const defaultPageMargin = '2cm';

export type Page = {
  pdfPage: PDFPage;
  size: Size;
  margin: BoxEdges;
  guides?: boolean;
};

export function createPage(doc: PDFDocument, def: DocumentDefinition): Page {
  const pdfPage = doc.addPage();
  const size = pdfPage.getSize();
  const margin = parseEdges(def.margin ?? defaultPageMargin);
  return { pdfPage, size, margin, guides: def.dev?.guides };
}

export function renderPage(frame: Frame, page: Page) {
  renderFrame(frame, page);
}

export function renderFrame(frame: Frame, page: Page, base: Pos = null) {
  const { width, height } = frame;
  const topLeft = { x: frame.x + (base?.x ?? 0), y: frame.y + (base?.y ?? 0) };
  const bottomLeft = { x: topLeft.x, y: topLeft.y + height };
  renderGuide(page, { ...tr(bottomLeft, page), width, height }, frame.type);
  frame.children?.forEach((frame) => {
    renderFrame(frame, page, topLeft);
  });
  frame.objects?.forEach((object) => {
    if (object.type === 'text') {
      renderText(object, page, bottomLeft);
    }
  });
}

function renderText(el: TextObject, page: Page, base: Pos) {
  const { x, y } = tr({ x: el.x + base.x, y: el.y + base.y }, page);
  const options: PDFPageDrawTextOptions = { x, y, size: el.fontSize, font: el.font };
  if (el.color) options.color = el.color;
  page.pdfPage.drawText(el.text, options);
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}
