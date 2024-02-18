import {
  CircleObject,
  LineObject,
  PathObject,
  PolylineObject,
  RectObject,
  Shape,
} from './frame.js';
import { readColor } from './read-color.js';
import { parseSvgPath } from './svg-paths.js';
import { Obj, optional, readFrom, readObject, required, types } from './types.js';
import { omit } from './utils.js';

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
    ...transformAttrs,
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
    ...transformAttrs,
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
    ...transformAttrs,
  }) as LineObject;
}

function readPolyline(input: Obj): PolylineObject {
  return readObject(input, {
    type: () => 'polyline',
    points: required(types.array(readPoint)),
    closePath: optional(types.boolean()),
    ...lineAttrs,
    ...fillAttrs,
    ...transformAttrs,
  }) as PolylineObject;
}

function readPath(input: Obj): PathObject {
  const obj = readObject(input, {
    type: () => 'path',
    d: required(types.string()),
    ...lineAttrs,
    ...fillAttrs,
    ...transformAttrs,
  });
  const commands = parseSvgPath(obj.d as string);
  return { ...obj, commands } as PathObject;
}

const lineAttrs = {
  lineWidth: optional(tLineWidth),
  lineColor: optional(readColor),
  lineOpacity: optional(tOpacity),
  lineCap: optional(tLineCap),
  lineJoin: optional(tLineJoin),
  lineDash: optional(tLineDash),
};

const fillAttrs = {
  fillColor: optional(readColor),
  fillOpacity: optional(tOpacity),
};

const transformAttrs = {
  translate: optional(types.object({ x: optional(types.number()), y: optional(types.number()) })),
  scale: optional(types.object({ x: optional(types.number()), y: optional(types.number()) })),
  rotate: optional(
    types.object({
      cx: optional(types.number()),
      cy: optional(types.number()),
      angle: types.number(),
    }),
  ),
  skew: optional(types.object({ x: optional(types.number()), y: optional(types.number()) })),
  matrix: optional(types.array(types.number(), { minItems: 6, maxItems: 6 })),
};

function readPoint(input: unknown): { x: number; y: number } {
  return readObject(input, {
    x: required(types.number()),
    y: required(types.number()),
  }) as { x: number; y: number };
}
