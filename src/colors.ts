import { Color as PdfColor, rgb } from 'pdf-lib';

export function parseColor(def?: unknown): PdfColor | undefined {
  if (def == null) return undefined;
  if (typeof def === 'string') {
    if (/^#[0-9a-f]{6}$/.test(def)) {
      const r = parseInt(def.slice(1, 3), 16) / 255;
      const g = parseInt(def.slice(3, 5), 16) / 255;
      const b = parseInt(def.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    }
    const color = namedColors[def];
    if (!color) {
      throw new Error(`Unsupported color name: '${def}'`);
    }
    return color;
  }
  throw new Error(`Invalid color: ${def}`);
}

export const namedColors = {
  black: rgb(0, 0, 0),
  gray: rgb(0.5, 0.5, 0.5),
  white: rgb(1, 1, 1),
  red: rgb(1, 0, 0),
  blue: rgb(0, 0, 1),
  green: rgb(0, 0.5, 0),
  cyan: rgb(0, 1, 1),
  magenta: rgb(1, 0, 1),
  yellow: rgb(1, 1, 0),
  lightgray: rgb(0.83, 0.83, 0.83),
  darkgray: rgb(0.66, 0.66, 0.66),
};
