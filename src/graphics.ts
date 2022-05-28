import { PDFImage } from 'pdf-lib';

import { Pos } from './box.js';
import { Color, parseColor } from './colors.js';
import { Obj, optional, readFrom, readObject, required, types } from './types.js';

export type GraphicsObject = RectObject | LineObject | PolylineObject | ImageObject;

export type RectObject = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth?: number;
  strokeColor?: Color;
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
};

export type PolylineObject = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
  strokeWidth?: number;
  strokeColor?: Color;
  fillColor?: Color;
};

export type ImageObject = {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  image: PDFImage;
};

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
  }) as LineObject;
}

function readPolyline(input: Obj): PolylineObject {
  return readObject(input, {
    type: () => 'polyline',
    points: required(types.array(readPoint)),
    closePath: optional(types.boolean()),
    strokeWidth: optional(types.number({ minimum: 0 })),
    strokeColor: optional(parseColor),
    fillColor: optional(parseColor),
  }) as PolylineObject;
}

/**
 * Shifts the a graphics object to a given position by adding the position's `x` and `y` values
 * to the coordinates of the graphics object.
 *
 * @param rect The input graphics object to shift
 * @param pos The position to shift to
 * @returns The new graphics object
 */
export function shiftGraphicsObject<T extends GraphicsObject>(shape: T, pos: Pos): T {
  switch (shape.type) {
    case 'rect':
      return shiftRect(shape, pos) as T;
    case 'line':
      return shiftLine(shape, pos) as T;
    case 'polyline':
      return shiftPolyline(shape, pos) as T;
  }
}

function shiftRect(rect: RectObject, pos: Pos): RectObject {
  return { ...rect, x: rect.x + pos.x, y: rect.y + pos.y };
}

function shiftLine(line: LineObject, pos: Pos): LineObject {
  return {
    ...line,
    x1: line.x1 + pos.x,
    x2: line.x2 + pos.x,
    y1: line.y1 + pos.y,
    y2: line.y2 + pos.y,
  };
}

function shiftPolyline(polyline: PolylineObject, pos: Pos): PolylineObject {
  return {
    ...polyline,
    points: polyline.points.map((p) => ({ x: p.x + pos.x, y: p.y + pos.y })),
  };
}

function readPoint(input: unknown): { x: number; y: number } {
  return readObject(input, {
    x: required(types.number()),
    y: required(types.number()),
  }) as { x: number; y: number };
}
