import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFContext, PDFFont, rgb } from 'pdf-lib';

import { parseEdges } from '../src/box.js';
import { Frame } from '../src/layout.js';
import { createPage, renderFrame } from '../src/page.js';
import { fakePdfFont } from './test-utils.js';

const { objectContaining } = expect;

describe('page', () => {
  describe('createPage', () => {
    let size, margin, pdfPage, doc;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      margin = parseEdges(5);
      doc = { addPage: jest.fn().mockReturnValue(pdfPage) } as any;
    });

    it('creates page and returns wrapper', () => {
      const page = createPage(doc, size, margin, {} as any);

      expect(page).toEqual({ pdfPage, size, margin });
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
        drawLine: jest.fn(),
        drawRectangle: jest.fn(),
        drawSvgPath: jest.fn(),
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
        x: 10 + 1,
        y: 800 - 20 - 2 - 30,
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
        x: 10 + 10 + 1,
        y: 800 - 20 - 20 - 2 - 30,
        size: 12,
        font,
      });
    });

    it('renders link objects', () => {
      jest.spyOn(pdfPage.doc.context, 'obj').mockReturnValue('test-obj');
      jest.spyOn(pdfPage.doc.context, 'register');
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: 'test-url' }],
      };

      renderFrame(frame, page);

      expect(pdfPage.doc.context.obj).toHaveBeenCalledWith({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [10 + 1, 800 - 20 - 2 - 30, 11 + 80, 748 + 20],
        A: { Type: 'Action', S: 'URI', URI: { value: 'test-url' } },
        F: 0,
      });
      expect(pdfPage.doc.context.register).toHaveBeenCalledWith('test-obj');
      expect(page.linkRefs).toEqual([objectContaining({ tag: '1 0 R' })]);
    });

    it('renders rect objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'rect', x: 1, y: 2, width: 3, height: 4 }],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawRectangle).toHaveBeenCalledWith({
        x: 10 + 1,
        y: 800 - 20 - 2 - 4,
        width: 3,
        height: 4,
      });
    });

    it('renders rect objects with style attrs', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [
          {
            ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
            strokeColor: rgb(1, 0, 0),
            strokeWidth: 1,
            fillColor: rgb(0, 0, 1),
          },
        ],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawRectangle).toHaveBeenCalledWith(
        objectContaining({
          borderColor: rgb(1, 0, 0),
          borderWidth: 1,
          color: rgb(0, 0, 1),
        })
      );
    });

    it('renders line objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 }],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawLine).toHaveBeenCalledWith({
        start: { x: 10 + 1, y: 800 - 20 - 2 },
        end: { x: 10 + 3, y: 800 - 20 - 4 },
      });
    });

    it('renders line objects with style attrs', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [
          {
            ...{ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
            strokeWidth: 1,
            strokeColor: rgb(1, 0, 0),
          },
        ],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawLine).toHaveBeenCalledWith(
        objectContaining({
          thickness: 1,
          color: rgb(1, 0, 0),
        })
      );
    });

    it('renders polyline objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'polyline', points: [p(1, 2), p(3, 4)] }],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawSvgPath).toHaveBeenCalledWith('M1,2 L3,4', { x: 10, y: 800 - 20 });
    });

    it('renders polyline objects with closePath', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'polyline', points: [p(1, 2), p(3, 4)], closePath: true }],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawSvgPath).toHaveBeenCalledWith('M1,2 L3,4 Z', expect.anything());
    });

    it('renders polyline objects with style attrs', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [
          {
            ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
            strokeColor: rgb(1, 0, 0),
            strokeWidth: 1,
            fillColor: rgb(0, 0, 1),
          },
        ],
      };

      renderFrame(frame, page);

      expect(pdfPage.drawSvgPath).toHaveBeenCalledWith(
        expect.anything(),
        objectContaining({
          borderColor: rgb(1, 0, 0),
          borderWidth: 1,
          color: rgb(0, 0, 1),
        })
      );
    });
  });
});

function p(x, y) {
  return { x, y };
}
