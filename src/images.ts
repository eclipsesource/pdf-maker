import type { PDFDocument, PDFRef } from 'pdf-lib';
import { JpegEmbedder, PngEmbedder } from 'pdf-lib';

import { parseBinaryData } from './binary-data.ts';
import { optional, readAs, readObject, required, types } from './types.ts';

const imageFormats = ['jpeg', 'png'];
export type ImageFormat = (typeof imageFormats)[number];

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
  format: ImageFormat;
};

export type Image = {
  url: string;
  width: number;
  height: number;
  data: Uint8Array;
  format: ImageFormat;
};

export function readImages(input: unknown): ImageDef[] {
  return Object.entries(readObject(input)).map(([name, imageDef]) => {
    const { data, format } = readAs(imageDef, name, required(readImage));
    return { name, data, format: format ?? 'jpeg' };
  });
}

function readImage(input: unknown) {
  return readObject(input, {
    data: required(parseBinaryData),
    format: optional(types.string({ enum: imageFormats })),
  }) as { data: Uint8Array; format?: ImageFormat };
}

export function registerImage(image: Image, pdfDoc: PDFDocument): PDFRef {
  const registeredImages = ((pdfDoc as any)._pdfmkr_registeredImages ??= {});
  if (image.url in registeredImages) return registeredImages[image.url];
  const ref = pdfDoc.context.nextRef();
  (pdfDoc as any).images.push({
    async embed() {
      try {
        const embedder = await (image.format === 'png'
          ? PngEmbedder.for(image.data)
          : JpegEmbedder.for(image.data));
        embedder.embedIntoContext(pdfDoc.context, ref);
      } catch (error) {
        throw new Error(`Could not embed image "${image.url}"`, { cause: error });
      }
    },
  });
  registeredImages[image.url] = ref;
  return ref;
}
