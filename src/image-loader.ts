import { PDFImage } from '@ralfstx/pdf-core';

import { createDataLoader, type DataLoader } from './data-loader.ts';
import type { SvgImage } from './svg/svg-compiler.ts';
import { compileSvg } from './svg/svg-compiler.ts';
import { parseXml } from './util/xml.ts';

/**
 * An image that has been loaded and prepared for embedding. Bitmap
 * images (JPEG and PNG) are represented by a `PDFImage`, SVG images by
 * an `SvgImage` that wraps a form XObject. Both carry their intrinsic
 * size in pt.
 */
export type LoadedImage = PDFImage | SvgImage;

export type ImageLoader = (url: string) => Promise<LoadedImage>;

export function createImageLoader(resourceRoot?: string): ImageLoader {
  const dataLoader = createDataLoader(resourceRoot ? { resourceRoot } : undefined);
  const cache: Record<string, Promise<LoadedImage>> = {};
  return (url) => (cache[url] ??= loadImage(url, dataLoader));
}

export function isSvgImage(image: LoadedImage): image is SvgImage {
  return 'xobject' in image;
}

async function loadImage(url: string, dataLoader: DataLoader): Promise<LoadedImage> {
  const { data } = await dataLoader(url);
  if (isPng(data)) return PDFImage.fromPng(data);
  if (isJpeg(data)) return PDFImage.fromJpeg(data);
  if (isXml(data)) return compileSvg(parseXml(new TextDecoder().decode(data)));
  throw new Error('Unknown image format');
}

function isJpeg(data: Uint8Array): boolean {
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

function isPng(data: Uint8Array): boolean {
  return hasBytes(data, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

/**
 * Checks whether the data looks like an XML document, i.e. whether the
 * first character is a `<`, ignoring a leading byte order mark and
 * whitespace.
 */
function isXml(data: Uint8Array): boolean {
  let pos = hasBytes(data, 0, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  while (pos < data.length && isWhitespace(data[pos])) pos++;
  return data[pos] === 0x3c;
}

function isWhitespace(byte: number): boolean {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}

function hasBytes(data: Uint8Array, offset: number, bytes: number[]) {
  for (let i = 0; i < bytes.length; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}
