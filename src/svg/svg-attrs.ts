/*
 * Parsers for SVG attribute micro-syntaxes: lengths with units,
 * numbers and number lists, transform lists, opacity values, dash
 * arrays, and inline `style` attributes. All parsers are lenient and
 * return `undefined` for invalid input instead of throwing, so that
 * unsupported or malformed values can be ignored silently.
 */
import type { Size } from '../box.ts';
import { checkPdfNumbers, multiplyMatrices, round } from '../util/utils.ts';
import type { XmlElement } from '../util/xml.ts';

export type Matrix = [number, number, number, number, number, number];

export const identityMatrix: Matrix = [1, 0, 0, 1, 0, 0];

export function isIdentityMatrix(matrix: Matrix): boolean {
  return identityMatrix.every((value, idx) => matrix[idx] === value);
}

/**
 * Combines two transforms into one. The first matrix is applied to
 * coordinates first, then the second.
 */
export function combineMatrices(first: Matrix, second: Matrix): Matrix {
  // multiplyMatrices(m1, m2) applies m2 to coordinates first, then m1
  return multiplyMatrices(second, first) as Matrix;
}

/**
 * Rounds all components of a matrix to the precision used in content
 * streams. Throws if the result is not a valid PDF number, which is
 * where computed matrices are guarded: a transform can overflow when it
 * is combined with another, and even in the rounding itself, since
 * `round()` multiplies by the precision factor.
 */
export function roundMatrix(matrix: Matrix): Matrix {
  const rounded = matrix.map((value) => round(value)) as Matrix;
  checkPdfNumbers(rounded, 'Invalid transformation matrix');
  return rounded;
}

/**
 * The reference length that non-axis percentages (e.g. `r`,
 * `stroke-width`) resolve against: `sqrt(width² + height²) / sqrt(2)`.
 */
export function viewportDiagonal(viewport: Size): number {
  return Math.sqrt(viewport.width ** 2 + viewport.height ** 2) / Math.SQRT2;
}

const numberPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const lengthPattern = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-z%]*)$/i;

// Conversion factors to pt. One SVG user unit (or px) equals one pt.
const unitFactors: Record<string, number> = {
  px: 1,
  pt: 1,
  in: 72,
  pc: 12,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
};

export function parseNumber(str: string | undefined): number | undefined {
  if (str == null) return undefined;
  const s = str.trim();
  return numberPattern.test(s) ? parseFloat(s) : undefined;
}

/**
 * Parses a length value with an optional unit into pt. Percentages
 * resolve against the given reference length; without a reference,
 * they are invalid. Font-relative units (`em`, `ex`) are unsupported.
 */
export function parseLength(str: string | undefined, percentRef?: number): number | undefined {
  if (str == null) return undefined;
  const match = lengthPattern.exec(str.trim());
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (!unit) return value;
  if (unit === '%') {
    return percentRef == null ? undefined : (value / 100) * percentRef;
  }
  const factor = unitFactors[unit];
  return factor == null ? undefined : value * factor;
}

/**
 * Parses a whitespace- or comma-separated list of numbers. Parsing
 * stops at the first invalid entry and returns the numbers up to it.
 */
export function parseNumberList(str: string | undefined): number[] {
  const result: number[] = [];
  if (str == null) return result;
  for (const token of str.trim().split(/[\s,]+/)) {
    const value = parseNumber(token);
    if (value === undefined) break;
    result.push(value);
  }
  return result;
}

/**
 * Parses an opacity value (a number or a percentage), clamped to the
 * range [0, 1].
 */
export function parseOpacity(str: string | undefined): number | undefined {
  if (str == null) return undefined;
  const s = str.trim();
  const percent = s.endsWith('%');
  const value = parseNumber(percent ? s.slice(0, -1) : s);
  if (value === undefined) return undefined;
  return Math.min(1, Math.max(0, percent ? value / 100 : value));
}

/**
 * Parses a `stroke-dasharray` value. Returns an empty array when the
 * value disables dashing (`none`, a negative value, or all zeros), and
 * `undefined` when the value is invalid and should be ignored.
 */
export function parseDashArray(str: string | undefined, percentRef?: number): number[] | undefined {
  if (str == null) return undefined;
  const s = str.trim();
  if (!s) return undefined;
  if (s === 'none') return [];
  const values: number[] = [];
  for (const token of s.split(/[\s,]+/)) {
    const value = parseLength(token, percentRef);
    if (value === undefined) return undefined;
    if (value < 0) return [];
    values.push(value);
  }
  if (values.every((value) => value === 0)) return [];
  return values;
}

const transformFnPattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;

/**
 * Parses an SVG transform list into a single matrix. Transforms are
 * combined in list order, i.e. the last transform in the list is
 * applied to coordinates first. Returns `undefined` for an empty or
 * invalid transform list.
 */
export function parseTransform(str: string | undefined): Matrix | undefined {
  if (str == null || !str.trim()) return undefined;
  const matrices: Matrix[] = [];
  let lastIndex = 0;
  transformFnPattern.lastIndex = 0;
  for (let match; (match = transformFnPattern.exec(str));) {
    if (/[^\s,]/.test(str.slice(lastIndex, match.index))) return undefined;
    lastIndex = transformFnPattern.lastIndex;
    const argsStr = match[2].trim();
    const args = argsStr ? argsStr.split(/[\s,]+/).map((arg) => parseNumber(arg)) : [];
    if (args.some((arg) => arg === undefined)) return undefined;
    const matrix = transformFunction(match[1], args as number[]);
    if (!matrix) return undefined;
    matrices.push(matrix);
  }
  if (/[^\s,]/.test(str.slice(lastIndex))) return undefined;
  if (!matrices.length) return undefined;
  return matrices.reduce((m1, m2) => multiplyMatrices(m1, m2) as Matrix);
}

function transformFunction(name: string, args: number[]): Matrix | undefined {
  switch (name) {
    case 'matrix':
      return args.length === 6 ? (args as Matrix) : undefined;
    case 'translate': {
      if (args.length < 1 || args.length > 2) return undefined;
      const [tx, ty = 0] = args;
      return [1, 0, 0, 1, tx, ty];
    }
    case 'scale': {
      if (args.length < 1 || args.length > 2) return undefined;
      const [sx, sy = sx] = args;
      return [sx, 0, 0, sy, 0, 0];
    }
    case 'rotate': {
      if (args.length !== 1 && args.length !== 3) return undefined;
      const [angle, cx = 0, cy = 0] = args;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = cx - cx * cos + cy * sin;
      const dy = cy - cx * sin - cy * cos;
      return [cos, sin, -sin, cos, dx, dy];
    }
    case 'skewX':
      return args.length === 1 ? [1, 0, Math.tan((args[0] * Math.PI) / 180), 1, 0, 0] : undefined;
    case 'skewY':
      return args.length === 1 ? [1, Math.tan((args[0] * Math.PI) / 180), 0, 1, 0, 0] : undefined;
    default:
      return undefined;
  }
}

/**
 * Parses the declarations of an inline `style` attribute.
 */
export function parseStyle(str: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (str == null) return result;
  for (const declaration of str.split(';')) {
    const idx = declaration.indexOf(':');
    if (idx <= 0) continue;
    const name = declaration.slice(0, idx).trim();
    const value = declaration.slice(idx + 1).trim();
    if (name && value) result[name] = value;
  }
  return result;
}

/**
 * Returns the element's attributes merged with the declarations of its
 * inline `style` attribute. Style declarations take precedence over
 * presentation attributes of the same name.
 */
export function getMergedAttrs(element: XmlElement): Record<string, string> {
  const style = element.attrs.style;
  return style ? { ...element.attrs, ...parseStyle(style) } : element.attrs;
}
