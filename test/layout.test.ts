import { beforeEach, describe, expect, it } from '@jest/globals';

import { layoutPage } from '../src/layout.js';
import { fakeFont } from './test-utils.js';

const { objectContaining } = expect;

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

    it('returns a paragraph with a single text row for single text content', () => {
      const content = [{ text: 'Test text' }];

      const frame = layoutPage(content, box, fonts);

      expect(frame).toEqual({
        ...{ type: 'page', ...box },
        children: [
          {
            ...{ type: 'paragraph', x: 0, y: 0, width: 400, height: 18 * 1.2 },
            children: [
              {
                ...{ type: 'row', x: 0, y: 0, width: 162, height: 18 * 1.2 },
                objects: [
                  { type: 'text', x: 0, y: 0, text: 'Test text', font: normalFont, fontSize: 18 },
                ],
              },
            ],
          },
        ],
      });
    });

    it('includes padding around text in paragraph', () => {
      const content = [
        { text: 'foo', padding: { left: 1, right: 2, top: 3, bottom: 4 }, fontSize: 10 },
      ];

      const frame = layoutPage(content, box, fonts);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 0, y: 0, width: 400, height: 12 + 3 + 4 }),
      ]);
      expect(frame.children[0].children).toEqual([
        objectContaining({ type: 'row', x: 1, y: 3, width: 30, height: 12 }),
      ]);
    });

    it('surrounds paragraphs with margins', () => {
      const content = [
        { text: 'foo', margin: { left: 1, right: 2, top: 3, bottom: 4 }, fontSize: 10 },
        { text: 'bar', margin: { left: 5, right: 6, top: 7, bottom: 8 }, fontSize: 10 },
      ];

      const frame = layoutPage(content, box, fonts);

      expect(frame.children).toEqual([
        objectContaining({ type: 'paragraph', x: 1, y: 3, width: 400 - 1 - 2, height: 12 }),
        objectContaining({ type: 'paragraph', x: 5, y: 3 + 12 + 7, width: 400 - 5 - 6 }),
      ]);
    });
  });
});
