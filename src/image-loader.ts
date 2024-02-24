import { readFile } from 'node:fs/promises';

import { toUint8Array } from 'pdf-lib';

import type { Image, ImageDef, ImageFormat, ImageSelector } from './images.ts';
import { isJpeg, readJpegInfo } from './images/jpeg.ts';
import { isPng, readPngInfo } from './images/png.ts';

export type LoadedImage = {
  data: Uint8Array;
};

export class ImageLoader {
  readonly #images: ImageDef[];

  constructor(images: ImageDef[]) {
    this.#images = images;
  }

  async loadImage(selector: ImageSelector): Promise<LoadedImage> {
    const imageDef = this.#images.find((image) => image.name === selector.name);
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
        `Could not load image '${selector.name}': ${(error as Error)?.message ?? error}`,
      );
    }
  }
}

export class ImageStore {
  readonly #imageLoader: ImageLoader;
  readonly #imageCache: Record<string, Promise<Image>> = {};

  constructor(imageLoader: ImageLoader) {
    this.#imageLoader = imageLoader;
  }

  async selectImage(selector: ImageSelector): Promise<Image> {
    const cacheKey = selector.name;
    return (this.#imageCache[cacheKey] ??= this.loadImage(selector));
  }

  async loadImage(selector: ImageSelector): Promise<Image> {
    let loadedImage: LoadedImage;
    try {
      loadedImage = await this.#imageLoader.loadImage(selector);
    } catch (error) {
      throw new Error(
        `Could not load image '${selector.name}': ${(error as Error)?.message ?? error}`,
      );
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
