import { JpegEmbedder, PDFDocument, PDFRef, PngEmbedder, toUint8Array } from 'pdf-lib';

import { parseBinaryData } from './binary-data.js';
import { optional, readAs, readObject, required, types } from './types.js';

export type ImageDef = {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
  format: 'jpeg' | 'png';
};

export type LoadedImage = {
  format: 'jpeg' | 'png';
  data: Uint8Array;
};

export type ImageLoader = {
  loadImage(selector: ImageSelector): Promise<LoadedImage>;
};

export type ImageStore = {
  selectImage(selector: ImageSelector): Promise<Image>;
};

export type Image = {
  name: string;
  width: number;
  height: number;
  data: Uint8Array;
  format: 'jpeg' | 'png';
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
  }) as { data: Uint8Array; format?: 'jpeg' | 'png' };
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

export function createImageLoader(images: ImageDef[]): ImageLoader {
  return {
    loadImage,
  };

  async function loadImage(selector: ImageSelector): Promise<LoadedImage> {
    const imageDef = images.find((image) => image.name === selector.name);
    if (!imageDef) {
      throw new Error(`No image defined with name '${selector.name}'`);
    }
    const data = toUint8Array(imageDef.data);
    return {
      format: imageDef.format,
      data,
    };
  }
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
