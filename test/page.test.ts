import { beforeEach, describe, expect, it } from '@jest/globals';
import { PDFFont, PDFPage } from 'pdf-lib';

import { getExtGraphicsState, getPageFont, Page } from '../src/page.js';
import { fakePdfFont, fakePdfPage } from './test-utils.js';

describe('page', () => {
  let page: Page, pdfPage: PDFPage;

  beforeEach(() => {
    pdfPage = fakePdfPage();
    page = { pdfPage } as Page;
  });

  describe('getPageFont', () => {
    let fontA: PDFFont, fontB: PDFFont;

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

  describe('getExtGraphicsState', () => {
    it('returns same graphics state for same input', () => {
      const name1 = getExtGraphicsState(page, { ca: 0.1, CA: 0.2 });
      const name2 = getExtGraphicsState(page, { ca: 0.1, CA: 0.2 });

      expect(name1.toString()).toBe('/GS-1');
      expect(name2).toEqual(name2);
    });

    it('returns different graphics states for different inputs', () => {
      const name1 = getExtGraphicsState(page, { ca: 0.1, CA: 0.2 });
      const name2 = getExtGraphicsState(page, { ca: 0.2, CA: 0.1 });

      expect(name1.toString()).toBe('/GS-1');
      expect(name2).not.toEqual(name1);
    });
  });
});
