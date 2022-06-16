import { Pos } from './box.js';
import { Document } from './document.js';
import { Frame, TextObject } from './layout.js';
import { Page } from './page.js';
import { renderAnchor, renderLink } from './render-annotations.js';
import { renderGraphics } from './render-graphics.js';
import { renderImage } from './render-image.js';
import { renderTexts } from './render-text.js';

export function renderPage(page: Page, doc: Document) {
  page.pdfPage = doc.pdfDoc.addPage([page.size.width, page.size.height]);
  renderFrame(page.content, page);
  page.header && renderFrame(page.header, page);
  page.footer && renderFrame(page.footer, page);
}

export function renderFrame(frame: Frame, page: Page, base: Pos = null) {
  const topLeft = { x: frame.x + (base?.x ?? 0), y: frame.y + (base?.y ?? 0) };
  const bottomLeft = { x: topLeft.x, y: topLeft.y + frame.height };

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
