import { Color, parseColor } from './colors.js';
import { Obj, optional, readFrom, readObject, required, types } from './types.js';

export type GraphicsObject = {
  type: 'graphics';
  shapes: Shape[];
};

export type Shape = RectObject | CircleObject | LineObject | PolylineObject;

export type RectObject = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

export type CircleObject = {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

export type LineObject = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
};

export type PolylineObject = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

type LineCap = 'butt' | 'round' | 'square';
type LineJoin = 'miter' | 'round' | 'bevel';

const tLineCap = types.string({ enum: ['butt', 'round', 'square'] });
const tLineJoin = types.string({ enum: ['miter', 'round', 'bevel'] });
const tLineWidth = types.number({ minimum: 0 });
const tOpacity = types.number({ minimum: 0, maximum: 1 });

const shapeTypes = ['rect', 'circle', 'line', 'polyline'];

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
    lineWidth: optional(tLineWidth),
    lineColor: optional(parseColor),
    lineOpacity: optional(tOpacity),
    lineJoin: optional(tLineJoin),
    fillColor: optional(parseColor),
    fillOpacity: optional(tOpacity),
  }) as RectObject;
}

function readCircle(input: Obj): RectObject {
  return readObject(input, {
    type: () => 'circle',
    cx: required(types.number()),
    cy: required(types.number()),
    r: required(types.number({ minimum: 0 })),
    lineWidth: optional(tLineWidth),
    lineColor: optional(parseColor),
    lineOpacity: optional(tOpacity),
    fillColor: optional(parseColor),
    fillOpacity: optional(tOpacity),
  }) as RectObject;
}

function readLine(input: Obj): LineObject {
  return readObject(input, {
    type: () => 'line',
    x1: required(types.number()),
    x2: required(types.number()),
    y1: required(types.number()),
    y2: required(types.number()),
    lineWidth: optional(tLineWidth),
    lineColor: optional(parseColor),
    lineOpacity: optional(tOpacity),
    lineCap: optional(tLineCap),
  }) as LineObject;
}

function readPolyline(input: Obj): PolylineObject {
  return readObject(input, {
    type: () => 'polyline',
    points: required(types.array(readPoint)),
    closePath: optional(types.boolean()),
    lineWidth: optional(tLineWidth),
    lineColor: optional(parseColor),
    lineOpacity: optional(tOpacity),
    lineCap: optional(tLineCap),
    lineJoin: optional(tLineJoin),
    fillColor: optional(parseColor),
    fillOpacity: optional(tOpacity),
  }) as PolylineObject;
}

function readPoint(input: unknown): { x: number; y: number } {
  return readObject(input, {
    x: required(types.number()),
    y: required(types.number()),
  }) as { x: number; y: number };
}
