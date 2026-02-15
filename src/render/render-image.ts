import type { Pos } from '../box.ts';
import type { ImageObject } from '../frame.ts';
import type { Page } from '../page.ts';

export function renderImage(object: ImageObject, page: Page, base: Pos) {
  const x = base.x + object.x;
  const y = page.size.height - base.y - object.y - object.height;
  const { width, height } = object;

  page.pdfPage.contentStream
    .saveGraphicsState()
    .translate(x, y)
    .scale(width, height)
    .drawImage(object.image)
    .restoreGraphicsState();
}
