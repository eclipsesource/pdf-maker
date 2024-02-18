import { PDFPage } from 'pdf-lib';
import { beforeEach, describe, expect, it } from 'vitest';

import { Font } from './fonts.js';
import { addPageFont, getExtGraphicsState, Page } from './page.js';
import { fakeFont, fakePDFPage } from './test/test-utils.js';

describe('page', () => {
  let page: Page, pdfPage: PDFPage;

  beforeEach(() => {
    pdfPage = fakePDFPage();
    page = { pdfPage } as Page;
  });

  describe('addPageFont', () => {
    let fontA: Font, fontB: Font;

    beforeEach(() => {
      fontA = fakeFont('fontA', { doc: pdfPage.doc });
      fontB = fakeFont('fontB', { doc: pdfPage.doc });
    });

    it('returns same font for same input', () => {
      const font1 = addPageFont(page, fontA);
      const font2 = addPageFont(page, fontA);

      expect(font1.toString()).toBe('/fontA-1');
      expect(font2).toEqual(font1);
    });

    it('returns different fonts for different inputs', () => {
      const font1 = addPageFont(page, fontA);
      const font2 = addPageFont(page, fontB);

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
