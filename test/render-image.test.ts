import { beforeEach, describe, expect, it } from '@jest/globals';

import { ImageObject } from '../src/layout-image.js';
import { renderImage } from '../src/render-image.js';
import { fakePdfPage } from './test-utils.js';

describe('render-image', () => {
  let page, size, pdfPage, image;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    pdfPage = fakePdfPage();
    page = { size, pdfPage };
    image = { ref: 23 };
  });

  describe('renderImage', () => {
    const pos = { x: 10, y: 20 };

    it('renders single text object', () => {
      const obj: ImageObject = { type: 'image', image, x: 1, y: 2, width: 30, height: 40 };

      renderImage(obj, page, pos);

      expect(pdfPage.getContentStream().map((o) => o?.toString())).toEqual([
        'q',
        '1 0 0 1 11 738 cm',
        '30 0 0 40 0 0 cm',
        '/Image-23-1 Do',
        'Q',
      ]);
    });
  });
});
