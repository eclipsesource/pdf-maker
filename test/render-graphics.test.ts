import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { Size } from '../src/box.js';
import { Page } from '../src/page.js';
import { CircleObject, LineObject, PolylineObject, RectObject } from '../src/read-graphics.js';
import { renderGraphics } from '../src/render-graphics.js';
import { fakePdfPage, getContentStream, p } from './test-utils.js';

describe('render-graphics', () => {
  let page: Page, size: Size;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePdfPage();
    page = { size, pdfPage } as Page;
  });

  describe('renderGraphics', () => {
    const pos = { x: 10, y: 20 };
    const head = ['q', '1 0 0 -1 10 780 cm', 'q'];
    const tail = ['Q', 'Q'];

    describe('with rect', () => {
      it('renders rect without color attributes', () => {
        const rect: RectObject = { type: 'rect', x: 1, y: 2, width: 3, height: 4 };

        renderGraphics({ type: 'graphics', shapes: [rect] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 2 3 4 re', 'f', ...tail]);
      });

      it('renders rect with fillColor', () => {
        const rect: RectObject = {
          ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
          fillColor: rgb(1, 0, 0),
        };

        renderGraphics({ type: 'graphics', shapes: [rect] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 0 0 rg', '1 2 3 4 re', 'f', ...tail]);
      });

      it('renders rect with lineColor', () => {
        const rect: RectObject = {
          ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
          lineColor: rgb(1, 0, 0),
        };

        renderGraphics({ type: 'graphics', shapes: [rect] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 0 0 RG', '1 2 3 4 re', 'S', ...tail]);
      });

      it('renders rect with all attributes', () => {
        const rect: RectObject = {
          ...{ type: 'rect', x: 1, y: 2, width: 3, height: 4 },
          fillColor: rgb(0, 0, 1),
          lineColor: rgb(1, 0, 0),
          lineWidth: 1,
          lineJoin: 'round',
          fillOpacity: 0.5,
          lineOpacity: 0.5,
        };

        renderGraphics({ type: 'graphics', shapes: [rect] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '/GS-1 gs',
          '0 0 1 rg',
          '1 0 0 RG',
          '1 w',
          '1 j',
          '1 2 3 4 re',
          'B',
          ...tail,
        ]);
      });
    });

    describe('with circle', () => {
      it('renders circle without style attributes', () => {
        const circle: CircleObject = { type: 'circle', cx: 1, cy: 2, r: 3 };

        renderGraphics({ type: 'graphics', shapes: [circle] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '-2 2 m',
          '-2 0.3431457505076194 -0.6568542494923806 -1 1 -1 c',
          '2.6568542494923806 -1 4 0.3431457505076194 4 2 c',
          '4 3.6568542494923806 2.6568542494923806 5 1 5 c',
          '-0.6568542494923806 5 -2 3.6568542494923806 -2 2 c',
          'f',
          ...tail,
        ]);
      });

      it('renders circle with all attributes', () => {
        const circle: CircleObject = {
          ...{ type: 'circle', cx: 1, cy: 2, r: 3 },
          fillColor: rgb(0, 0, 1),
          lineColor: rgb(1, 0, 0),
          lineWidth: 1,
          lineJoin: 'round',
          fillOpacity: 0.5,
          lineOpacity: 0.5,
        };

        renderGraphics({ type: 'graphics', shapes: [circle] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '/GS-1 gs',
          '0 0 1 rg',
          '1 0 0 RG',
          '1 w',
          '1 j',
          '-2 2 m',
          '-2 0.3431457505076194 -0.6568542494923806 -1 1 -1 c',
          '2.6568542494923806 -1 4 0.3431457505076194 4 2 c',
          '4 3.6568542494923806 2.6568542494923806 5 1 5 c',
          '-0.6568542494923806 5 -2 3.6568542494923806 -2 2 c',
          'B',
          ...tail,
        ]);
      });
    });

    describe('with line', () => {
      it('renders line without lineColor', () => {
        const line: LineObject = { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 };

        renderGraphics({ type: 'graphics', shapes: [line] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 2 m', '3 4 l', 'S', ...tail]);
      });

      it('renders line with all attributes', () => {
        const line: LineObject = {
          ...{ type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 },
          lineColor: rgb(1, 0, 0),
          lineOpacity: 0.5,
          lineWidth: 1,
          lineCap: 'round',
        };

        renderGraphics({ type: 'graphics', shapes: [line] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '/GS-1 gs',
          '1 0 0 RG',
          '1 w',
          '1 J',
          '1 2 m',
          '3 4 l',
          'S',
          ...tail,
        ]);
      });
    });

    describe('with polyline', () => {
      it('renders polyline without color attributes', () => {
        const polyline: PolylineObject = { type: 'polyline', points: [p(1, 2), p(3, 4)] };

        renderGraphics({ type: 'graphics', shapes: [polyline] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 2 m', '3 4 l', 'f', ...tail]);
      });

      it('renders polyline with closePath', () => {
        const polyline: PolylineObject = {
          type: 'polyline',
          points: [p(1, 2), p(3, 4)],
          closePath: true,
        };

        renderGraphics({ type: 'graphics', shapes: [polyline] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 2 m', '3 4 l', 'h', 'f', ...tail]);
      });

      it('renders polyline with all attributes', () => {
        const polyline: PolylineObject = {
          ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
          fillColor: rgb(0, 0, 1),
          lineColor: rgb(1, 0, 0),
          lineWidth: 1,
          lineCap: 'round',
          lineJoin: 'round',
        };

        renderGraphics({ type: 'graphics', shapes: [polyline] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '0 0 1 rg',
          '1 0 0 RG',
          '1 w',
          '1 J',
          '1 j',
          '1 2 m',
          '3 4 l',
          'B',
          ...tail,
        ]);
      });
    });

    it('renders multiple shapes', () => {
      const line: LineObject = { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4 };
      const rect: RectObject = { type: 'rect', x: 1, y: 2, width: 3, height: 4 };

      renderGraphics({ type: 'graphics', shapes: [line, rect] }, page, pos);

      expect(getContentStream(page)).toEqual([
        ...head,
        '1 2 m',
        '3 4 l',
        'S',
        'Q',
        'q',
        '1 2 3 4 re',
        'f',
        ...tail,
      ]);
    });
  });
});
