import { PDFImage } from '@ralfstx/pdf-core';

import { createDataLoader, type DataLoader } from './data-loader.ts';
import { readRelativeFile } from './fs.ts';
import type { Image, ImageDef, ImageFormat } from './images.ts';

export class ImageStore {
  readonly #images: ImageDef[];
  readonly #imageCache: Record<string, Promise<Image>> = {};
  #dataLoader: DataLoader;

  constructor(images?: ImageDef[]) {
    this.#images = images ?? [];
    this.#dataLoader = createDataLoader();
  }

  setResourceRoot(root: string) {
    this.#dataLoader = createDataLoader({ resourceRoot: root });
  }

  selectImage(url: string): Promise<Image> {
    return (this.#imageCache[url] ??= this.loadImage(url));
  }

  async loadImage(url: string): Promise<Image> {
    const data = await this.loadImageData(url);
    const format = determineImageFormat(data);
    if (format === 'jpeg') {
      const pdfImage = PDFImage.fromJpeg(data);
      const { width, height } = pdfImage;
      return { url, format, width, height, pdfImage };
    }
    if (format === 'png') {
      const pdfImage = PDFImage.fromPng(data);
      const { width, height } = pdfImage;
      return { url, format, width, height, pdfImage };
    }
    throw new Error(`Unsupported image format: ${format}`);
  }

  async loadImageData(url: string): Promise<Uint8Array> {
    const imageDef = this.#images.find((image) => image.name === url);
    if (imageDef) {
      return imageDef.data;
    }

    const urlSchema = /^(\w+):/.exec(url)?.[1];
    try {
      if (urlSchema) {
        const { data } = await this.#dataLoader(url);
        return data;
      }
      console.warn(
        `Loading images from file names is deprecated ('${url}'). Use file:/ URLs instead.`,
      );
      const data = await readRelativeFile('/', url.replace(/^\/+/, ''));
      return new Uint8Array(data);
    } catch (error) {
      throw new Error(`Could not load image '${url}'`, { cause: error });
    }
  }
}

function determineImageFormat(data: Uint8Array): ImageFormat {
  if (isPng(data)) return 'png';
  if (isJpeg(data)) return 'jpeg';
  throw new Error('Unknown image format');
}

function isJpeg(data: Uint8Array): boolean {
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

function isPng(data: Uint8Array): boolean {
  // check PNG signature
  return hasBytes(data, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function hasBytes(data: Uint8Array, offset: number, bytes: number[]) {
  for (let i = 0; i < bytes.length; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}
