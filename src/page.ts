import { type PDFPage } from '@ralfstx/pdf-core';

import type { Size } from './box.ts';
import type { Color } from './colors.ts';
import type { Frame } from './frame.ts';

export type TextState = {
  color?: Color;
  font?: string;
  size?: number;
  rise?: number;
  charSpace?: number;
};

export type Page = {
  size: Size;
  content: Frame;
  header?: Frame;
  footer?: Frame;
  pdfPage: PDFPage;
  textState?: TextState;
};
