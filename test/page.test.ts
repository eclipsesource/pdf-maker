import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFContext, PDFFont } from 'pdf-lib';

import { Frame } from '../src/layout.js';
import { createPage, renderFrame } from '../src/page.js';
import { fakePdfFont } from './test-utils.js';

describe('page', () => {
  describe('createPage', () => {
    it('creates page and return wrapper', () => {
      const size = { width: 300, height: 400 };
      const pdfPage = { getSize: () => size };
      const doc = { addPage: jest.fn().mockReturnValue(pdfPage) } as any;

      const page = createPage(doc);

      expect(page).toEqual({ pdfPage, size });
    });
  });

  describe('renderFrame', () => {
    let page, size, pdfPage, font: PDFFont;

    beforeEach(() => {
      size = { width: 500, height: 800 };
      pdfPage = {
        doc: {
          context: PDFContext.create(),
        },
        drawText: jest.fn(),
      };
      page = { size, pdfPage };
      font = fakePdfFont('Test');
    });

    it('renders text objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'text', x: 1, y: 2, text: 'Test text', fontSize: 12, font }],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawText).toHaveBeenCalledWith('Test text', {
        x: 11, // 10 + 1
        y: 748, // 800 - 20 - 2 - 30
        size: 12,
        font,
      });
    });

    it('renders children relative to parent frame', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 100 },
        children: [
          {
            ...{ x: 10, y: 20, width: 80, height: 30 },
            objects: [{ type: 'text', x: 1, y: 2, text: 'Test text', fontSize: 12, font }],
          },
        ],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawText).toHaveBeenCalledWith('Test text', {
        x: 21, // 10 + 10 + 1
        y: 728, // 800 - 20 - 20 - 2 - 30
        size: 12,
        font,
      });
    });
  });
});
