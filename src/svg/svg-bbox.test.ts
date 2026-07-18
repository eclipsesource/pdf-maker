import { describe, expect, it } from 'vitest';

import { parseSvgPath } from '../svg-paths.ts';
import { round } from '../util/utils.ts';
import { getPathBBox } from './svg-bbox.ts';

describe('getPathBBox', () => {
  it('returns undefined for an empty path', () => {
    expect(getPathBBox([])).toBeUndefined();
  });

  it('computes the bbox of lines', () => {
    expect(bboxOf('M 10 20 L 30 40 L 20 5')).toEqual({ x: 10, y: 5, width: 20, height: 35 });
  });

  it('computes the bbox of horizontal and vertical lines', () => {
    expect(bboxOf('M 10 10 H 50 V 30')).toEqual({ x: 10, y: 10, width: 40, height: 20 });
  });

  it('supports relative commands', () => {
    expect(bboxOf('m 10 10 l 20 0 v 10 h -30')).toEqual({ x: 0, y: 10, width: 30, height: 10 });
  });

  it('includes the extrema of cubic curves', () => {
    // A symmetric arch peaking at y = 75 for t = 0.5
    expect(bboxOf('M 0 0 C 0 100 100 100 100 0')).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 75,
    });
  });

  it('includes the extrema of quadratic curves', () => {
    // A symmetric arch peaking at y = 50 for t = 0.5
    expect(bboxOf('M 0 0 Q 50 100 100 0')).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it('does not extend the bbox to control points', () => {
    // The control points lie outside of the curve
    const bbox = bboxOf('M 0 0 C -100 50 200 50 100 0')!;
    expect(bbox.x).toBeGreaterThan(-100);
    expect(bbox.width).toBeLessThan(300);
    expect(bbox.height).toBeLessThan(50);
  });

  it('supports smooth cubic curves', () => {
    // The mirrored control point creates an S shape from y=75 to y=-75
    expect(bboxOf('M 0 0 C 0 100 100 100 100 0 S 200 -100 200 0')).toEqual({
      x: 0,
      y: -75,
      width: 200,
      height: 150,
    });
  });

  it('supports smooth quadratic curves', () => {
    expect(bboxOf('M 0 0 Q 50 100 100 0 T 200 0')).toEqual({
      x: 0,
      y: -50,
      width: 200,
      height: 100,
    });
  });

  it('includes the extrema of arcs', () => {
    const bbox = bboxOf('M 0 0 A 50 50 0 0 1 100 0')!;
    expect(bbox.x).toBeCloseTo(0, 3);
    expect(bbox.width).toBeCloseTo(100, 3);
    expect(bbox.height).toBeCloseTo(50, 3);
  });

  it('computes the bbox of a full circle from arcs', () => {
    const bbox = bboxOf('M 0 50 A 50 50 0 1 1 100 50 A 50 50 0 1 1 0 50')!;
    expect(bbox.x).toBeCloseTo(0, 3);
    expect(bbox.y).toBeCloseTo(0, 3);
    expect(bbox.width).toBeCloseTo(100, 3);
    expect(bbox.height).toBeCloseTo(100, 3);
  });

  it('moves the current point to the subpath start on close', () => {
    // The relative move after `z` starts at (0, 0), not at (50, 50)
    expect(bboxOf('M 0 0 L 50 50 z l 10 10')).toEqual({ x: 0, y: 0, width: 50, height: 50 });
  });

  it('includes lone moveto points', () => {
    expect(bboxOf('M 10 10')).toEqual({ x: 10, y: 10, width: 0, height: 0 });
  });

  it('handles multiple subpaths', () => {
    expect(bboxOf('M 0 0 L 10 10 M 50 50 L 60 60')).toEqual({
      x: 0,
      y: 0,
      width: 60,
      height: 60,
    });
  });
});

function bboxOf(d: string) {
  const bbox = getPathBBox(parseSvgPath(d));
  if (!bbox) return undefined;
  return {
    x: round(bbox.x),
    y: round(bbox.y),
    width: round(bbox.width),
    height: round(bbox.height),
  };
}
