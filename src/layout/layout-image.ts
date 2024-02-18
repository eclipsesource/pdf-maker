import { Box, Pos, Size } from '../box.js';
import { ImageObject, RenderObject } from '../frame.js';
import { Image } from '../images.js';
import { MakerCtx } from '../maker-ctx.js';
import { ImageBlock } from '../read-block.js';
import { LayoutContent } from './layout.js';

export async function layoutImageContent(
  block: ImageBlock,
  box: Box,
  ctx: MakerCtx,
): Promise<LayoutContent> {
  const selector = { name: block.image, width: block.width, height: block.height };
  const image = await ctx.imageStore.selectImage(selector);
  const hasFixedWidth = block.width != null;
  const hasFixedHeight = block.height != null;
  const scale = getScale(image, box, hasFixedWidth, hasFixedHeight);
  const imageSize = { width: image.width * scale, height: image.height * scale };
  const width = block.autoWidth ? imageSize.width : box.width;
  const imageBox = { x: box.x, y: box.y, width, height: imageSize.height };
  const imagePos = align(imageBox, imageSize, block.imageAlign);
  const imageObj: ImageObject = createImageObject(image, imagePos, imageSize);
  const objects: RenderObject[] = [imageObj];
  return {
    frame: {
      objects,
      width,
      height: imageSize.height,
    },
  };
}

function getScale(image: Size, box: Size, fixedWidth: boolean, fixedHeight: boolean): number {
  const xScale = box.width / image.width;
  const yScale = box.height / image.height;
  if (fixedWidth && fixedHeight) return Math.min(xScale, yScale);
  if (fixedWidth) return xScale;
  if (fixedHeight) return yScale;
  return Math.min(xScale, 1);
}

function align(box: Box, size: Size, alignment?: string): Pos {
  const space = { width: box.width - size.width, height: box.height - size.height };
  const is = (a: string) => alignment === a;
  const xShift = is('left') ? 0 : is('right') ? space.width : space.width / 2;
  const yShift = is('top') ? 0 : is('bottom') ? space.height : space.height / 2;
  return { x: box.x + xShift, y: box.y + yShift };
}

function createImageObject(image: Image, pos: Pos, size: Size): ImageObject {
  return { type: 'image', image, x: pos.x, y: pos.y, width: size.width, height: size.height };
}
