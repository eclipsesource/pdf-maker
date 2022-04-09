import { PDFImage } from 'pdf-lib';

import { Pos } from './box.js';
import { Color, parseColor } from './colors.js';
import {
  asArray,
  asBoolean,
  asNonNegNumber,
  asNumber,
  asObject,
  check,
  getFrom,
  Obj,
  optional,
  pickDefined,
  required,
  typeError,
} from './types.js';

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

export function parseGraphics(input: unknown): GraphicsObject[] {
  return check(input, 'graphics', optional(asArray))?.map((el, idx) =>
    check(el, `graphics object ${idx + 1} (type "${el['type']}")`, parseGraphicsObject)
  );
}

/**
 * Parses a given input as a graphics shape object. Throws if the input cannot be parsed.
 *
 * @param input The input value to parse.
 * @returns A graphics shape object.
 */
export function parseGraphicsObject(input: unknown): GraphicsObject {
  const shape = asObject(input);
  const type = getFrom(shape, 'type', required(asGraphicsType));
  switch (type) {
    case 'rect':
      return parseRect(shape);
    case 'line':
      return parseLine(shape);
    case 'polyline':
      return parsePolyline(shape);
  }
}

function asGraphicsType(input: unknown): string {
  if (input === 'rect' || input === 'line' || input === 'polyline') return input;
  throw typeError("'rect', 'line', or 'polyline'", input);
}

function parseRect(input: Obj): RectObject {
  return pickDefined({
    type: 'rect',
    x: getFrom(input, 'x', required(asNumber)),
    y: getFrom(input, 'y', required(asNumber)),
    width: getFrom(input, 'width', required(asNumber)),
    height: getFrom(input, 'height', required(asNumber)),
    strokeWidth: getFrom(input, 'strokeWidth', optional(asNonNegNumber)),
    strokeColor: getFrom(input, 'strokeColor', optional(parseColor)),
    fillColor: getFrom(input, 'fillColor', optional(parseColor)),
  }) as RectObject;
}

function parseLine(input: Obj): LineObject {
  return pickDefined({
    type: 'line',
    x1: getFrom(input, 'x1', required(asNumber)),
    x2: getFrom(input, 'x2', required(asNumber)),
    y1: getFrom(input, 'y1', required(asNumber)),
    y2: getFrom(input, 'y2', required(asNumber)),
    strokeWidth: getFrom(input, 'strokeWidth', optional(asNonNegNumber)),
    strokeColor: getFrom(input, 'strokeColor', optional(parseColor)),
  }) as LineObject;
}

function parsePolyline(input: Obj): PolylineObject {
  return pickDefined({
    type: 'polyline',
    points: getFrom(input, 'points', required(asPoints)),
    closePath: getFrom(input, 'closePath', optional(asBoolean)),
    strokeWidth: getFrom(input, 'strokeWidth', optional(asNonNegNumber)),
    strokeColor: getFrom(input, 'strokeColor', optional(parseColor)),
    fillColor: getFrom(input, 'fillColor', optional(parseColor)),
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

function asPoints(input: unknown): { x: number; y: number }[] {
  return asArray(input).map((point, idx) => check(point, `point ${idx + 1}`, asPoint));
}

function asPoint(input: unknown): { x: number; y: number } {
  const obj = asObject(input);
  return {
    x: getFrom(obj, 'x', required(asNumber)),
    y: getFrom(obj, 'y', required(asNumber)),
  };
}
