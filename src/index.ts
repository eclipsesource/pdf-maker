import * as colors from './api/colors.ts';
import * as document from './api/document.ts';
import * as graphics from './api/graphics.ts';
import * as layout from './api/layout.ts';
import * as makePdf from './api/make-pdf.ts';
import * as sizes from './api/sizes.ts';
import * as text from './api/text.ts';

export const pdf = {
  ...colors,
  ...document,
  ...graphics,
  ...layout,
  ...makePdf,
  ...sizes,
  ...text,
};

export * from './api/colors.ts';
export * from './api/document.ts';
export * from './api/graphics.ts';
export * from './api/layout.ts';
export * from './api/make-pdf.ts';
export * from './api/sizes.ts';
export * from './api/text.ts';
