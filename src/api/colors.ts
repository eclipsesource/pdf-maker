export type Color = NamedColor | HTMLColor;

export type NamedColor = keyof typeof namedColors;

/**
 * A color specified in the hexadecimal format `#xxxxxx` that is usual in HTML.
 */
export type HTMLColor = `#${string}`;

export const namedColors: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  gray: [0.5, 0.5, 0.5],
  white: [1, 1, 1],
  red: [1, 0, 0],
  blue: [0, 0, 1],
  green: [0, 0.5, 0],
  cyan: [0, 1, 1],
  magenta: [1, 0, 1],
  yellow: [1, 1, 0],
  lightgray: [0.83, 0.83, 0.83],
  darkgray: [0.66, 0.66, 0.66],
};
