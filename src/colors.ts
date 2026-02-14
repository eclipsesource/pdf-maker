import type { ContentStream } from '@ralfstx/pdf-core';

export type Color = {
  type: 'RGB';
  red: number;
  green: number;
  blue: number;
};

export const rgb = (red: number, green: number, blue: number): Color => {
  assertRange(red, 'red', 0, 1);
  assertRange(green, 'green', 0, 1);
  assertRange(blue, 'blue', 0, 1);
  return { type: 'RGB', red, green, blue };
};

export function setFillingColor(cs: ContentStream, color: Color): void {
  if (color.type === 'RGB') {
    cs.setFillRGB(color.red, color.green, color.blue);
  } else throw new Error(`Invalid color: ${JSON.stringify(color)}`);
}

export function setStrokingColor(cs: ContentStream, color: Color): void {
  if (color.type === 'RGB') {
    cs.setStrokeRGB(color.red, color.green, color.blue);
  } else throw new Error(`Invalid color: ${JSON.stringify(color)}`);
}

function assertRange(value: number, valueName: string, min: number, max: number) {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new Error(`${valueName} must be a number between ${min} and ${max}, got: ${value}`);
  }
}
