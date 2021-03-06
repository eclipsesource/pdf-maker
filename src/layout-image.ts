import { PDFImage } from 'pdf-lib';

import { Box, Pos, Size } from './box.js';
import { Document } from './document.js';
import { Frame, RenderObject } from './layout.js';
import { ImageBlock } from './read-block.js';

export type ImageObject = {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  image: PDFImage;
};

export function layoutImageContent(block: ImageBlock, box: Box, doc: Document): Partial<Frame> {
  const image = doc.images.find((image) => image.name === block.image)?.pdfImage;
  if (!image) throw new Error(`Unknown image: ${block.image}`);
  const hasFixedWidth = block.width != null;
  const hasFixedHeight = block.height != null;
  const scale = getScale(image, box, hasFixedWidth, hasFixedHeight);
  const imageSize = { width: image.width * scale, height: image.height * scale };
  const imageBox = { x: box.x, y: box.y, width: box.width, height: imageSize.height };
  const imagePos = align(block.imageAlign, imageBox, imageSize);
  const imageObj: ImageObject = createImageObject(image, imagePos, imageSize);
  const objects: RenderObject[] = [imageObj];
  return { objects, height: imageSize.height };
}

function getScale(image: Size, box: Size, fixedWidth: boolean, fixedHeight: boolean): number {
  const xScale = box.width / image.width;
  const yScale = box.height / image.height;
  if (fixedWidth && fixedHeight) return Math.min(xScale, yScale);
  if (fixedWidth) return xScale;
  if (fixedHeight) return yScale;
  return Math.min(xScale, 1);
}

function align(alignment: string, box: Box, size: Size): Pos {
  const space = { width: box.width - size.width, height: box.height - size.height };
  const is = (a: string) => alignment === a;
  const xShift = is('left') ? 0 : is('right') ? space.width : space.width / 2;
  const yShift = is('top') ? 0 : is('bottom') ? space.height : space.height / 2;
  return { x: box.x + xShift, y: box.y + yShift };
}

function createImageObject(image: PDFImage, pos: Pos, size: Size): ImageObject {
  return { type: 'image', image, x: pos.x, y: pos.y, width: size.width, height: size.height };
}
