import { Box, ZERO_EDGES } from './box.js';
import { ImageObject } from './graphics.js';
import { createAnchorObject, Frame, Resources } from './layout.js';
import { ImageBlock } from './text.js';

export function layoutImage(block: ImageBlock, box: Box, resources: Resources): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const paddingWidth = padding.left + padding.right;
  const paddingHeight = padding.top + padding.bottom;
  const fixedWidth = block.width;
  const fixedHeight = block.height;

  const image = resources.images.find((image) => image.name === block.image)?.pdfImage;
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

  const imageObj: ImageObject = {
    type: 'image',
    x: padding.left,
    y: padding.top,
    width: image.width * scale,
    height: image.height * scale,
    image,
  };
  const objects = [imageObj, ...(block.id ? [createAnchorObject(block.id)] : [])];
  return {
    type: 'paragraph',
    x: box.x,
    y: box.y,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? image.height * scale + paddingHeight,
    objects,
  };
}
