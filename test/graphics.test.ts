import { describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import {
  LineObject,
  parseGraphicsObject,
  PolylineObject,
  RectObject,
  shiftGraphicsObject,
} from '../src/graphics.js';

describe('graphics', () => {
  describe('parseGraphicsObject', () => {
    it('throws for invalid types', () => {
      expect(() => parseGraphicsObject(23)).toThrowError('Expected object, got: 23');
      expect(() => parseGraphicsObject('foo')).toThrowError("Expected object, got: 'foo'");
    });

    it('throws for unsupported type attribute', () => {
      const fn = () => parseGraphicsObject({ type: 'foo' });

      expect(fn).toThrowError(
        "Invalid value for \"type\": Expected 'rect', 'line', or 'polyline', got: 'foo'"
      );
    });

    it('parses rect object', () => {
      const rect = {
        ...{ type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        strokeWidth: 1.5,
        strokeColor: 'red',
        fillColor: 'blue',
      };

      expect(parseGraphicsObject(rect)).toEqual({
        ...rect,
        strokeColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
      });
    });

    ['x', 'y', 'width', 'height'].forEach((name) => {
      it(`throws for missing rect attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20 };
        delete rect[name];

        const fn = () => parseGraphicsObject(rect);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses line object', () => {
      const line = {
        ...{ type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 },
        strokeWidth: 1.5,
        strokeColor: 'red',
      };

      expect(parseGraphicsObject(line)).toEqual({
        ...line,
        strokeColor: rgb(1, 0, 0),
      });
    });

    ['x1', 'y1', 'x2', 'y2'].forEach((name) => {
      it(`throws for missing line attribute ${name}`, () => {
        const line = { type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 };
        delete line[name];

        const fn = () => parseGraphicsObject(line);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses polyline object', () => {
      const polyline = {
        ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
        strokeWidth: 1.5,
        strokeColor: 'red',
        fillColor: 'blue',
      };

      expect(parseGraphicsObject(polyline)).toEqual({
        ...polyline,
        strokeColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
      });
    });

    it(`throws for missing polyline attribute points`, () => {
      const fn = () => parseGraphicsObject({ type: 'polyline' });

      expect(fn).toThrowError(`Missing value for "points"`);
    });

    ['strokeColor', 'fillColor'].forEach((name) => {
      it(`throws for invalid rect attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, [name]: 'foo' };

        const fn = () => parseGraphicsObject(rect);

        expect(fn).toThrowError(`Invalid value for "${name}": Unsupported color name: 'foo'`);
      });
    });

    it(`throws for negative value in attribute strokeWidth`, () => {
      const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, strokeWidth: -1 };

      const fn = () => parseGraphicsObject(rect);

      expect(fn).toThrowError(
        'Invalid value for "strokeWidth": Expected non-negative number, got: -1'
      );
    });
  });

  describe('shiftGraphicsObject', () => {
    it('shifts rect', () => {
      const rect: RectObject = { type: 'rect', x: 1, y: 2, width: 30, height: 40 };

      const shifted = shiftGraphicsObject(rect, { x: 5, y: 6 });

      expect(shifted).toEqual({ type: 'rect', x: 6, y: 8, width: 30, height: 40 });
    });

    it('shifts line', () => {
      const line: LineObject = { type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 };

      const shifted = shiftGraphicsObject(line, { x: 5, y: 6 });

      expect(shifted).toEqual({ type: 'line', x1: 6, y1: 8, x2: 16, y2: 18 });
    });

    it('shifts polyline', () => {
      const polyline: PolylineObject = { type: 'polyline', points: [p(1, 2), p(3, 4)] };

      const shifted = shiftGraphicsObject(polyline, { x: 5, y: 6 });

      expect(shifted).toEqual({ type: 'polyline', points: [p(6, 8), p(8, 10)] });
    });
  });
});

function p(x, y) {
  return { x, y };
}
