import { readFile } from 'node:fs/promises';

import { toUint8Array } from 'pdf-lib';

import { Image, ImageDef, ImageFormat, ImageSelector } from './images.js';
import { isJpeg, readJpegInfo } from './images/jpeg.js';
import { isPng, readPngInfo } from './images/png.js';

export type LoadedImage = {
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
    let data: Uint8Array;
    if (imageDef) {
      data = toUint8Array(imageDef.data);
      return { data };
    }
    try {
      data = await readFile(selector.name);
      return { data };
    } catch (error) {
      throw new Error(
        `Could not load image '${selector.name}': ${(error as Error)?.message ?? error}`
      );
    }
  }
}

export type ImageStore = {
  selectImage(selector: ImageSelector): Promise<Image>;
};

export function createImageStore(imageLoader: ImageLoader): ImageStore {
  const imageCache: Record<string, Promise<Image>> = {};

  return {
    selectImage,
  };

  async function selectImage(selector: ImageSelector): Promise<Image> {
    const cacheKey = [selector.name, selector.height ?? 'any', selector.width ?? 'any'].join(':');
    return (imageCache[cacheKey] ??= loadImage(selector));
  }

  async function loadImage(selector: ImageSelector): Promise<Image> {
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
    const { data } = loadedImage;
    const format = determineImageFormat(data);
    const { width, height } = format === 'png' ? readPngInfo(data) : readJpegInfo(data);
    return { name: selector.name, format, data, width, height };
  }
}

function determineImageFormat(data: Uint8Array): ImageFormat {
  if (isPng(data)) return 'png';
  if (isJpeg(data)) return 'jpeg';
  throw new Error('Unknown image format');
}
