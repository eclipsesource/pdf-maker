import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFContext, PDFFont, rgb } from 'pdf-lib';

import { parseEdges } from '../src/box.js';
import { BoxLengths } from '../src/content.js';
import { Frame } from '../src/layout.js';
import { createPage, renderFrame } from '../src/page.js';
import { fakePdfFont } from './test-utils.js';

const { anything, objectContaining } = expect;

describe('page', () => {
  describe('createPage', () => {
    let size, pdfPage, doc;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      pdfPage = { getSize: () => size };
      doc = { addPage: jest.fn().mockReturnValue(pdfPage) } as any;
    });

    it('creates page and returns wrapper', () => {
      const page = createPage(doc, {} as any);

      expect(page).toEqual({ pdfPage, size, margin: anything() });
    });

    it('includes a default margin of 2cm', () => {
      const page = createPage(doc, {} as any);

      expect(page).toEqual(objectContaining({ margin: parseEdges('2cm') }));
    });

    it('includes margin from document definition', () => {
      const margin: BoxLengths = { left: '1cm', right: '2cm', top: '3cm', bottom: '4cm' };

      const page = createPage(doc, { margin } as any);

      expect(page).toEqual(objectContaining({ margin: parseEdges(margin) }));
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

    it('renders text objects with style attrs', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [
          {
            ...{ type: 'text', x: 1, y: 2, text: 'Test text', fontSize: 12, font },
            color: rgb(1, 0, 0),
          },
        ],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawText).toHaveBeenCalledWith(
        'Test text',
        objectContaining({ color: rgb(1, 0, 0) })
      );
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
