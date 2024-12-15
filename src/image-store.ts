import { parseBinaryData } from './binary-data.ts';
import { createDataLoader, type DataLoader } from './data-loader.ts';
import { readRelativeFile } from './fs.ts';
import type { Image, ImageDef, ImageFormat } from './images.ts';
import { isJpeg, readJpegInfo } from './images/jpeg.ts';
import { isPng, readPngInfo } from './images/png.ts';

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
    const { width, height } = format === 'png' ? readPngInfo(data) : readJpegInfo(data);
    return { url, format, data, width, height };
  }

  async loadImageData(url: string): Promise<Uint8Array> {
    const imageDef = this.#images.find((image) => image.name === url);
    if (imageDef) {
      return parseBinaryData(imageDef.data);
    }

    const urlSchema = /^(\w+):/.exec(url)?.[1];
    try {
      if (urlSchema) {
        const { data } = await this.#dataLoader(url);
        return data;
      }
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
