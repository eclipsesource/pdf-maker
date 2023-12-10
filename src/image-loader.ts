import { toUint8Array } from 'pdf-lib';

import { Image, ImageDef, ImageFormat, ImageSelector } from './images.js';
import { readJpegInfo } from './images/jpeg.js';
import { readPngInfo } from './images/png.js';

export type LoadedImage = {
  format: ImageFormat;
  data: Uint8Array;
};

export type ImageLoader = {
  loadImage(selector: ImageSelector): Promise<LoadedImage>;
};

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

export type ImageStore = {
  selectImage(selector: ImageSelector): Promise<Image>;
};

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
    const { width, height } = format === 'png' ? readPngInfo(data) : readJpegInfo(data);
    return { name: selector.name, format, data, width, height };
  }
}
