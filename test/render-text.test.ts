import { beforeEach, describe, expect, it } from '@jest/globals';

import { TextObject } from '../src/layout.js';
import { renderText } from '../src/render-text.js';
import { fakePdfFont, fakePdfPage } from './test-utils.js';

describe('render-text', () => {
  let page, size, pdfPage;
  const font = fakePdfFont('fontA');

  beforeEach(() => {
    size = { width: 500, height: 800 };
    pdfPage = fakePdfPage();
    page = { size, pdfPage };
  });

  describe('renderText', () => {
    const pos = { x: 10, y: 20 };

    it('renders single text segment', () => {
      const seg = { text: 'foo', font, fontSize: 10 };
      const obj: TextObject = { type: 'text', segments: [seg], x: 1, y: 2 };

      renderText(obj, page, pos);

      expect(pdfPage.getContentStream().map((o) => o?.toString())).toEqual([
        'BT',
        '1 0 0 1 11 778 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        'foo Tj',
        'ET',
      ]);
    });

    it('renders multiple text segments', () => {
      const seg1 = { text: 'foo', font, fontSize: 10 };
      const seg2 = { text: 'bar', font, fontSize: 10 };
      const obj: TextObject = { type: 'text', segments: [seg1, seg2], x: 1, y: 2 };

      renderText(obj, page, pos);

      expect(pdfPage.getContentStream().map((o) => o?.toString())).toEqual([
        'BT',
        '1 0 0 1 11 778 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        'foo Tj',
        'bar Tj',
        'ET',
      ]);
    });
  });
});
