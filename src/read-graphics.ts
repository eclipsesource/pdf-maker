import { Color, parseColor } from './colors.js';
import { Obj, optional, readFrom, readObject, required, types } from './types.js';

export type GraphicsObject = RectObject | LineObject | PolylineObject;

export type RectObject = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth?: number;
  strokeColor?: Color;
  lineJoin?: LineJoin;
  fillColor?: Color;
};

export type LineObject = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
  strokeColor?: Color;
  lineCap?: LineCap;
};

export type PolylineObject = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
  strokeWidth?: number;
  strokeColor?: Color;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  fillColor?: Color;
};

type LineCap = 'butt' | 'round' | 'square';
type LineJoin = 'miter' | 'round' | 'bevel';

const tLineCap = types.string({ enum: ['butt', 'round', 'square'] });
const tLineJoin = types.string({ enum: ['miter', 'round', 'bevel'] });

const shapeTypes = ['rect', 'line', 'polyline'];

export function readGraphicsObject(input: unknown): GraphicsObject {
  const shape = readObject(input);
  const type = readFrom(shape, 'type', required(types.string({ enum: shapeTypes })));
  switch (type) {
    case 'rect':
      return readRect(shape);
    case 'line':
      return readLine(shape);
    case 'polyline':
      return readPolyline(shape);
  }
}

function readRect(input: Obj): RectObject {
  return readObject(input, {
    type: () => 'rect',
    x: required(types.number()),
    y: required(types.number()),
    width: required(types.number()),
    height: required(types.number()),
    strokeWidth: optional(types.number({ minimum: 0 })),
    strokeColor: optional(parseColor),
    lineJoin: optional(tLineJoin),
    fillColor: optional(parseColor),
  }) as RectObject;
}

function readLine(input: Obj): LineObject {
  return readObject(input, {
    type: () => 'line',
    x1: required(types.number()),
    x2: required(types.number()),
    y1: required(types.number()),
    y2: required(types.number()),
    strokeWidth: optional(types.number({ minimum: 0 })),
    strokeColor: optional(parseColor),
    lineCap: optional(tLineCap),
  }) as LineObject;
}

function readPolyline(input: Obj): PolylineObject {
  return readObject(input, {
    type: () => 'polyline',
    points: required(types.array(readPoint)),
    closePath: optional(types.boolean()),
    strokeWidth: optional(types.number({ minimum: 0 })),
    strokeColor: optional(parseColor),
    lineCap: optional(tLineCap),
    lineJoin: optional(tLineJoin),
    fillColor: optional(parseColor),
  }) as PolylineObject;
}

function readPoint(input: unknown): { x: number; y: number } {
  return readObject(input, {
    x: required(types.number()),
    y: required(types.number()),
  }) as { x: number; y: number };
}
