import { PDFImage } from 'pdf-lib';

import { Box, Pos, Size, subtractEdges, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { DrawableObject, Frame } from './layout.js';
import { ImageBlock } from './text.js';

export type ImageObject = {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  image: PDFImage;
};

export function layoutImage(block: ImageBlock, box: Box, doc: Document): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const paddingWidth = padding.left + padding.right;
  const paddingHeight = padding.top + padding.bottom;
  const fixedWidth = block.width;
  const fixedHeight = block.height;

  const image = doc.images.find((image) => image.name === block.image)?.pdfImage;
  if (!image) throw new Error(`Unknown image: ${block.image}`);

  const xScale = ((fixedWidth ?? box.width) - paddingWidth) / image.width;
  const yScale = (fixedHeight - paddingHeight) / image.height;
  const hasFixedWidth = fixedWidth != null;
  const hasFixedHeight = fixedHeight != null;

  const scale = hasFixedWidth
    ? hasFixedHeight
      ? Math.min(xScale, yScale)
      : xScale
    : hasFixedHeight
    ? yScale
    : Math.min(xScale, 1);

  const imageSize = { width: image.width * scale, height: image.height * scale };

  const width = fixedWidth ?? box.width;
  const height = fixedHeight ?? imageSize.height + paddingHeight;

  const imageBox = subtractEdges({ x: 0, y: 0, width, height }, padding);
  const imagePos = align(block.imageAlign, imageBox, imageSize);

  const imageObj: ImageObject = createImageObject(image, imagePos, imageSize);
  const objects: DrawableObject[] = [imageObj];
  return { type: 'image', x: box.x, y: box.y, width, height, objects };
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
