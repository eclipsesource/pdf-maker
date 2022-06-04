import { describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { readGraphicsObject } from '../src/read-graphics.js';

describe('graphics', () => {
  describe('readGraphicsObject', () => {
    it('throws for invalid types', () => {
      expect(() => readGraphicsObject(23)).toThrowError('Expected object, got: 23');
      expect(() => readGraphicsObject('foo')).toThrowError("Expected object, got: 'foo'");
    });

    it('throws for unsupported type attribute', () => {
      const fn = () => readGraphicsObject({ type: 'foo' });

      expect(fn).toThrowError(
        `Invalid value for "type": Expected one of ('rect', 'line', 'polyline'), got: 'foo'`
      );
    });

    it('parses rect object', () => {
      const rect = {
        ...{ type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        strokeWidth: 1.5,
        strokeColor: 'red',
        fillColor: 'blue',
      };

      expect(readGraphicsObject(rect)).toEqual({
        ...rect,
        strokeColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
      });
    });

    ['x', 'y', 'width', 'height'].forEach((name) => {
      it(`throws for missing rect attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20 };
        delete rect[name];

        const fn = () => readGraphicsObject(rect);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses line object', () => {
      const line = {
        ...{ type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 },
        strokeWidth: 1.5,
        strokeColor: 'red',
      };

      expect(readGraphicsObject(line)).toEqual({
        ...line,
        strokeColor: rgb(1, 0, 0),
      });
    });

    ['x1', 'y1', 'x2', 'y2'].forEach((name) => {
      it(`throws for missing line attribute ${name}`, () => {
        const line = { type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 };
        delete line[name];

        const fn = () => readGraphicsObject(line);

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

      expect(readGraphicsObject(polyline)).toEqual({
        ...polyline,
        strokeColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
      });
    });

    it(`throws for missing polyline attribute points`, () => {
      const fn = () => readGraphicsObject({ type: 'polyline' });

      expect(fn).toThrowError(`Missing value for "points"`);
    });

    it(`throws for invalid point in polyline`, () => {
      const fn = () => readGraphicsObject({ type: 'polyline', points: [{ x: 1, y: 'a' }] });

      expect(fn).toThrowError(`Invalid value for "points/0/y": Expected number, got: 'a'`);
    });

    ['strokeColor', 'fillColor'].forEach((name) => {
      it(`throws for invalid rect attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, [name]: 'foo' };

        const fn = () => readGraphicsObject(rect);

        expect(fn).toThrowError(
          `Invalid value for "${name}": Expected valid color name, got: 'foo'`
        );
      });
    });

    it(`throws for negative value in attribute strokeWidth`, () => {
      const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, strokeWidth: -1 };

      const fn = () => readGraphicsObject(rect);

      expect(fn).toThrowError('Invalid value for "strokeWidth": Expected number >= 0, got: -1');
    });
  });
});

function p(x, y) {
  return { x, y };
}
