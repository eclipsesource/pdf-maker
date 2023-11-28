import { toUint8Array } from 'pdf-lib';

import { ImageDef, ImageFormat as ImageFormat, ImageSelector } from './images.js';

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
