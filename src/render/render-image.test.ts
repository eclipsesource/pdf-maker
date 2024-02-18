import { beforeEach, describe, expect, it } from 'vitest';

import { Size } from '../box.ts';
import { ImageObject } from '../frame.ts';
import { Image } from '../images.ts';
import { Page } from '../page.ts';
import { fakePDFPage, getContentStream } from '../test/test-utils.ts';
import { renderImage } from './render-image.ts';

describe('render-image', () => {
  let page: Page, size: Size, image: Image;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePDFPage();
    page = { size, pdfPage } as Page;
    image = { pdfRef: 23 } as unknown as Image;
  });

  describe('renderImage', () => {
    const pos = { x: 10, y: 20 };

    it('renders single text object', () => {
      const obj: ImageObject = { type: 'image', image, x: 1, y: 2, width: 30, height: 40 };

      renderImage(obj, page, pos);

      expect(getContentStream(page)).toEqual([
        'q',
        '1 0 0 1 11 738 cm',
        '30 0 0 40 0 0 cm',
        '/Image-23-1 Do',
        'Q',
      ]);
    });
  });
});
