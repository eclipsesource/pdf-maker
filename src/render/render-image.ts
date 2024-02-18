import {
  drawObject,
  PDFContentStream,
  popGraphicsState,
  pushGraphicsState,
  scale,
  translate,
} from 'pdf-lib';

import { Pos } from '../box.ts';
import { ImageObject } from '../frame.ts';
import { addPageImage, Page } from '../page.ts';
import { compact } from '../utils.ts';

export function renderImage(object: ImageObject, page: Page, base: Pos) {
  const x = base.x + object.x;
  const y = page.size.height - base.y - object.y - object.height;
  const { width, height } = object;
  const contentStream: PDFContentStream = (page.pdfPage as any).getContentStream();
  const name = addPageImage(page, object.image);
  contentStream.push(
    ...compact([
      pushGraphicsState(),
      translate(x, y),
      scale(width, height),
      drawObject(name),
      popGraphicsState(),
    ]),
  );
}
