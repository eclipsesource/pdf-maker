import { describe, expect, it } from '@jest/globals';
import { rgb } from 'pdf-lib';

import { readShape } from '../src/read-graphics.js';

describe('read-graphics', () => {
  describe('readShape', () => {
    it('throws for invalid types', () => {
      expect(() => readShape(23)).toThrowError('Expected object, got: 23');
      expect(() => readShape('foo')).toThrowError("Expected object, got: 'foo'");
    });

    it('throws for unsupported type attribute', () => {
      const fn = () => readShape({ type: 'foo' });

      expect(fn).toThrowError(
        `Invalid value for "type": Expected one of ('rect', 'circle', 'line', 'polyline'), got: 'foo'`
      );
    });

    it('parses rect object', () => {
      const rect = {
        ...{ type: 'rect', x: 1, y: 2, width: 10, height: 20 },
        lineWidth: 1.5,
        lineColor: 'red',
        fillColor: 'blue',
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      };

      expect(readShape(rect)).toEqual({
        ...rect,
        lineColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      });
    });

    ['x', 'y', 'width', 'height'].forEach((name) => {
      it(`throws for missing rect attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20 };
        delete rect[name];

        const fn = () => readShape(rect);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses circle object', () => {
      const circle = {
        ...{ type: 'circle', cx: 1, cy: 2, r: 3 },
        lineWidth: 1.5,
        lineColor: 'red',
        fillColor: 'blue',
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      };

      expect(readShape(circle)).toEqual({
        ...circle,
        lineColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      });
    });

    ['cx', 'cy', 'r'].forEach((name) => {
      it(`throws for missing circle attribute ${name}`, () => {
        const circle = { type: 'circle', cx: 1, cy: 2, r: 3 };
        delete circle[name];

        const fn = () => readShape(circle);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses line object', () => {
      const line = {
        ...{ type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 },
        lineWidth: 1.5,
        lineColor: 'red',
        lineOpacity: 0.5,
      };

      expect(readShape(line)).toEqual({
        ...line,
        lineColor: rgb(1, 0, 0),
        lineOpacity: 0.5,
      });
    });

    ['x1', 'y1', 'x2', 'y2'].forEach((name) => {
      it(`throws for missing line attribute ${name}`, () => {
        const line = { type: 'line', x1: 1, y1: 2, x2: 11, y2: 12 };
        delete line[name];

        const fn = () => readShape(line);

        expect(fn).toThrowError(`Missing value for "${name}"`);
      });
    });

    it('parses polyline object', () => {
      const polyline = {
        ...{ type: 'polyline', points: [p(1, 2), p(3, 4)] },
        lineWidth: 1.5,
        lineColor: 'red',
        fillColor: 'blue',
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      };

      expect(readShape(polyline)).toEqual({
        ...polyline,
        lineColor: rgb(1, 0, 0),
        fillColor: rgb(0, 0, 1),
        lineOpacity: 0.5,
        fillOpacity: 0.3,
      });
    });

    it(`throws for missing polyline attribute points`, () => {
      const fn = () => readShape({ type: 'polyline' });

      expect(fn).toThrowError(`Missing value for "points"`);
    });

    it(`throws for invalid point in polyline`, () => {
      const fn = () => readShape({ type: 'polyline', points: [{ x: 1, y: 'a' }] });

      expect(fn).toThrowError(`Invalid value for "points/0/y": Expected number, got: 'a'`);
    });

    ['lineColor', 'fillColor'].forEach((name) => {
      it(`throws for invalid attribute ${name}`, () => {
        const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, [name]: 'foo' };

        const fn = () => readShape(rect);

        expect(fn).toThrowError(
          `Invalid value for "${name}": Expected valid color name, got: 'foo'`
        );
      });
    });

    it(`throws for negative value in attribute lineWidth`, () => {
      const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, lineWidth: -1 };

      const fn = () => readShape(rect);

      expect(fn).toThrowError('Invalid value for "lineWidth": Expected number >= 0, got: -1');
    });

    it(`throws for invalid opacity attributes`, () => {
      const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20 };

      expect(() => readShape({ ...rect, lineOpacity: -1 })).toThrowError(
        'Invalid value for "lineOpacity": Expected number >= 0, got: -1'
      );
      expect(() => readShape({ ...rect, lineOpacity: 1.5 })).toThrowError(
        'Invalid value for "lineOpacity": Expected number <= 1, got: 1.5'
      );
      expect(() => readShape({ ...rect, fillOpacity: -1 })).toThrowError(
        'Invalid value for "fillOpacity": Expected number >= 0, got: -1'
      );
      expect(() => readShape({ ...rect, fillOpacity: 1.5 })).toThrowError(
        'Invalid value for "fillOpacity": Expected number <= 1, got: 1.5'
      );
    });
  });
});

function p(x, y) {
  return { x, y };
}
