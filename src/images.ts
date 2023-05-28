import { JpegEmbedder, PDFDocument, PDFRef, toUint8Array } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { readAs, readObject, required } from './types.js';

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
};

export type Image = {
  name: string;
  width: number;
  height: number;
  data: Uint8Array;
  pdfRef?: PDFRef;
};

export function readImages(input: unknown): ImageDef[] {
  return Object.entries(readObject(input)).map(([name, imageDef]) => {
    const { data } = readAs(imageDef, name, required(readImage));
    return { name, data };
  });
}

function readImage(input: unknown): { data: Uint8Array } {
  return readObject(input, { data: required(parseBinaryData) }) as { data: Uint8Array };
}

export async function loadImages(imageDefs: ImageDef[]): Promise<Image[]> {
  return await Promise.all(
    imageDefs.map(async (def) => {
      const data = toUint8Array(def.data);
      const { width, height } = await JpegEmbedder.for(data);
      return { name: def.name, width, height, data };
    })
  );
}

export async function embedImages(images: Image[], pdfDoc: PDFDocument): Promise<void> {
  await Promise.all(
    images.map(async (image) => {
      try {
        const pdfImage = await pdfDoc.embedJpg(image.data);
        image.pdfRef = pdfImage.ref;
      } catch (error) {
        throw new Error(
          `Could not embed image "${image.name}": ${(error as Error)?.message ?? error}`
        );
      }
    })
  );
}
