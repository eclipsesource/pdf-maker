import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { LineObject, PolylineObject, RectObject } from '../src/read-graphics.js';
import { renderGraphics } from '../src/render-graphics.js';

describe('render-graphics', () => {
  let page, size, pdfPage, contentStream;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    contentStream = [];
    pdfPage = {
      getContentStream: () => contentStream,
    };
    page = { size, pdfPage };
  });

  describe('renderGraphics', () => {
    const pos = { x: 10, y: 20 };
    const head = ['q', '1 0 0 1 10 780 cm', 'q'];
    const tail = ['Q', 'Q'];

    it('renders line without strokeColor', () => {
      const line: LineObject = { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 };

      renderGraphics([line], page, pos);

      expect(contentStream.map((o) => o?.toString())).toEqual([
        ...head,
        '1 -2 m',
        '3 -4 l',
        'S',
        ...tail,
      ]);
    });

    it('renders line with all attributes', () => {
      const line: LineObject = {
        ...{ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
        strokeColor: rgb(1, 0, 0),
        strokeWidth: 1,
        lineCap: 'round',
      };

      renderGraphics([line], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 0 0 RG',
        '1 w',
        '1 J',
        '1 -2 m',
        '3 -4 l',
        'S',
        ...tail,
      ]);
    });

    it('renders rect without color attributes', () => {
      const rect: RectObject = { type: 'rect', x: 1, y: 2, width: 3, height: 4 };

      renderGraphics([rect], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 -2 3 -4 re',
        'f',
        ...tail,
      ]);
    });

    it('renders rect with fillColor', () => {
      const rect: RectObject = {
        ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
        fillColor: rgb(1, 0, 0),
      };

      renderGraphics([rect], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 0 0 rg',
        '1 -2 3 -4 re',
        'f',
        ...tail,
      ]);
    });

    it('renders rect with strokeColor', () => {
      const rect: RectObject = {
        ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
        strokeColor: rgb(1, 0, 0),
      };

      renderGraphics([rect], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 0 0 RG',
        '1 -2 3 -4 re',
        'S',
        ...tail,
      ]);
    });

    it('renders rect with all attributes', () => {
      const rect: RectObject = {
        ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
        fillColor: rgb(0, 0, 1),
        strokeColor: rgb(1, 0, 0),
        strokeWidth: 1,
        lineJoin: 'round',
      };

      renderGraphics([rect], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '0 0 1 rg',
        '1 0 0 RG',
        '1 w',
        '1 j',
        '1 -2 3 -4 re',
        'B',
        ...tail,
      ]);
    });

    it('renders polyline without color attributes', () => {
      const polyline: PolylineObject = { type: 'polyline', points: [p(1, 2), p(3, 4)] };

      renderGraphics([polyline], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 -2 m',
        '3 -4 l',
        'f',
        ...tail,
      ]);
    });

    it('renders polyline with closePath', () => {
      const polyline: PolylineObject = {
        type: 'polyline',
        points: [p(1, 2), p(3, 4)],
        closePath: true,
      };

      renderGraphics([polyline], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '1 -2 m',
        '3 -4 l',
        'h',
        'f',
        ...tail,
      ]);
    });

    it('renders polyline with all attributes', () => {
      const polyline: PolylineObject = {
        ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
        fillColor: rgb(0, 0, 1),
        strokeColor: rgb(1, 0, 0),
        strokeWidth: 1,
        lineCap: 'round',
        lineJoin: 'round',
      };

      renderGraphics([polyline], page, pos);

      expect(contentStream.map((o) => o.toString())).toEqual([
        ...head,
        '0 0 1 rg',
        '1 0 0 RG',
        '1 w',
        '1 J',
        '1 j',
        '1 -2 m',
        '3 -4 l',
        'B',
        ...tail,
      ]);
    });
  });
});

function p(x, y) {
  return { x, y };
}
