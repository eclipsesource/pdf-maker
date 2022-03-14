import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutPage } from '../src/layout.js';
import { fakeFont } from './test-utils.js';

describe('layout', () => {
  let fonts, normalFont, box;

  beforeEach(() => {
    fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    [normalFont] = fonts.map((f) => f.pdfFont);
    box = { x: 20, y: 30, width: 400, height: 700 };
  });
  describe('layoutPage', () => {
    it('returns empty page frame for empty content', () => {
      const frame = layoutPage([], box, fonts);

      expect(frame).toEqual({ type: 'page', ...box, children: [] });
    });

    it('returns a page with a single text row for single text content', () => {
      const content = [{ text: 'Test text' }];

      const frame = layoutPage(content, box, fonts);

      expect(frame).toEqual({
        ...{ type: 'page', ...box },
        children: [
          {
            ...{ type: 'row', x: 0, y: 0, width: 162, height: 18 * 1.2 },
            objects: [
              { type: 'text', x: 0, y: 0, text: 'Test text', font: normalFont, fontSize: 18 },
            ],
          },
        ],
      });
    });
  });
});
