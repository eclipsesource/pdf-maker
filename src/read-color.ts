import { type Color, rgb } from 'pdf-lib';

import { namedColors } from './api/colors.ts';
import { isObject, typeError } from './types.ts';

export { type Color };

export function readColor(input: unknown): Color {
  if (isObject(input) && input.type === 'RGB') {
    return input as unknown as Color;
  }
  if (typeof input === 'string') {
    if (/^#[0-9a-f]{6}$/.test(input)) {
      const r = parseInt(input.slice(1, 3), 16) / 255;
      const g = parseInt(input.slice(3, 5), 16) / 255;
      const b = parseInt(input.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    }
    const color = namedColors[input as keyof typeof namedColors];
    if (color) return rgb(...color);
    throw typeError('valid color name', input);
  }
  throw typeError('valid color', input);
}
