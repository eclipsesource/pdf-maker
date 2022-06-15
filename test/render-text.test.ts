import { beforeEach, describe, expect, it } from '@jest/globals';

import { TextObject } from '../src/layout.js';
import { renderTexts } from '../src/render-text.js';
import { fakePdfFont, fakePdfPage } from './test-utils.js';

describe('render-text', () => {
  let page, size, pdfPage;
  const font = fakePdfFont('fontA');

  beforeEach(() => {
    size = { width: 500, height: 800 };
    pdfPage = fakePdfPage();
    page = { size, pdfPage };
  });

  describe('renderTexts', () => {
    const pos = { x: 10, y: 20 };

    it('renders single text object', () => {
      const obj: TextObject = { type: 'text', text: 'foo', x: 1, y: 2, font, fontSize: 10 };

      renderTexts([obj], page, pos);

      expect(pdfPage.getContentStream().map((o) => o?.toString())).toEqual([
        'BT',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        '1 0 0 1 11 778 Tm',
        'foo Tj',
        'ET',
      ]);
    });

    it('renders multiple text objects', () => {
      const obj1: TextObject = { type: 'text', text: 'foo', x: 1, y: 2, font, fontSize: 10 };
      const obj2: TextObject = { type: 'text', text: 'bar', x: 8, y: 2, font, fontSize: 10 };

      renderTexts([obj1, obj2], page, pos);

      expect(pdfPage.getContentStream().map((o) => o?.toString())).toEqual([
        'BT',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        '1 0 0 1 11 778 Tm',
        'foo Tj',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        '1 0 0 1 18 778 Tm',
        'bar Tj',
        'ET',
      ]);
    });
  });
});
