import { beforeEach, describe, expect, it } from 'vitest';

import type { Size } from '../box.ts';
import type { ImageObject } from '../frame.ts';
import type { Image } from '../images.ts';
import type { Page } from '../page.ts';
import { fakePDFPage, getContentStream } from '../test/test-utils.ts';
import { renderImage } from './render-image.ts';

describe('renderImage', () => {
  const pos = { x: 10, y: 20 };
  let page: Page;
  let size: Size;
  let image: Image;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePDFPage();
    page = { size, pdfPage } as Page;
    image = { url: 'test-url' } as unknown as Image;
  });

  it('renders single image object', () => {
    const obj: ImageObject = { type: 'image', image, x: 1, y: 2, width: 30, height: 40 };

    renderImage(obj, page, pos);

    expect(getContentStream(page)).toEqual([
      'q',
      '1 0 0 1 11 738 cm',
      '30 0 0 40 0 0 cm',
      '/Image-1-0-1 Do',
      'Q',
    ]);
  });
});
