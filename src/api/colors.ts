export type Color = NamedColor | HTMLColor;

export type NamedColor = keyof typeof namedColors;

/**
 * A color specified in the hexadecimal format `#xxxxxx` that is usual in HTML.
 */
export type HTMLColor = `#${string}`;

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

function rgb(red: number, green: number, blue: number): [number, number, number] {
  return [red, green, blue];
}
