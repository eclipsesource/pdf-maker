import type { PDFDocument, PDFFont } from '@ralfstx/pdf-core';
import { PDFPage } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Size } from '../box.ts';
import type { Frame } from '../frame.ts';
import type { Page } from '../page.ts';
import { fakeFont, getContentStream } from '../test/test-utils.ts';
import { renderFrame, renderPage } from './render-page.ts';

describe('render-page', () => {
  let pdfPage: PDFPage;

  beforeEach(() => {
    pdfPage = new PDFPage(300, 400);
  });

  describe('renderPage', () => {
    let size: Size;
    let pdfDoc: PDFDocument;

    beforeEach(() => {
      size = { width: 300, height: 400 };
      pdfDoc = { addPage: vi.fn() } as unknown as PDFDocument;
    });

    it('renders content', () => {
      const content: Frame = {
        ...{ x: 50, y: 50, width: 280, height: 300 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 300 }] },
        ],
      };
      const page = { size, content, pdfPage };

      renderPage(page, pdfDoc);

      expect(getContentStream(page)).toEqual(
        ['q', '1 0 0 -1 50 350 cm', 'q', '0 0 280 300 re', 'S', 'Q', 'Q'].join('\n'),
      );
    });

    it('renders header', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const header: Frame = {
        ...{ x: 50, y: 20, width: 280, height: 30 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }] },
        ],
      };
      const page = { size, content, header, pdfPage };

      renderPage(page, pdfDoc);

      expect(getContentStream(page)).toEqual(
        ['q', '1 0 0 -1 50 380 cm', 'q', '0 0 280 30 re', 'S', 'Q', 'Q'].join('\n'),
      );
    });

    it('renders footer', () => {
      const content = { x: 50, y: 50, width: 280, height: 300 };
      const footer: Frame = {
        ...{ x: 50, y: 350, width: 280, height: 30 },
        objects: [
          { type: 'graphics', shapes: [{ type: 'rect', x: 0, y: 0, width: 280, height: 30 }] },
        ],
      };
      const page = { size, content, footer, pdfPage };

      renderPage(page, pdfDoc);

      expect(getContentStream(page)).toEqual(
        ['q', '1 0 0 -1 50 50 cm', 'q', '0 0 280 30 re', 'S', 'Q', 'Q'].join('\n'),
      );
    });
  });

  describe('renderFrame', () => {
    let page: Page;
    let size: Size;
    let font: PDFFont;

    beforeEach(() => {
      size = { width: 500, height: 800 };
      page = { size, pdfPage } as Page;
      font = fakeFont('Test');
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

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 15 762 Tm',
          '0 0 0 rg',
          '/Test-normal-400 12 Tf',
          '[<005400650073007400200074006500780074>] TJ',
          'ET',
        ].join('\n'),
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
      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 25 742 Tm',
          '0 0 0 rg',
          '/Test-normal-400 12 Tf',
          '[<005400650073007400200074006500780074>] TJ',
          'ET',
        ].join('\n'),
      );
    });

    it('renders named destinations (anchors)', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'anchor', x: 1, y: 2, name: 'test-dest' }],
      };

      renderFrame(frame, page);

      expect([...page.pdfPage.destinations()]).toEqual([{ name: 'test-dest', x: 11, y: 778 }]);
    });

    it('renders link objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: 'test-url' }],
      };

      renderFrame(frame, page);

      expect([...page.pdfPage.links()]).toEqual([
        {
          height: 20,
          type: 'url',
          url: 'test-url',
          width: 80,
          x: 11,
          y: 758,
        },
      ]);
    });

    it('renders internal link objects', () => {
      const frame: Frame = {
        ...{ x: 10, y: 20, width: 200, height: 30 },
        objects: [{ type: 'link', x: 1, y: 2, width: 80, height: 20, url: '#test-id' }],
      };

      renderFrame(frame, page);

      expect([...page.pdfPage.links()]).toEqual([
        {
          type: 'destination',
          x: 11,
          y: 758,
          width: 80,
          height: 20,
          destination: 'test-id',
        },
      ]);
    });
  });
});
