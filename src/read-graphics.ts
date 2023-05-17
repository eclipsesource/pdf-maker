import { Color, parseColor } from './colors.js';
import { parseSvgPath, PathCommand } from './svg-paths.js';
import { Obj, optional, readFrom, readObject, required, types } from './types.js';
import { omit } from './utils.js';

export type GraphicsObject = {
  type: 'graphics';
  shapes: Shape[];
};

export type Shape = RectObject | CircleObject | LineObject | PolylineObject | PathObject;

type LineCap = 'butt' | 'round' | 'square';
type LineJoin = 'miter' | 'round' | 'bevel';

type LineAttrs = {
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  lineDash?: number[];
};

type FillAttrs = {
  fillColor?: Color;
  fillOpacity?: number;
};

export type RectObject = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
} & Omit<LineAttrs, 'lineCap'> &
  FillAttrs;

export type CircleObject = {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
} & Omit<LineAttrs, 'lineCap' | 'lineJoin'> &
  FillAttrs;

export type LineObject = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} & Omit<LineAttrs, 'lineJoin'>;

export type PolylineObject = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
} & LineAttrs &
  FillAttrs;

export type PathObject = {
  type: 'path';
  commands: PathCommand[];
} & LineAttrs &
  FillAttrs;

const tLineCap = types.string({ enum: ['butt', 'round', 'square'] });
const tLineJoin = types.string({ enum: ['miter', 'round', 'bevel'] });
const tLineWidth = types.number({ minimum: 0 });
const tLineDash = types.array(types.number({ minimum: 0 }));
const tOpacity = types.number({ minimum: 0, maximum: 1 });

const shapeTypes = ['rect', 'circle', 'line', 'polyline', 'path'];

export function readShape(input: unknown): Shape {
  const shape = readObject(input);
  const type = readFrom(shape, 'type', required(types.string({ enum: shapeTypes })));
  switch (type) {
    case 'rect':
      return readRect(shape);
    case 'circle':
      return readCircle(shape);
    case 'line':
      return readLine(shape);
    case 'polyline':
      return readPolyline(shape);
    case 'path':
      return readPath(shape);
    default:
      // should never happen since type is checked above
      throw new Error('unknown shape type');
  }
}

function readRect(input: Obj): RectObject {
  return readObject(input, {
    type: () => 'rect',
    x: required(types.number()),
    y: required(types.number()),
    width: required(types.number()),
    height: required(types.number()),
    ...omit(lineAttrs, 'lineCap'),
    ...fillAttrs,
  }) as RectObject;
}

function readCircle(input: Obj): CircleObject {
  return readObject(input, {
    type: () => 'circle',
    cx: required(types.number()),
    cy: required(types.number()),
    r: required(types.number({ minimum: 0 })),
    ...omit(lineAttrs, 'lineCap', 'lineJoin'),
    ...fillAttrs,
  }) as CircleObject;
}

function readLine(input: Obj): LineObject {
  return readObject(input, {
    type: () => 'line',
    x1: required(types.number()),
    x2: required(types.number()),
    y1: required(types.number()),
    y2: required(types.number()),
    ...omit(lineAttrs, 'lineJoin'),
  }) as LineObject;
}

function readPolyline(input: Obj): PolylineObject {
  return readObject(input, {
    type: () => 'polyline',
    points: required(types.array(readPoint)),
    closePath: optional(types.boolean()),
    ...lineAttrs,
    ...fillAttrs,
  }) as PolylineObject;
}

function readPath(input: Obj): PathObject {
  const obj = readObject(input, {
    type: () => 'path',
    d: required(types.string()),
    ...lineAttrs,
    ...fillAttrs,
  });
  const commands = parseSvgPath(obj.d as string);
  return { ...obj, commands } as PathObject;
}

const lineAttrs = {
  lineWidth: optional(tLineWidth),
  lineColor: optional(parseColor),
  lineOpacity: optional(tOpacity),
  lineCap: optional(tLineCap),
  lineJoin: optional(tLineJoin),
  lineDash: optional(tLineDash),
};

const fillAttrs = {
  fillColor: optional(parseColor),
  fillOpacity: optional(tOpacity),
};

function readPoint(input: unknown): { x: number; y: number } {
  return readObject(input, {
    x: required(types.number()),
    y: required(types.number()),
  }) as { x: number; y: number };
}
