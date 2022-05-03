import { Color, rgb } from 'pdf-lib';

import { typeError } from './types.js';

export { Color };

export function parseColor(input: unknown): Color {
  if (typeof input === 'string') {
    if (/^#[0-9a-f]{6}$/.test(input)) {
      const r = parseInt(input.slice(1, 3), 16) / 255;
      const g = parseInt(input.slice(3, 5), 16) / 255;
      const b = parseInt(input.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    }
    const color = namedColors[input];
    if (color) return color;
    throw typeError('valid color name', input);
  }
  throw typeError('valid color', input);
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
