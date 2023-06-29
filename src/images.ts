import { JpegEmbedder, PDFDocument, PDFRef, PngEmbedder, toUint8Array } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { optional, readAs, readObject, required, types } from './types.js';

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
  format: 'jpeg' | 'png';
};

export type Image = {
  name: string;
  width: number;
  height: number;
  data: Uint8Array;
  format: 'jpeg' | 'png';
  pdfRef?: PDFRef;
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
    format: optional(types.string({ enum: ['jpeg', 'png'] })),
  }) as { data: Uint8Array; format?: 'jpeg' | 'png' };
}

export async function loadImages(imageDefs: ImageDef[]): Promise<Image[]> {
  return await Promise.all(
    imageDefs.map(async (def) => {
      const data = toUint8Array(def.data);
      const embedder = await (def.format === 'png'
        ? PngEmbedder.for(data)
        : JpegEmbedder.for(data));
      const { width, height } = embedder;
      return { name: def.name, format: def.format, data, width, height };
    })
  );
}

export function registerImage(image: Image, pdfDoc: PDFDocument) {
  const ref = pdfDoc.context.nextRef();
  (pdfDoc as any).images.push({
    async embed() {
      try {
        const embedder = await (image.format === 'png'
          ? PngEmbedder.for(image.data)
          : JpegEmbedder.for(image.data));
        embedder.embedIntoContext(pdfDoc.context, ref);
      } catch (error) {
        throw new Error(
          `Could not embed image "${image.name}": ${(error as Error)?.message ?? error}`
        );
      }
    },
  });
  return ref;
}
