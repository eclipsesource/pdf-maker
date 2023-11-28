import { JpegEmbedder, PDFDocument, PDFRef, PngEmbedder } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { ImageLoader, LoadedImage } from './image-loader.js';
import { optional, readAs, readObject, required, types } from './types.js';

const imageTypes = ['jpeg', 'png'];
export type ImageFormat = (typeof imageTypes)[number];

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
  format: ImageFormat;
};

export type ImageStore = {
  selectImage(selector: ImageSelector): Promise<Image>;
};

export type Image = {
  name: string;
  width: number;
  height: number;
  data: Uint8Array;
  format: ImageFormat;
  pdfRef?: PDFRef;
};

export type ImageSelector = {
  name: string;
  width?: number;
  height?: number;
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
  }) as { data: Uint8Array; format?: ImageFormat };
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

export function createImageStore(imageLoader: ImageLoader): ImageStore {
  return {
    selectImage,
  };

  async function selectImage(selector: ImageSelector): Promise<Image> {
    let loadedImage: LoadedImage;
    try {
      loadedImage = await imageLoader.loadImage(selector);
    } catch (error) {
      const selectorStr =
        `'${selector.name}'` +
        (selector.width != null ? `, width=${selector.width}` : '') +
        (selector.height != null ? `, height=${selector.height}` : '');
      throw new Error(`Could not load image ${selectorStr}: ${(error as Error)?.message ?? error}`);
    }

    const { format, data } = loadedImage;
    const embedder = await (format === 'png' ? PngEmbedder.for(data) : JpegEmbedder.for(data));
    const { width, height } = embedder;
    return { name: selector.name, format, data, width, height };
  }
}
