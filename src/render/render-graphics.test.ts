import { beforeEach, describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { Size } from '../box.js';
import { CircleObject, LineObject, PathObject, PolylineObject, RectObject } from '../frame.js';
import { Page } from '../page.js';
import { fakePDFPage, getContentStream, p } from '../test/test-utils.js';
import { renderGraphics } from './render-graphics.js';

describe('render-graphics', () => {
  let page: Page, size: Size;

  beforeEach(() => {
    size = { width: 500, height: 800 };
    const pdfPage = fakePDFPage();
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

        expect(getContentStream(page)).toEqual([...head, '1 2 3 4 re', 'S', ...tail]);
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
          lineDash: [1, 2],
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
          '[1 2] 0 d',
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
          'S',
          ...tail,
        ]);
      });

      it('renders circle with all attributes', () => {
        const circle: CircleObject = {
          ...{ type: 'circle', cx: 1, cy: 2, r: 3 },
          fillColor: rgb(0, 0, 1),
          lineColor: rgb(1, 0, 0),
          lineWidth: 1,
          lineDash: [1, 2],
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
          '[1 2] 0 d',
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
          lineDash: [1, 2],
        };

        renderGraphics({ type: 'graphics', shapes: [line] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '/GS-1 gs',
          '1 0 0 RG',
          '1 w',
          '1 J',
          '[1 2] 0 d',
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

        expect(getContentStream(page)).toEqual([...head, '1 2 m', '3 4 l', 'S', ...tail]);
      });

      it('renders polyline with closePath', () => {
        const polyline: PolylineObject = {
          type: 'polyline',
          points: [p(1, 2), p(3, 4)],
          closePath: true,
        };

        renderGraphics({ type: 'graphics', shapes: [polyline] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '1 2 m', '3 4 l', 'h', 'S', ...tail]);
      });

      it('renders polyline with all attributes', () => {
        const polyline: PolylineObject = {
          ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
          fillColor: rgb(0, 0, 1),
          lineColor: rgb(1, 0, 0),
          lineWidth: 1,
          lineCap: 'round',
          lineJoin: 'round',
          lineDash: [1, 2],
        };

        renderGraphics({ type: 'graphics', shapes: [polyline] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '0 0 1 rg',
          '1 0 0 RG',
          '1 w',
          '1 J',
          '1 j',
          '[1 2] 0 d',
          '1 2 m',
          '3 4 l',
          'B',
          ...tail,
        ]);
      });
    });

    describe('with path', () => {
      it('renders moveto and lineto', () => {
        const path: PathObject = {
          type: 'path',
          commands: [
            { op: 'M', params: [0, 20] },
            { op: 'L', params: [20, 0] },
          ],
        } as any;

        renderGraphics({ type: 'graphics', shapes: [path] }, page, pos);

        expect(getContentStream(page)).toEqual([...head, '0 20 m', '20 0 l', 'S', ...tail]);
      });

      it('renders curve', () => {
        const path: PathObject = {
          type: 'path',
          commands: [
            { op: 'M', params: [0, 20] },
            { op: 'Q', params: [20, 0, 40, 20] },
            { op: 't', params: [40, 0] },
          ],
        } as any;

        renderGraphics({ type: 'graphics', shapes: [path] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '0 20 m',
          '20 0 40 20 v',
          '60 40 80 20 v',
          'S',
          ...tail,
        ]);
      });

      it('renders arc', () => {
        const path: PathObject = {
          type: 'path',
          commands: [
            { op: 'M', params: [10, 20] },
            { op: 'A', params: [3, 4, 0, 0, 1, 30, 40] },
          ],
        } as any;

        renderGraphics({ type: 'graphics', shapes: [path] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '10 20 m',
          expect.stringMatching(/^14\.\d+ 12\.\d+ 21\.\d+ 11\.\d+ 27\.\d+ 16\.\d+ c$/),
          expect.stringMatching(/^33\.\d+ 22\.\d+ 34\.\d+ 32\.\d+ 30 40 c$/),
          'S',
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
        'S',
        ...tail,
      ]);
    });

    describe('transformations', () => {
      const rect = { type: 'rect' as const, x: 1, y: 2, width: 3, height: 4 };
      it('supports translate', () => {
        const shape = {
          ...rect,
          translate: { x: 1, y: 2 },
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '1 0 0 1 1 2 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });

      it('supports scale', () => {
        const shape = {
          ...rect,
          scale: { x: 3, y: 4 },
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '3 0 0 4 0 0 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });

      it('supports rotate', () => {
        const shape = {
          ...rect,
          rotate: { angle: 5, cx: 6, cy: 7 },
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '0.996195 0.087156 -0.087156 0.996195 0.632922 -0.496297 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });

      it('supports skew', () => {
        const shape = {
          ...rect,
          skew: { x: 8, y: 9 },
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '1 0.158384 0.140541 1 0 0 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });

      it('supports matrix', () => {
        const shape = {
          ...rect,
          matrix: [1, 2, 3, 4, 5, 6],
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '1 2 3 4 5 6 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });

      it('supports multiple transformations', () => {
        const shape = {
          ...rect,
          translate: { x: 1, y: 2 },
          scale: { x: 3, y: 4 },
          skew: { x: 8, y: 9 },
        };

        renderGraphics({ type: 'graphics', shapes: [shape] }, page, pos);

        expect(getContentStream(page)).toEqual([
          ...head,
          '3 0.633538 0.421623 4 1 2 cm',
          '1 2 3 4 re',
          'S',
          ...tail,
        ]);
      });
    });
  });
});
