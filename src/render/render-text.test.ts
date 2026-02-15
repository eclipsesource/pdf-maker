import type { PDFFont } from '@ralfstx/pdf-core';
import { PDFPage } from '@ralfstx/pdf-core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Size } from '../box.ts';
import type { TextObject } from '../frame.ts';
import type { Page } from '../page.ts';
import { fakeFont, getContentStream } from '../test/test-utils.ts';
import { renderText } from './render-text.ts';

describe('render-text', () => {
  let page: Page;
  let size: Size;
  let font: PDFFont;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = new PDFPage(size.width, size.height);
    page = { size, pdfPage } as Page;
    font = fakeFont('fontA');
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

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 11 770 Tm',
          '0 0 0 rg',
          '/fontA-normal-400 10 Tf',
          '[<0066006F006F>] TJ',
          'ET',
        ].join('\n'),
      );
    });

    it('renders text rise', () => {
      const s1 = { text: 'aaa', font, fontSize: 10 };
      const s2 = { text: 'bbb', font, fontSize: 10, rise: 3 };
      const s3 = { text: 'ccc', font, fontSize: 10, rise: 3 };
      const s4 = { text: 'ddd', font, fontSize: 10 };
      const obj: TextObject = {
        type: 'text',
        rows: [{ segments: [s1, s2, s3, s4], x: 1, y: 2, width: 60, height: 12, baseline: 8 }],
      };

      renderText(obj, page, pos);

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 11 770 Tm',
          '0 0 0 rg',
          '/fontA-normal-400 10 Tf',
          '[<006100610061>] TJ',
          '3 Ts', // set text rise
          '[<006200620062>] TJ',
          '[<006300630063>] TJ',
          '0 Ts', // reset text rise
          '[<006400640064>] TJ',
          'ET',
        ].join('\n'),
      );
    });

    it('renders letter spacing', () => {
      const seg1 = { text: 'aaa', font, fontSize: 10 };
      const seg2 = { text: 'bbb', font, fontSize: 10, letterSpacing: 3 };
      const seg3 = { text: 'ccc', font, fontSize: 10, letterSpacing: 3 };
      const seg4 = { text: 'ddd', font, fontSize: 10 };
      const obj: TextObject = {
        type: 'text',
        rows: [
          { segments: [seg1, seg2, seg3, seg4], x: 1, y: 2, width: 60, height: 12, baseline: 8 },
        ],
      };

      renderText(obj, page, pos);

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 11 770 Tm',
          '0 0 0 rg',
          '/fontA-normal-400 10 Tf',
          '[<006100610061>] TJ',
          '3 Tc', // set letter spacing
          '[<006200620062>] TJ',
          '[<006300630063>] TJ',
          '0 Tc', // reset letter spacing
          '[<006400640064>] TJ',
          'ET',
        ].join('\n'),
      );
    });

    it('maintains text state throughout page', () => {
      const s1 = { text: 'aaa', font, fontSize: 10, rise: 3 };
      const s2 = { text: 'bbb', font, fontSize: 10, rise: 3 };
      const s3 = { text: 'ccc', font, fontSize: 10 };
      const obj1: TextObject = {
        type: 'text',
        rows: [{ segments: [s1], x: 1, y: 2, width: 60, height: 12, baseline: 8 }],
      };
      const obj2: TextObject = {
        type: 'text',
        rows: [{ segments: [s2], x: 1, y: 2, width: 60, height: 12, baseline: 8 }],
      };
      const obj3: TextObject = {
        type: 'text',
        rows: [{ segments: [s3], x: 3, y: 4, width: 60, height: 12, baseline: 8 }],
      };

      renderText(obj1, page, pos);
      renderText(obj2, page, pos);
      renderText(obj3, page, pos);

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 11 770 Tm',
          '0 0 0 rg',
          '/fontA-normal-400 10 Tf',
          '3 Ts', // set text rise
          '[<006100610061>] TJ',
          'ET',
          'BT',
          '1 0 0 1 11 770 Tm',
          '/fontA-normal-400 10 Tf',
          '[<006200620062>] TJ',
          'ET',
          'BT',
          '1 0 0 1 13 768 Tm',
          '/fontA-normal-400 10 Tf',
          '0 Ts', // reset text rise
          '[<006300630063>] TJ',
          'ET',
        ].join('\n'),
      );
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

      expect(getContentStream(page)).toEqual(
        [
          'BT',
          '1 0 0 1 11 770 Tm',
          '0 0 0 rg',
          '/fontA-normal-400 10 Tf',
          '[<0066006F006F>] TJ',
          '[<006200610072>] TJ',
          '1 0 0 1 11 754 Tm',
          '[<0066006F006F>] TJ',
          '[<006200610072>] TJ',
          'ET',
        ].join('\n'),
      );
    });
  });
});
