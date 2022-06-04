import { beforeEach, describe, expect, it } from '@jest/globals';

import { Alignment } from '../src/content.js';
import { layoutParagraph } from '../src/layout-text.js';
import { paperSizes } from '../src/page-sizes.js';
import { TextAttrs, TextSpan } from '../src/text.js';
import { fakeFont } from './test-utils.js';

const { objectContaining } = expect;

describe('layout', () => {
  let box, doc;

  beforeEach(() => {
    const fonts = [fakeFont('Test'), fakeFont('Test', { italic: true })];
    box = { x: 20, y: 30, width: 400, height: 700 };
    doc = { fonts, pageSize: paperSizes.A4 };
  });

  describe('layoutParagraph', () => {
    it('creates paragraph with intrinsic size', () => {
      const text = [{ text: 'foo', attrs: { fontSize: 10 } }];
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { text, padding };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual(
        objectContaining({ type: 'text', x: 20, y: 30, width: 400, height: 22 })
      );
    });

    it('creates paragraph with fixed size', () => {
      const padding = { left: 5, right: 5, top: 5, bottom: 5 };
      const paragraph = { padding, width: 80, height: 50 };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual({ type: 'text', x: 20, y: 30, width: 80, height: 50 });
    });

    it('raises text by font descent', () => {
      const paragraph = { text: [span('Test text', { fontSize: 10 })] };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children).toEqual([objectContaining({ type: 'row', y: 0, height: 12 })]);
      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', y: -3, fontSize: 10 }),
      ]);
    });

    it('raises text segments with different font size to common baseline', () => {
      const paragraph = {
        text: [
          span('Text one', { fontSize: 5 }),
          span('Text two', { fontSize: 10 }),
          span('Text three', { fontSize: 15 }),
        ],
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children).toEqual([objectContaining({ type: 'row', y: 0, height: 18 })]);
      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', y: -4.5, fontSize: 5 }),
        objectContaining({ type: 'text', y: -4.5, fontSize: 10 }),
        objectContaining({ type: 'text', y: -4.5, fontSize: 15 }),
      ]);
    });

    it('includes padding around text in paragraph', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = { text, padding: { left: 1, right: 2, top: 3, bottom: 4 } };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame).toEqual(objectContaining({ type: 'text', width: 400, height: 12 + 3 + 4 }));
      expect(frame.children).toEqual([
        objectContaining({ type: 'row', x: 1, y: 3, width: 30, height: 12 }),
      ]);
    });

    it('align texts in paragraph to right', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = {
        text,
        textAlign: 'right' as Alignment,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children).toEqual([
        objectContaining({ type: 'row', x: 400 - 30 - 25, y: 0, width: 30, height: 12 }),
      ]);
    });

    it('align texts in paragraphs to center', () => {
      const text = [span('foo', { fontSize: 10 })];
      const paragraph = {
        text,
        textAlign: 'center' as Alignment,
        margin: { left: 10, right: 20, top: 0, bottom: 0 },
        padding: { left: 15, right: 25, top: 0, bottom: 0 },
      };
      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children).toEqual([
        objectContaining({
          type: 'row',
          x: (400 - 30 - 25 + 15) / 2,
          y: 0,
          width: 30,
          height: 12,
        }),
      ]);
    });

    it('creates link objects', () => {
      const paragraph = {
        text: [span('foo', { link: 'test-link', fontSize: 10 })],
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', x: 0, y: -3, text: 'foo' }),
        objectContaining({ type: 'link', x: 0, y: 0, width: 30, height: 10, url: 'test-link' }),
      ]);
    });

    it('merges adjacent link objects', () => {
      const paragraph = {
        text: [
          span('foo ', { link: 'test-link', fontSize: 10 }),
          span('bar', { italic: true, link: 'test-link', fontSize: 10 }),
        ],
      };

      const frame = layoutParagraph(paragraph, box, doc);

      expect(frame.children[0].objects).toEqual([
        objectContaining({ type: 'text', x: 0, y: -3, text: 'foo ' }),
        objectContaining({ type: 'text', x: 40, y: -3, text: 'bar' }),
        objectContaining({ type: 'link', x: 0, y: 0, width: 70, height: 10, url: 'test-link' }),
      ]);
    });
  });
});

function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { ...attrs } };
}
