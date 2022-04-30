import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFArray, PDFContext, PDFDict, PDFFont, PDFName, PDFRef, rgb } from 'pdf-lib';

import { Frame } from '../src/layout.js';
import { renderFrame, renderPage } from '../src/page.js';
import { fakePdfFont } from './test-utils.js';

const { objectContaining } = expect;

describe('page', () => {
  describe('renderPage', () => {
    let size, pdfPage, doc;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      pdfPage = { drawRectangle: jest.fn() };
      doc = { addPage: jest.fn().mockReturnValue(pdfPage) } as any;
    });

    it('renders content', () => {
      const content: Frame = {
        ...{ x: 50, y: 50, width: 280, height: 300 },
        objects: [{ type: 'rect', x: 0, y: 0, width: 280, height: 300 }],
      };
      const page = { size, content };

      renderPage(page, doc);

      expect(pdfPage.drawRectangle).toHaveBeenCalledWith(
        objectContaining({ x: 50, y: 50, width: 280, height: 300 })
      );
    });

    it('renders header', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const header: Frame = {
        ...{ x: 50, y: 20, width: 280, height: 30 },
        objects: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }],
      };
      const page = { size, content, header };

      renderPage(page, doc);

      expect(pdfPage.drawRectangle).toHaveBeenCalledWith(
        objectContaining({ x: 50, y: 350, width: 280, height: 30 })
      );
    });

    it('renders footer', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const footer: Frame = {
        ...{ x: 50, y: 350, width: 280, height: 30 },
        objects: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }],
      };
      const page = { size, content, footer };

      renderPage(page, doc);

      expect(pdfPage.drawRectangle).toHaveBeenCalledWith(
        objectContaining({ x: 50, y: 20, width: 280, height: 30 })
      );
    });
  });

  describe('renderFrame', () => {
    let page, size, pdfPage, font: PDFFont;

    beforeEach(() => {
      size = { width: 500, height: 800 };
      const context = PDFContext.create();
      pdfPage = {
        doc: { context, catalog: context.obj({}) },
        ref: PDFRef.of(1),
        node: context.obj({}),
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

    it('renders named destinations', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'anchor', x: 1, y: 2, name: 'test-dest' }],
      };

      renderFrame(frame, page);

      const names = pdfPage.doc.catalog
        .get(PDFName.of('Names'))
        .get(PDFName.of('Dests'))
        .get(PDFName.of('Names'));
      expect(names).toBeInstanceOf(PDFArray);
      expect(names.toString()).toEqual('[ (test-dest) [ 1 0 R /XYZ 11 778 null ] ]');
    });

    it('renders link objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: 'test-url' }],
      };

      renderFrame(frame, page);

      const pageAnnotations = pdfPage.node.get(PDFName.of('Annots'));
      expect(pageAnnotations).toBeInstanceOf(PDFArray);
      expect(pageAnnotations.size()).toBe(1);
      const ref = pageAnnotations.get(0);
      expect(ref).toBeInstanceOf(PDFRef);
      const annotation = pdfPage.doc.context.indirectObjects.get(ref);
      expect(annotation.toString()).toEqual(
        [
          '<<',
          '/Type /Annot',
          '/Subtype /Link',
          '/Rect [ 11 748 91 768 ]', // [10 + 1, 800 - 20 - 2 - 30, 11 + 80, 748 + 20]
          '/A <<',
          '/Type /Action',
          '/S /URI',
          '/URI (test-url)',
          '>>',
          '/C [ ]',
          '/F 0',
          '>>',
        ].join('\n')
      );
    });

    it('renders internal link objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: '#test-id' }],
      };

      renderFrame(frame, page);

      const pageAnnotations = pdfPage.node.get(PDFName.of('Annots'));
      expect(pageAnnotations).toBeInstanceOf(PDFArray);
      expect(pageAnnotations.size()).toBe(1);
      const annotation = pdfPage.doc.context.lookup(pageAnnotations.get(0)) as PDFDict;
      expect(annotation).toBeInstanceOf(PDFDict);
      expect(annotation.toString()).toEqual(
        [
          '<<',
          '/Type /Annot',
          '/Subtype /Link',
          '/Rect [ 11 748 91 768 ]', // [10 + 1, 800 - 20 - 2 - 30, 11 + 80, 748 + 20]
          '/A <<',
          '/Type /Action',
          '/S /GoTo',
          '/D (test-id)',
          '>>',
          '/C [ ]',
          '/F 0',
          '>>',
        ].join('\n')
      );
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
