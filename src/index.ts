import * as colors from './api/colors.ts';
import * as document from './api/document.ts';
import * as graphics from './api/graphics.ts';
import * as layout from './api/layout.ts';
import * as pdfMaker from './api/PdfMaker.ts';
import * as sizes from './api/sizes.ts';
import * as text from './api/text.ts';

export const pdf = {
  ...colors,
  ...document,
  ...graphics,
  ...layout,
  ...pdfMaker,
  ...sizes,
  ...text,
};

export * from './api/colors.ts';
export * from './api/document.ts';
export * from './api/graphics.ts';
export * from './api/layout.ts';
export * from './api/PdfMaker.ts';
export * from './api/sizes.ts';
export * from './api/text.ts';
