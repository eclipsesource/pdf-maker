import { type PDFImage, PDFPage } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Size } from '../box.ts';
import type { ImageObject } from '../frame.ts';
import type { Page } from '../page.ts';
import { fakeImage, fakeSvgImage, getContentStream } from '../test/test-utils.ts';
import { renderImage } from './render-image.ts';

describe('renderImage', () => {
  const pos = { x: 10, y: 20 };
  let page: Page;
  let size: Size;
  let image: PDFImage;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = new PDFPage(size.width, size.height);
    page = { size, pdfPage } as Page;
    image = fakeImage(100, 150);
  });

  it('renders single image object', () => {
    const obj: ImageObject = { type: 'image', image, x: 1, y: 2, width: 30, height: 40 };

    renderImage(obj, page, pos);

    expect(getContentStream(page)).toEqual(
      ['q', '1 0 0 1 11 738 cm', '30 0 0 40 0 0 cm', '/image:100x150-43348634 Do', 'Q'].join('\n'),
    );
  });

  it('renders SVG image object scaled to its intrinsic size', () => {
    const svgImage = fakeSvgImage(100, 150);
    const obj: ImageObject = {
      type: 'image',
      image: svgImage,
      x: 1,
      y: 2,
      width: 30,
      height: 40,
    };

    renderImage(obj, page, pos);

    expect(getContentStream(page)).toEqual(
      [
        'q',
        '1 0 0 1 11 738 cm',
        '0.3 0 0 0.26666667 0 0 cm',
        `/${svgImage.xobject.key} Do`,
        'Q',
      ].join('\n'),
    );
  });
});
