import type { PDFDocument } from '@ralfstx/pdf-core';

import type { Pos } from '../box.ts';
import type { AnchorObject, Frame, LinkObject } from '../frame.ts';
import type { Page } from '../page.ts';
import { renderGraphics } from './render-graphics.ts';
import { renderImage } from './render-image.ts';
import { renderText } from './render-text.ts';

export function renderPage(page: Page, pdfDoc: PDFDocument) {
  pdfDoc.addPage(page.pdfPage);
  if (page.header) renderFrame(page.header, page);
  renderFrame(page.content, page);
  if (page.footer) renderFrame(page.footer, page);
}

export function renderFrame(frame: Frame, page: Page, base?: Pos) {
  const topLeft = { x: frame.x + (base?.x ?? 0), y: frame.y + (base?.y ?? 0) };
  frame.objects?.forEach((object) => {
    if (object.type === 'graphics') {
      renderGraphics(object, page, topLeft);
    }
    if (object.type === 'text') {
      renderText(object, page, topLeft);
    }
    if (object.type === 'anchor') {
      renderAnchor(object, page, topLeft);
    }
    if (object.type === 'link') {
      renderLink(object, page, topLeft);
    }
    if (object.type === 'image') {
      renderImage(object, page, topLeft);
    }
  });
  frame.children?.forEach((frame) => {
    renderFrame(frame, page, topLeft);
  });
}

function renderAnchor(obj: AnchorObject, page: Page, base: Pos) {
  const name = obj.name;
  const x = base.x + obj.x;
  const y = page.size.height - base.y - obj.y;
  page.pdfPage.addDestination({ name, x, y });
}

function renderLink(obj: LinkObject, page: Page, base: Pos) {
  const { width, height, url } = obj;
  const x = base.x + obj.x;
  const y = page.size.height - base.y - obj.y - height;
  if (url.startsWith('#')) {
    // Internal link
    page.pdfPage.addLink({ type: 'destination', x, y, width, height, destination: url.slice(1) });
  } else {
    // External link
    page.pdfPage.addLink({ type: 'url', x, y, width, height, url });
  }
}
