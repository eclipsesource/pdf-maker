/*
 * Computes exact bounding boxes for SVG path data, including the
 * extrema of bezier curve segments. Needed to resolve gradients with
 * `objectBoundingBox` units.
 */
import { arcToSegments, segmentToBezier } from '../arcs.ts';
import type { Box } from '../box.ts';
import type { PathCommand } from '../svg-paths.ts';

/**
 * Returns the bounding box of the given path commands, or `undefined`
 * for an empty path. The command semantics match `drawSvgPath()`.
 */
export function getPathBBox(commands: PathCommand[]): Box | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  // Current point, subpath start, and previous control point (for
  // mirroring in smooth curve commands)
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let px = 0;
  let py = 0;
  let lastCurve: 'b' | 'q' | undefined;

  const addPoint = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  const opMoveTo = (x: number, y: number) => {
    cx = x;
    cy = y;
    sx = x;
    sy = y;
    lastCurve = undefined;
    addPoint(cx, cy);
  };

  const opLineTo = (x: number, y: number) => {
    addPoint(cx, cy);
    cx = x;
    cy = y;
    lastCurve = undefined;
    addPoint(cx, cy);
  };

  const opBezierCurve = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    addPoint(cx, cy);
    addPoint(x, y);
    cubicExtrema(cx, x1, x2, x).forEach((value) => addPoint(value, cy));
    cubicExtrema(cy, y1, y2, y).forEach((value) => addPoint(cx, value));
    cx = x;
    cy = y;
    px = x2;
    py = y2;
    lastCurve = 'b';
  };

  const opQuadraticCurve = (x1: number, y1: number, x: number, y: number) => {
    // Convert to an equivalent cubic curve
    const c1x = cx + (2 / 3) * (x1 - cx);
    const c1y = cy + (2 / 3) * (y1 - cy);
    const c2x = x + (2 / 3) * (x1 - x);
    const c2y = y + (2 / 3) * (y1 - y);
    opBezierCurve(c1x, c1y, c2x, c2y, x, y);
    px = x1;
    py = y1;
    lastCurve = 'q';
  };

  const opArc = (rx: number, ry: number, a: number, l: number, s: number, x: number, y: number) => {
    const segments = arcToSegments(cx, cy, rx, ry, a, l, s, x, y);
    segments.forEach((seg) => {
      const [x1, y1, x2, y2, ex, ey] = segmentToBezier(seg);
      opBezierCurve(x1, y1, x2, y2, ex, ey);
    });
    cx = x;
    cy = y;
    lastCurve = undefined;
  };

  const opClosePath = () => {
    cx = sx;
    cy = sy;
    lastCurve = undefined;
  };

  const mirrorCx = (type: 'b' | 'q') => (lastCurve === type ? 2 * cx - px : cx);
  const mirrorCy = (type: 'b' | 'q') => (lastCurve === type ? 2 * cy - py : cy);

  for (const { op, params = [] } of commands) {
    const [p0, p1, p2, p3, p4, p5, p6] = params;
    switch (op) {
      case 'M':
        opMoveTo(p0, p1);
        break;
      case 'm':
        opMoveTo(cx + p0, cy + p1);
        break;
      case 'L':
        opLineTo(p0, p1);
        break;
      case 'l':
        opLineTo(cx + p0, cy + p1);
        break;
      case 'H':
        opLineTo(p0, cy);
        break;
      case 'h':
        opLineTo(cx + p0, cy);
        break;
      case 'V':
        opLineTo(cx, p0);
        break;
      case 'v':
        opLineTo(cx, cy + p0);
        break;
      case 'C':
        opBezierCurve(p0, p1, p2, p3, p4, p5);
        break;
      case 'c':
        opBezierCurve(cx + p0, cy + p1, cx + p2, cy + p3, cx + p4, cy + p5);
        break;
      case 'S':
        opBezierCurve(mirrorCx('b'), mirrorCy('b'), p0, p1, p2, p3);
        break;
      case 's':
        opBezierCurve(mirrorCx('b'), mirrorCy('b'), cx + p0, cy + p1, cx + p2, cy + p3);
        break;
      case 'Q':
        opQuadraticCurve(p0, p1, p2, p3);
        break;
      case 'q':
        opQuadraticCurve(cx + p0, cy + p1, cx + p2, cy + p3);
        break;
      case 'T':
        opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), p0, p1);
        break;
      case 't':
        opQuadraticCurve(mirrorCx('q'), mirrorCy('q'), cx + p0, cy + p1);
        break;
      case 'A':
        opArc(p0, p1, p2, p3, p4, p5, p6);
        break;
      case 'a':
        opArc(p0, p1, p2, p3, p4, cx + p5, cy + p6);
        break;
      case 'Z':
      case 'z':
        opClosePath();
        break;
    }
  }

  if (!isFinite(minX)) return undefined;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Returns the values of a cubic bezier at the local extrema of its
 * one-dimensional projection with the given control values.
 */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  // Derivative is the quadratic at^2 + bt + c
  const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
  const b = 6 * (p0 - 2 * p1 + p2);
  const c = 3 * (p1 - p0);
  const roots: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) roots.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sqrt = Math.sqrt(disc);
      roots.push((-b + sqrt) / (2 * a), (-b - sqrt) / (2 * a));
    }
  }
  return roots
    .filter((t) => t > 0 && t < 1)
    .map((t) => {
      const u = 1 - t;
      return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    });
}
