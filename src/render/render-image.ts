import type { Pos } from '../box.ts';
import type { ImageObject } from '../frame.ts';
import { isSvgImage } from '../image-loader.ts';
import type { Page } from '../page.ts';

export function renderImage(object: ImageObject, page: Page, base: Pos) {
  const x = base.x + object.x;
  const y = page.size.height - base.y - object.y - object.height;
  const { image, width, height } = object;

  const contentStream = page.pdfPage.contentStream;
  contentStream.saveGraphicsState().translate(x, y);
  if (isSvgImage(image)) {
    // A form XObject is drawn at its intrinsic size, unlike an image,
    // which is drawn into the unit square.
    contentStream.scale(width / image.width, height / image.height).drawXObject(image.xobject);
  } else {
    contentStream.scale(width, height).drawImage(image);
  }
  contentStream.restoreGraphicsState();
}
