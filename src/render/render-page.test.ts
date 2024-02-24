import type { PDFDocument, PDFPage } from 'pdf-lib';
import { PDFArray, PDFDict, PDFName, PDFRef } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Size } from '../box.ts';
import type { Font } from '../fonts.ts';
import type { Frame } from '../frame.ts';
import type { Page } from '../page.ts';
import { fakeFont, fakePDFPage, getContentStream } from '../test/test-utils.ts';
import { renderFrame, renderPage } from './render-page.ts';

describe('render-page', () => {
  let pdfPage: PDFPage;

  beforeEach(() => {
    pdfPage = fakePDFPage();
  });

  describe('renderPage', () => {
    let size: Size, pdfDoc: PDFDocument;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      pdfDoc = { addPage: vi.fn().mockReturnValue(pdfPage) } as unknown as PDFDocument;
    });

    it('renders content', () => {
      const content: Frame = {
        ...{ x: 50, y: 50, width: 280, height: 300 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 300 }] },
        ],
      };
      const page = { size, content };

      renderPage(page, pdfDoc);

      expect(getContentStream(page).join()).toEqual('q,1 0 0 -1 50 350 cm,q,0 0 280 300 re,S,Q,Q');
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

      renderPage(page, pdfDoc);

      expect(getContentStream(page).join()).toEqual('q,1 0 0 -1 50 380 cm,q,0 0 280 30 re,S,Q,Q');
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

      renderPage(page, pdfDoc);

      expect(getContentStream(page).join()).toEqual('q,1 0 0 -1 50 50 cm,q,0 0 280 30 re,S,Q,Q');
    });
  });

  describe('renderFrame', () => {
    let page: Page, size: Size, font: Font;

    beforeEach(() => {
      size = { width: 500, height: 800 };
      page = { size, pdfPage } as Page;
      font = fakeFont('Test', { doc: pdfPage.doc });
    });

    it('renders text objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [
          {
            type: 'text',
            rows: [
              {
                x: 5,
                y: 10,
                width: 90,
                height: 14,
                baseline: 8,
                segments: [{ text: 'Test text', fontSize: 12, font }],
              },
            ],
          },
        ],
      };

      renderFrame(frame, page);

      expect(getContentStream(page).join()).toEqual(
        'BT,1 0 0 1 15 762 Tm,0 0 0 rg,/Test-1 12 Tf,Test text Tj,ET',
      );
    });

    it('renders children relative to parent frame', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 100 },
        children: [
          {
            ...{ x: 10, y: 20, width: 80, height: 30 },
            objects: [
              {
                type: 'text',
                rows: [
                  {
                    x: 5,
                    y: 10,
                    width: 90,
                    height: 14,
                    baseline: 8,
                    segments: [{ text: 'Test text', fontSize: 12, font }],
                  },
                ],
              },
            ],
          },
        ],
      };

      renderFrame(frame, page);

      // text rendered at (25, 750) + (10, 20)
      expect(getContentStream(page).join()).toEqual(
        'BT,1 0 0 1 25 742 Tm,0 0 0 rg,/Test-1 12 Tf,Test text Tj,ET',
      );
    });

    it('renders named destinations (anchors)', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'anchor', x: 1, y: 2, name: 'test-dest' }],
      };

      renderFrame(frame, page);

      const names = (pdfPage.doc.catalog as any)
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

      const pageAnnotations = pdfPage.node.get(PDFName.of('Annots')) as PDFArray;
      expect(pageAnnotations).toBeInstanceOf(PDFArray);
      expect(pageAnnotations.size()).toBe(1);
      const ref = pageAnnotations.get(0);
      expect(ref).toBeInstanceOf(PDFRef);
      const annotation = (pdfPage.doc.context as any).indirectObjects.get(ref);
      expect(annotation.toString()).toEqual(
        [
          '<<',
          '/Type /Annot',
          '/Subtype /Link',
          '/Rect [ 11 758 91 778 ]', // [10 + 1, 800 - 20 - 20 - 2, 11 + 80, 800 - 20 - 2]
          '/A <<',
          '/Type /Action',
          '/S /URI',
          '/URI (test-url)',
          '>>',
          '/C [ ]',
          '/F 4',
          '>>',
        ].join('\n'),
      );
    });

    it('renders internal link objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: '#test-id' }],
      };

      renderFrame(frame, page);

      const pageAnnotations = pdfPage.node.get(PDFName.of('Annots')) as PDFArray;
      expect(pageAnnotations).toBeInstanceOf(PDFArray);
      expect(pageAnnotations.size()).toBe(1);
      const annotation = pdfPage.doc.context.lookup(pageAnnotations.get(0)) as PDFDict;
      expect(annotation).toBeInstanceOf(PDFDict);
      expect(annotation.toString()).toEqual(
        [
          '<<',
          '/Type /Annot',
          '/Subtype /Link',
          '/Rect [ 11 758 91 778 ]', // [10 + 1, 800 - 20 - 20 - 2, 11 + 80, 800 - 20 - 2]
          '/A <<',
          '/Type /Action',
          '/S /GoTo',
          '/D (test-id)',
          '>>',
          '/C [ ]',
          '/F 4',
          '>>',
        ].join('\n'),
      );
    });
  });
});
