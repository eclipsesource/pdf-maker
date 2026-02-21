import type { PDFEmbeddedFont } from '@ralfstx/pdf-core';

import type { FontStyle, FontWeight } from './api/text.ts';
import { printValue } from './util/print-value.ts';

/**
 * The resolved definition of a font.
 */
export type FontDef = {
  family: string;
  style: FontStyle;
  weight: number;
  data: Uint8Array;
  pdfFont?: PDFEmbeddedFont;
};

export type FontSelector = {
  fontFamily?: string;
  fontStyle?: FontStyle;
  fontWeight?: FontWeight;
};

export function weightToNumber(weight: FontWeight): number {
  if (weight === 'normal') {
    return 400;
  }
  if (weight === 'bold') {
    return 700;
  }
  if (typeof weight !== 'number' || !isFinite(weight) || weight < 1 || weight > 1000) {
    throw new Error(`Invalid font weight: ${printValue(weight)}`);
  }
  return weight;
}
