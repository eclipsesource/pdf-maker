import type { PDFImage } from '@ralfstx/pdf-core';

import { readBinaryData } from './binary-data.ts';
import { optional, readAs, readObject, required, types } from './types.ts';

const imageFormats = ['jpeg', 'png'];
export type ImageFormat = (typeof imageFormats)[number];

export type ImageDef = {
  name: string;
  data: Uint8Array;
  format: ImageFormat;
};

export type Image = {
  url: string;
  width: number;
  height: number;
  format: ImageFormat;
  pdfImage: PDFImage;
};

export function readImages(input: unknown): ImageDef[] {
  return Object.entries(readObject(input)).map(([name, imageDef]) => {
    const { data, format } = readAs(imageDef, name, required(readImage));
    return { name, data, format: format ?? 'jpeg' };
  });
}

function readImage(input: unknown) {
  return readObject(input, {
    data: required(readBinaryData),
    format: optional(types.string({ enum: imageFormats })),
  }) as { data: Uint8Array; format?: ImageFormat };
}
