import {
  drawObject,
  PDFContentStream,
  PDFOperator,
  popGraphicsState,
  pushGraphicsState,
  scale,
  translate,
} from 'pdf-lib';

import { Pos } from './box.js';
import { ImageObject } from './layout-image.js';
import { getPageImage, Page } from './page.js';

export function renderImage(object: ImageObject, page: Page, base: Pos) {
  const x = base.x + object.x;
  const y = page.size.height - base.y - object.y;
  const { width, height } = object;
  const contentStream: PDFContentStream = (page.pdfPage as any).getContentStream();
  const name = getPageImage(page, object.image);
  contentStream.push(
    ...([
      pushGraphicsState(),
      translate(x, y),
      scale(width, height),
      drawObject(name),
      popGraphicsState(),
    ].filter(Boolean) as PDFOperator[])
  );
}
