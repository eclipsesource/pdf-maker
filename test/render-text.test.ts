import { beforeEach, describe, expect, it } from '@jest/globals';

import { Size } from '../src/box.js';
import { TextObject } from '../src/layout.js';
import { Page } from '../src/page.js';
import { renderText } from '../src/render-text.js';
import { fakePdfFont, fakePdfPage, getContentStream } from './test-utils.js';

describe('render-text', () => {
  let page: Page, size: Size;
  const font = fakePdfFont('fontA');

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePdfPage();
    page = { size, pdfPage } as Page;
  });

  describe('renderText', () => {
    const pos = { x: 10, y: 20 };

    it('renders single row with single text segment', () => {
      const seg = { text: 'foo', font, fontSize: 10 };
      const obj: TextObject = {
        type: 'text',
        rows: [{ segments: [seg], x: 1, y: 2, width: 30, height: 20, baseline: 8 }],
      };

      renderText(obj, page, pos);

      expect(getContentStream(page)).toEqual([
        'BT',
        '1 0 0 1 11 770 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        'foo Tj',
        'ET',
      ]);
    });

    it('renders text rise', () => {
      const seg1 = { text: 'foo', font, fontSize: 10 };
      const seg2 = { text: 'bar', font, fontSize: 10, rise: 3 };
      const seg3 = { text: 'baz', font, fontSize: 10 };
      const obj: TextObject = {
        type: 'text',
        rows: [{ segments: [seg1, seg2, seg3], x: 1, y: 2, width: 60, height: 12, baseline: 8 }],
      };

      renderText(obj, page, pos);

      expect(getContentStream(page)).toEqual([
        'BT',
        '1 0 0 1 11 770 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        'foo Tj',
        '3 Ts',
        'bar Tj',
        '0 Ts',
        'baz Tj',
        'ET',
      ]);
    });

    it('maintains text state throughout page', () => {
      const obj1: TextObject = {
        type: 'text',
        rows: [
          {
            segments: [{ text: 'foo', font, fontSize: 10, rise: 3 }],
            ...{ x: 1, y: 2, width: 60, height: 12, baseline: 8 },
          },
        ],
      };
      const obj2: TextObject = {
        type: 'text',
        rows: [
          {
            segments: [{ text: 'bar', font, fontSize: 10 }],
            ...{ x: 3, y: 4, width: 60, height: 12, baseline: 8 },
          },
        ],
      };

      renderText(obj1, page, pos);
      renderText(obj2, page, pos);

      expect(getContentStream(page)).toEqual([
        'BT',
        '1 0 0 1 11 770 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        '3 Ts',
        'foo Tj',
        'ET',
        'BT',
        '1 0 0 1 13 768 Tm',
        '0 Ts', // reset text rise
        'bar Tj',
        'ET',
      ]);
    });

    it('renders multiple rows with multiple text segments', () => {
      const seg1 = { text: 'foo', font, fontSize: 10 };
      const seg2 = { text: 'bar', font, fontSize: 10 };
      const obj: TextObject = {
        type: 'text',
        rows: [
          { segments: [seg1, seg2], x: 1, y: 2, width: 60, height: 12, baseline: 8 },
          { segments: [seg1, seg2], x: 1, y: 18, width: 60, height: 12, baseline: 8 },
        ],
      };

      renderText(obj, page, pos);

      expect(getContentStream(page)).toEqual([
        'BT',
        '1 0 0 1 11 770 Tm',
        '0 0 0 rg',
        '/fontA-1 10 Tf',
        'foo Tj',
        'bar Tj',
        '1 0 0 1 11 754 Tm',
        'foo Tj',
        'bar Tj',
        'ET',
      ]);
    });
  });
});
