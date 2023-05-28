import { beforeEach, describe, expect, it } from '@jest/globals';

import { Size } from '../src/box.js';
import { Image } from '../src/images.js';
import { ImageObject } from '../src/layout-image.js';
import { Page } from '../src/page.js';
import { renderImage } from '../src/render-image.js';
import { fakePDFPage, getContentStream } from './test-utils.js';

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
