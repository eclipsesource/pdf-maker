import { Pos } from './box.js';
import { Color, parseColor } from './colors.js';

export type GraphicsObject = RectObject | LineObject | PolylineObject;

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

type Obj = Record<string, unknown>;

/**
 * Parses a given input as a graphics shape object. Throws if the input cannot be parsed.
 *
 * @param input The input value to parse.
 * @returns A graphics shape object.
 */
export function parseGraphicsObject(input: unknown): GraphicsObject {
  if (typeof input !== 'object') throw new TypeError(`Invalid graphics object: ${input}`);
  const shape = input as Obj;
  try {
    switch (shape.type) {
      case 'rect':
        return parseRect(shape);
      case 'line':
        return parseLine(shape);
      case 'polyline':
        return parsePolyline(shape);
    }
  } catch (error) {
    throw new TypeError(`Invalid graphics object of type ${shape.type}: ${error.message}`);
  }
  throw new TypeError(`Unsupported graphics object type: ${shape.type}`);
}

function parseRect(input: Obj): RectObject {
  return {
    type: 'rect',
    x: pickNumber(input, 'x'),
    y: pickNumber(input, 'y'),
    width: pickNumber(input, 'width'),
    height: pickNumber(input, 'height'),
    strokeWidth: pickNumber(input, 'strokeWidth', { optional: true, predicate: (n) => n >= 0 }),
    strokeColor: pickColor(input, 'strokeColor', { optional: true }),
    fillColor: pickColor(input, 'fillColor', { optional: true }),
  };
}

function parseLine(input: Obj): LineObject {
  return {
    type: 'line',
    x1: pickNumber(input, 'x1'),
    x2: pickNumber(input, 'x2'),
    y1: pickNumber(input, 'y1'),
    y2: pickNumber(input, 'y2'),
    strokeWidth: pickNumber(input, 'strokeWidth', { optional: true, predicate: (n) => n >= 0 }),
    strokeColor: pickColor(input, 'strokeColor', { optional: true }),
  };
}

function parsePolyline(input: Obj): PolylineObject {
  return {
    type: 'polyline',
    points: pickPoints(input, 'points'),
    closePath: pickBoolean(input, 'closePath', { optional: true }),
    strokeWidth: pickNumber(input, 'strokeWidth', { optional: true, predicate: (n) => n >= 0 }),
    strokeColor: pickColor(input, 'strokeColor', { optional: true }),
    fillColor: pickColor(input, 'fillColor', { optional: true }),
  };
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

function pickNumber(
  input: Obj,
  name: string,
  options?: { optional?: boolean; predicate?: (number) => boolean }
): number {
  const { optional, predicate } = options ?? {};
  const value = input[name];
  if (value == null) {
    if (optional) return undefined;
    throw new TypeError(`Missing value for ${name}`);
  }
  if (!Number.isFinite(value)) throw new TypeError(`Invalid value for ${name}: ${value}`);
  if (predicate && !predicate(value)) throw new TypeError(`Invalid value for ${name}: ${value}`);
  return value as number;
}

function pickBoolean(input: Obj, name: string, options?: { optional?: boolean }): boolean {
  const { optional } = options ?? {};
  const value = input[name];
  if (value == null) {
    if (optional) return undefined;
    throw new TypeError(`Missing value for ${name}`);
  }
  if (typeof value !== 'boolean') throw new TypeError(`Invalid value for ${name}: ${value}`);
  return value;
}

function pickColor(input: Obj, name: string, options?: { optional?: boolean }): Color {
  const { optional } = options ?? {};
  const value = input[name];
  if (value == null) {
    if (optional) return undefined;
    throw new TypeError(`Missing value for ${name}`);
  }
  return parseColor(value);
}

function pickPoints(input: Obj, name: string): { x: number; y: number }[] {
  const value = input[name];
  if (value == null) throw new TypeError(`Missing value for ${name}`);
  if (!Array.isArray(value)) throw new TypeError(`Invalid value for ${name}: ${value}`);
  try {
    return value.map((point) => ({
      x: pickNumber(point, 'x'),
      y: pickNumber(point, 'y'),
    })) as { x: number; y: number }[];
  } catch (error) {
    throw new TypeError(`Invalid point in ${name}: ${error.message}`);
  }
}
