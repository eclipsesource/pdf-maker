import type { Color } from './colors.ts';

export type Shape = Rect | Circle | Line | Path | Polyline;

/**
 * A straight line.
 */
export type Line = {
  type: 'line';
  /**
   * The x coordinate of the start point of the line.
   */
  x1: number;
  /**
   * The y coordinate of the start point of the line.
   */
  y1: number;
  /**
   * The x coordinate of the end point of the line.
   */
  x2: number;
  /**
   * The y coordinate of the end point of the line.
   */
  y2: number;
} & LineProps;

export type LineProps = Omit<StrokeProps, 'lineJoin'> & TransformProps;

/** @deprecated Use `LineProps` instead. */
export type LineOpts = LineProps;

/**
 * Creates a line with the given coordinates and properties.
 *
 * @param x1 The x coordinate of the start of the line.
 * @param y1 The y coordinate of the start of the line.
 * @param x2 The x coordinate of the end of the line.
 * @param y2 The y coordinate of the end of the line.
 * @param props Optional properties for the line.
 */
export function line(x1: number, y1: number, x2: number, y2: number, props?: LineProps): Line {
  return { ...props, type: 'line', x1, y1, x2, y2 };
}

/**
 * A rectangle.
 */
export type Rect = {
  type: 'rect';
  /**
   * The x coordinate of the top left corner of the rectangle.
   */
  x: number;
  /**
   * The y coordinate of the top left corner of the rectangle.
   */
  y: number;
  /**
   * The width of the rectangle.
   */
  width: number;
  /**
   * The height of the rectangle.
   */
  height: number;
} & RectProps;

export type RectProps = Omit<StrokeProps, 'lineCap'> & FillProps & TransformProps;

/** @deprecated Use `RectProps` instead. */
export type RectOpts = RectProps;

/**
 * Creates a rectangle with the given coordinates and properties.
 *
 * @param x The x coordinate of the top left corner of the rectangle.
 * @param y The y coordinate of the top left corner of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @param props Optional properties for the rectangle.
 */
export function rect(x: number, y: number, width: number, height: number, props?: RectProps): Rect {
  return { ...props, type: 'rect', x, y, width, height };
}

/**
 * A circle.
 */
export type Circle = {
  type: 'circle';
  /**
   * The x coordinate of the center of the circle.
   */
  cx: number;
  /**
   * The y coordinate of the center of the circle.
   */
  cy: number;
  /**
   * The radius of the circle.
   */
  r: number;
} & CircleProps;

export type CircleProps = Omit<StrokeProps, 'lineCap' | 'lineJoin'> & FillProps & TransformProps;

/** @deprecated Use `CircleProps` instead. */
export type CircleOpts = CircleProps;

/**
 * Creates a circle with the given center, radius, and properties.
 *
 * @param cx The x coordinate of the center of the circle.
 * @param cy The y coordinate of the center of the circle.
 * @param r The radius of the circle.
 * @param props Optional properties for the circle.
 */
export function circle(cx: number, cy: number, r: number, props?: CircleProps): Circle {
  return { ...props, type: 'circle', cx, cy, r };
}

/**
 * An SVG path element.
 */
export type Path = {
  type: 'path';
  /**
   * An SVG path. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d for details.
   */
  d: string;
} & PathProps;

export type PathProps = StrokeProps & FillProps & TransformProps;

/** @deprecated Use `PathProps` instead. */
export type PathOpts = PathProps;

/**
 * Creates a path with the given path data and properties.
 *
 * @param d The path data. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d for details.
 * @param props Optional properties for the path.
 */
export function path(d: string, props?: PathProps): Path {
  return { ...props, type: 'path', d };
}

/**
 * A polyline, i.e. a line consisting of multiple segments.
 * @deprecated Use `Path` instead.
 */
export type Polyline = {
  type: 'polyline';
  /**
   * The points of the polyline, each point as an object with `x` and `y` coordinates.
   */
  points: { x: number; y: number }[];
  /**
   * Whether to close the path by drawing a line from the last point to the first point.
   */
  closePath?: boolean;
} & PolyLineOpts;

/** @deprecated  Use `Path` instead of `PolyLine`. */
export type PolyLineOpts = StrokeProps & FillProps & TransformProps;

export type LineCap = 'butt' | 'round' | 'square';
export type LineJoin = 'miter' | 'round' | 'bevel';

export type StrokeProps = {
  /**
   * The width of stroked lines in pt.
   */
  lineWidth?: number;
  /**
   * The color of stroked lines in pt.
   */
  lineColor?: Color;
  /**
   * The opacity of stroked lines as a number between `0` and `1`.
   */
  lineOpacity?: number;
  /**
   * The shape at the end of open paths when they are stroked.
   * * `butt`: indicates that the stroke for each subpath does not extend beyond its two endpoints.
   *   On a zero length subpath, the path will not be rendered at all.
   * * `round`: indicates that at the end of each subpath the stroke will be extended by a half circle
   *   with a diameter equal to the stroke width.
   *   On a zero length subpath, the stroke consists of a full circle centered at the subpath's point.
   * * `square`: indicates that at the end of each subpath the stroke will be extended by a rectangle
   *   with a width equal to half the width of the stroke and a height equal to the width of the stroke.
   *   On a zero length subpath, the stroke consists of a square with its width equal to the stroke
   *   width, centered at the subpath's point.
   */
  lineCap?: LineCap;
  /**
   * The shape to be used at the corners of paths or basic shapes when they are stroked.
   * * `miter`: indicates that the outer edges of the strokes for the two segments should be extended
   *   until they meet at an angle, as in a picture frame.
   * * `round`: indicates that the outer edges of the strokes for the two segments should be rounded off
   *   by a circular arc with a radius equal to half the line width.
   * * `bevel`: indicates that the two segments should be finished with butt caps and the resulting
   *   notch should be filled with a triangle.
   */
  lineJoin?: LineJoin;
  /**
   * The dash pattern to use for drawing paths, expressed as array of numbers. Each element defines
   * the length of a dash or a gap, in pt, starting with the first dash. If the array contains an odd
   * number of elements, then the elements are repeated to yield an even number of elements.
   * An empty array stands for no dash pattern, i.e. a continuous line.
   */
  lineDash?: number[];
};

export type FillProps = {
  /**
   * The color to use for filling the shape.
   */
  fillColor?: Color;
  /**
   * The opacity to use for filling the shape.
   */
  fillOpacity?: number;
};

export type TransformProps = {
  /**
   * Moves the element by `x` and `y`.
   */
  translate?: { x?: number; y?: number };
  /**
   * Stretches the element by `x` and `y`.
   */
  scale?: { x?: number; y?: number };
  /**
   * Rotates the element by `angle` degrees clockwise about the point
   * `[cx,cy]`. If `cx` and `cy` are omitted, the rotation is about the
   * origin of the coordinate system.
   */
  rotate?: { angle: number; cx?: number; cy?: number };
  /**
   * Skews the element by `x` degrees along the x axis and by `y`
   * degrees along the y axis.
   */
  skew?: { x?: number; y?: number };
  /**
   * A custom transformation matrix to apply to the element. The matrix
   * is given as an array of six values `[a, b, c, d, e, f]` that
   * represent the transformation matrix:
   * ```
   * | a c e |
   * | b d f |
   * | 0 0 1 |
   * ```
   */
  matrix?: number[];
};
