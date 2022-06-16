import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PDFArray, PDFDict, PDFName, PDFRef } from 'pdf-lib';

import { Frame } from '../src/layout.js';
import { getPageFont, getPageGraphicsState, renderFrame, renderPage } from '../src/page.js';
import { fakePdfFont, fakePdfPage } from './test-utils.js';

describe('page', () => {
  let page, pdfPage;

  beforeEach(() => {
    pdfPage = fakePdfPage();
    page = { pdfPage };
  });

  describe('getPageFont', () => {
    let fontA, fontB;

    beforeEach(() => {
      fontA = fakePdfFont('fontA');
      fontB = fakePdfFont('fontB');
    });

    it('returns same font for same input', () => {
      const font1 = getPageFont(page, fontA);
      const font2 = getPageFont(page, fontA);

      expect(font1.toString()).toBe('/fontA-1');
      expect(font2).toEqual(font1);
    });

    it('returns different fonts for different inputs', () => {
      const font1 = getPageFont(page, fontA);
      const font2 = getPageFont(page, fontB);

      expect(font1.toString()).toBe('/fontA-1');
      expect(font2).not.toEqual(font1);
    });
  });

  describe('getPageGraphicsState', () => {
    it('returns same graphics state for same input', () => {
      const name1 = getPageGraphicsState(page, { ca: 0.1, CA: 0.2 });
      const name2 = getPageGraphicsState(page, { ca: 0.1, CA: 0.2 });

      expect(name1.toString()).toBe('/GS-1');
      expect(name2).toEqual(name2);
    });

    it('returns different graphics states for different inputs', () => {
      const name1 = getPageGraphicsState(page, { ca: 0.1, CA: 0.2 });
      const name2 = getPageGraphicsState(page, { ca: 0.2, CA: 0.1 });

      expect(name1.toString()).toBe('/GS-1');
      expect(name2).not.toEqual(name1);
    });
  });

  describe('renderPage', () => {
    let size, doc, contentStream;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      contentStream = pdfPage.getContentStream();
      doc = { pdfDoc: { addPage: jest.fn().mockReturnValue(pdfPage) } as any };
    });

    it('renders content', () => {
      const content: Frame = {
        ...{ x: 50, y: 50, width: 280, height: 300 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 300 }] },
        ],
      };
      const page = { size, content };

      renderPage(page, doc);

      expect(contentStream.toString()).toEqual('q,1 0 0 1 50 350 cm,q,0 0 280 -300 re,f,Q,Q');
    });

    it('renders header', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const header: Frame = {
        ...{ x: 50, y: 20, width: 280, height: 30 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }] },
        ],
      };
      const page = { size, content, header };

      renderPage(page, doc);

      expect(contentStream.toString()).toEqual('q,1 0 0 1 50 380 cm,q,0 0 280 -30 re,f,Q,Q');
    });

    it('renders footer', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const footer: Frame = {
        ...{ x: 50, y: 350, width: 280, height: 30 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }] },
        ],
      };
      const page = { size, content, footer };

      renderPage(page, doc);

      expect(contentStream.toString()).toEqual('q,1 0 0 1 50 50 cm,q,0 0 280 -30 re,f,Q,Q');
    });
  });

  describe('renderFrame', () => {
    let page, size, font, contentStream;

    beforeEach(() => {
      size = { width: 500, height: 800 };
      contentStream = pdfPage.getContentStream();
      page = { size, pdfPage };
      font = fakePdfFont('Test');
    });

    it('renders text objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'text', x: 1, y: 2, text: 'Test text', fontSize: 12, font }],
      };

      renderFrame(frame, page);

      expect(contentStream.toString()).toEqual(
        'BT,0 0 0 rg,/Test-1 12 Tf,1 0 0 1 11 748 Tm,Test text Tj,ET'
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

      // text rendered at (21, 728) instead of (11, 748)
      expect(contentStream.toString()).toEqual(
        'BT,0 0 0 rg,/Test-1 12 Tf,1 0 0 1 21 728 Tm,Test text Tj,ET'
      );
    });

    it('renders named destinations (anchors)', () => {
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
  });
});
