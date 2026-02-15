import { PDFImage } from '@ralfstx/pdf-core';

import { createDataLoader, type DataLoader } from './data-loader.ts';

type ImageFormat = 'jpeg' | 'png';

export type ImageLoader = (url: string) => Promise<PDFImage>;

export function createImageLoader(resourceRoot?: string): ImageLoader {
  const dataLoader = createDataLoader(resourceRoot ? { resourceRoot } : undefined);
  const cache: Record<string, Promise<PDFImage>> = {};
  return (url) => (cache[url] ??= loadImage(url, dataLoader));
}

async function loadImage(url: string, dataLoader: DataLoader): Promise<PDFImage> {
  const { data } = await dataLoader(url);
  const format = determineImageFormat(data);
  return format === 'jpeg' ? PDFImage.fromJpeg(data) : PDFImage.fromPng(data);
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
  return hasBytes(data, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function hasBytes(data: Uint8Array, offset: number, bytes: number[]) {
  for (let i = 0; i < bytes.length; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}
