import { PDFDocument } from 'pdf-lib';

import { Pos } from '../box.ts';
import { Frame } from '../frame.ts';
import { Page } from '../page.ts';
import { renderAnchor, renderLink } from './render-annotations.ts';
import { renderGraphics } from './render-graphics.ts';
import { renderImage } from './render-image.ts';
import { renderText } from './render-text.ts';

export function renderPage(page: Page, pdfDoc: PDFDocument) {
  page.pdfPage = pdfDoc.addPage([page.size.width, page.size.height]);
  page.header && renderFrame(page.header, page);
  renderFrame(page.content, page);
  page.footer && renderFrame(page.footer, page);
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
