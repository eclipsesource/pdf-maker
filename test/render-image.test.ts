import { beforeEach, describe, expect, it } from '@jest/globals';
import { PDFImage } from 'pdf-lib';

import { Size } from '../src/box.js';
import { ImageObject } from '../src/layout-image.js';
import { Page } from '../src/page.js';
import { renderImage } from '../src/render-image.js';
import { fakePdfPage, getContentStream } from './test-utils.js';

describe('render-image', () => {
  let page: Page, size: Size, image: PDFImage;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePdfPage();
    page = { size, pdfPage } as Page;
    image = { ref: 23 } as unknown as PDFImage;
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
