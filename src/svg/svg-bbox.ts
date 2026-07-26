/*
 * Computes exact bounding boxes for SVG path data, including the
 * extrema of bezier curve segments. Needed to resolve gradients with
 * `objectBoundingBox` units.
 */
import type { Box } from '../box.ts';
import type { PathCommand } from '../svg-paths.ts';
import { walkSvgPath } from '../svg-paths.ts';

/**
 * Returns the bounding box of the given path commands, or `undefined`
 * for an empty path.
 */
export function getPathBBox(commands: PathCommand[]): Box | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  // End point of the preceding operation, i.e. the start point of the
  // segment being added. A path that does not begin with a moveto
  // implicitly starts at the origin.
  let lx = 0;
  let ly = 0;

  const addX = (x: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  };
  const addY = (y: number) => {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  const addPoint = (x: number, y: number) => {
    addX(x);
    addY(y);
  };

  walkSvgPath(commands, {
    moveTo: (x, y) => {
      addPoint(x, y);
      lx = x;
      ly = y;
    },
    lineTo: (x, y) => {
      addPoint(lx, ly);
      addPoint(x, y);
      lx = x;
      ly = y;
    },
    curveTo: (x1, y1, x2, y2, x, y) => {
      addPoint(lx, ly);
      addPoint(x, y);
      cubicExtrema(lx, x1, x2, x).forEach(addX);
      cubicExtrema(ly, y1, y2, y).forEach(addY);
      lx = x;
      ly = y;
    },
    closePath: (sx, sy) => {
      // The closing line runs between points that were already added
      lx = sx;
      ly = sy;
    },
  });

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
