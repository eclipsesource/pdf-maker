import { LengthUnit } from './content.js';

export type Pos = { x: number; y: number };
export type Size = { width: number; height: number };
export type Box = Size & Pos;

export type BoxEdges = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const ZERO_EDGES = Object.freeze(parseEdges(0));

/**
 * Computes an inner box by subtracting the given space (e.g. a padding) from the given box.
 *
 * @param box The outer box.
 * @param edges The space to subtract.
 * @returns The resulting inner box.
 */
export function subtractEdges(box: Box, edges: BoxEdges) {
  return {
    x: box.x + (edges?.left ?? 0),
    y: box.y + (edges?.top ?? 0),
    width: Math.max(0, box.width - (edges?.left ?? 0) - (edges?.right ?? 0)),
    height: Math.max(0, box.height - (edges?.top ?? 0) - (edges?.bottom ?? 0)),
  };
}

/**
 * Parses a given value as a box lengths definition (`BoxLengths | Length`) to the lengths of the
 * edges.
 * Throws if the given input is invalid.
 *
 * @param input the input value
 * @returns an object with the four edges in `pt`, or `undefined` if the input is missing or `null`
 */
export function parseEdges(input?: unknown): BoxEdges | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number' || typeof input === 'string') {
    const value = parseLength(input);
    return { right: value, left: value, top: value, bottom: value };
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    return {
      right: parseLength(obj.right ?? obj.x ?? 0),
      left: parseLength(obj.left ?? obj.x ?? 0),
      top: parseLength(obj.top ?? obj.y ?? 0),
      bottom: parseLength(obj.bottom ?? obj.y ?? 0),
    };
  }
  throw new TypeError(`Invalid box lengths: '${input}'`);
}

/**
 * Converts a length definition into the corresponding value in points (`pt`).
 * Throws if the given value is not a valid length.
 *
 * @param input the input value
 * @returns the length in `pt`, or `undefined` if the input is missing or `null`
 */
export function parseLength(input?: unknown): number | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const unit = input.slice(-2);
    if (unit === 'pt' || unit === 'in' || unit === 'mm' || unit === 'cm') {
      const value = parseFloat(input.slice(0, -2));
      if (Number.isFinite(value)) {
        return convertToPt(value, unit);
      }
    }
  }
  throw new TypeError(`Invalid length: '${input}'`);
}

function convertToPt(value: number, fromUnit: LengthUnit): number {
  // 1in = 72pt = 25.4mm
  switch (fromUnit) {
    case 'pt':
      return value * 1;
    case 'in':
      return value * 72;
    case 'mm':
      return (value * 72) / 25.4;
    case 'cm':
      return (value * 72) / 2.54;
    default:
      throw new TypeError(`Invalid unit: '${fromUnit}'`);
  }
}
