import { PDFDocument, PDFImage } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { pickDefined, readAs, readObject, required } from './types.js';

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
};

export type Image = {
  name: string;
  pdfImage: PDFImage;
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

export async function embedImages(imageDefs: ImageDef[], doc: PDFDocument): Promise<Image[]> {
  return await Promise.all(
    imageDefs.map(async (def) => {
      const pdfImage = await doc.embedJpg(def.data).catch((error) => {
        throw new Error(`Could not embed image "${def.name}": ${error.message ?? error}`);
      });
      return pickDefined({ name: def.name, pdfImage });
    })
  );
}
