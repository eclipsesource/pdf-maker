import { PDFDocument, PDFImage } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { asObject, check, getFrom, optional, pickDefined, required } from './types.js';

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
};

export type Image = {
  name: string;
  pdfImage: PDFImage;
};

export function parseImages(input: unknown): ImageDef[] {
  const obj = check(input, 'images', optional(asObject)) ?? {};
  return Object.entries(obj).map(([name, imageDef]) => {
    const data = check(imageDef, `images > ${name}`, required(parseImage));
    return { name, data };
  });
}

function parseImage(input: unknown): Uint8Array {
  return getFrom(asObject(input), 'data', required(parseBinaryData));
}

export async function embedImages(imageDefs: ImageDef[], doc: PDFDocument): Promise<Image[]> {
  return await Promise.all(
    imageDefs.map(async (def) => {
      const pdfImage = await doc.embedJpg(def.data).catch((error) => {
        throw new Error(`Could not embed image "${def.name}": ${error.message ?? error}`);
      });
      return pickDefined({ name: def.name, pdfImage }) as Image;
    })
  );
}
