import type { PDFImage } from '@ralfstx/pdf-core';

export type ImageFormat = 'jpeg' | 'png';

export type Image = {
  url: string;
  width: number;
  height: number;
  format: ImageFormat;
  pdfImage: PDFImage;
};
