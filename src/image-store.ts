import { readFile } from 'node:fs/promises';

import { toUint8Array } from 'pdf-lib';

import type { Image, ImageDef, ImageFormat } from './images.ts';
import { isJpeg, readJpegInfo } from './images/jpeg.ts';
import { isPng, readPngInfo } from './images/png.ts';

export class ImageStore {
  readonly #images: ImageDef[];
  readonly #imageCache: Record<string, Promise<Image>> = {};

  constructor(images?: ImageDef[]) {
    this.#images = images ?? [];
  }

  selectImage(selector: string): Promise<Image> {
    return (this.#imageCache[selector] ??= this.loadImage(selector));
  }

  async loadImage(selector: string): Promise<Image> {
    const data = await this.loadImageData(selector);
    const format = determineImageFormat(data);
    const { width, height } = format === 'png' ? readPngInfo(data) : readJpegInfo(data);
    return { name: selector, format, data, width, height };
  }

  async loadImageData(selector: string): Promise<Uint8Array> {
    const imageDef = this.#images.find((image) => image.name === selector);
    if (imageDef) {
      return toUint8Array(imageDef.data);
    }
    try {
      return await readFile(selector);
    } catch (error) {
      throw new Error(`Could not load image '${selector}'`, { cause: error });
    }
  }
}

function determineImageFormat(data: Uint8Array): ImageFormat {
  if (isPng(data)) return 'png';
  if (isJpeg(data)) return 'jpeg';
  throw new Error('Unknown image format');
}
