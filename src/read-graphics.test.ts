import { rgb } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { readShape } from './read-graphics.ts';
import { p } from './test/test-utils.ts';

const transformAttrs = {
  translate: { x: 1, y: 2 },
  scale: { x: 3, y: 4 },
  rotate: { angle: 5, cx: 6, cy: 7 },
  skew: { x: 8, y: 9 },
  matrix: [10, 11, 12, 13, 14, 15],
};

describe('readShape', () => {
  it('throws for invalid types', () => {
    expect(() => readShape(23)).toThrowError('Expected object, got: 23');
    expect(() => readShape('foo')).toThrowError("Expected object, got: 'foo'");
  });

  it('throws for unsupported type property', () => {
    const fn = () => readShape({ type: 'foo' });

    expect(fn).toThrowError(
      `Invalid value for "type": Expected one of ('rect', 'circle', 'line', 'polyline', 'path'), got: 'foo'`,
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
      ...transformAttrs,
    };

    expect(readShape(rect)).toEqual({
      ...rect,
      lineColor: rgb(1, 0, 0),
      fillColor: rgb(0, 0, 1),
      lineOpacity: 0.5,
      fillOpacity: 0.3,
    });
  });

  (['x', 'y', 'width', 'height'] as const).forEach((name) => {
    it(`throws for missing rect property ${name}`, () => {
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
      ...transformAttrs,
    };

    expect(readShape(circle)).toEqual({
      ...circle,
      lineColor: rgb(1, 0, 0),
      fillColor: rgb(0, 0, 1),
      lineOpacity: 0.5,
      fillOpacity: 0.3,
    });
  });

  (['cx', 'cy', 'r'] as const).forEach((name) => {
    it(`throws for missing circle property ${name}`, () => {
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
      ...transformAttrs,
    };

    expect(readShape(line)).toEqual({
      ...line,
      lineColor: rgb(1, 0, 0),
      lineOpacity: 0.5,
    });
  });

  (['x1', 'y1', 'x2', 'y2'] as const).forEach((name) => {
    it(`throws for missing line property ${name}`, () => {
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
      ...transformAttrs,
    };

    expect(readShape(polyline)).toEqual({
      ...polyline,
      lineColor: rgb(1, 0, 0),
      fillColor: rgb(0, 0, 1),
      lineOpacity: 0.5,
      fillOpacity: 0.3,
    });
  });

  it(`throws for missing polyline property points`, () => {
    const fn = () => readShape({ type: 'polyline' });

    expect(fn).toThrowError(`Missing value for "points"`);
  });

  it(`throws for invalid point in polyline`, () => {
    const fn = () => readShape({ type: 'polyline', points: [{ x: 1, y: 'a' }] });

    expect(fn).toThrowError(`Invalid value for "points/0/y": Expected number, got: 'a'`);
  });

  it('parses path object', () => {
    const path = {
      ...{ type: 'path', d: 'M 1 2 c 3 4 5 6 7 8 s 9 10 11 12 z' },
      lineWidth: 1.5,
      lineColor: 'red',
      fillColor: 'blue',
      lineOpacity: 0.5,
      fillOpacity: 0.3,
      ...transformAttrs,
    };

    expect(readShape(path)).toEqual({
      ...path,
      commands: [
        { op: 'M', params: [1, 2] },
        { op: 'c', params: [3, 4, 5, 6, 7, 8] },
        { op: 's', params: [9, 10, 11, 12] },
        { op: 'z' },
      ],
      lineColor: rgb(1, 0, 0),
      fillColor: rgb(0, 0, 1),
      lineOpacity: 0.5,
      fillOpacity: 0.3,
    });
  });

  ['lineColor', 'fillColor'].forEach((name) => {
    it(`throws for invalid property ${name}`, () => {
      const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, [name]: 'foo' };

      const fn = () => readShape(rect);

      expect(fn).toThrowError(`Invalid value for "${name}": Expected valid color name, got: 'foo'`);
    });
  });

  it(`throws for negative value in property lineWidth`, () => {
    const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20, lineWidth: -1 };

    const fn = () => readShape(rect);

    expect(fn).toThrowError('Invalid value for "lineWidth": Expected number >= 0, got: -1');
  });

  it(`throws for invalid opacity properties`, () => {
    const rect = { type: 'rect', x: 1, y: 2, width: 10, height: 20 };

    expect(() => readShape({ ...rect, lineOpacity: -1 })).toThrowError(
      'Invalid value for "lineOpacity": Expected number >= 0, got: -1',
    );
    expect(() => readShape({ ...rect, lineOpacity: 1.5 })).toThrowError(
      'Invalid value for "lineOpacity": Expected number <= 1, got: 1.5',
    );
    expect(() => readShape({ ...rect, fillOpacity: -1 })).toThrowError(
      'Invalid value for "fillOpacity": Expected number >= 0, got: -1',
    );
    expect(() => readShape({ ...rect, fillOpacity: 1.5 })).toThrowError(
      'Invalid value for "fillOpacity": Expected number <= 1, got: 1.5',
    );
  });
});
