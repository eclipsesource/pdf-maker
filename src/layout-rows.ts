import { Box, ZERO_EDGES } from './box.js';
import { Frame, layoutBlock, layoutDest, Resources } from './layout.js';
import { Rows } from './text.js';

export function layoutRows(block: Rows, box: Box, resources: Resources): Frame {
  const fixedWidth = block.width;
  const fixedHeight = block.height;
  const maxWidth = fixedWidth ?? box.width;
  const maxHeight = fixedHeight ?? box.height;
  const children = [];
  let rowY = 0;
  let lastMargin = 0;
  let aggregatedHeight = 0;
  let remainingHeight = maxHeight;
  block.rows.forEach((row) => {
    const margin = row.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: margin.left, y: rowY + topMargin };
    const maxSize = { width: maxWidth - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(row, { ...nextPos, ...maxSize }, resources);
    children.push(frame);
    rowY += topMargin + frame.height;
    remainingHeight -= topMargin + frame.height;
    aggregatedHeight += topMargin + frame.height;
  });
  return {
    type: 'rows',
    x: box.x,
    y: box.y,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? aggregatedHeight + lastMargin,
    children,
    ...(block.id && { objects: [layoutDest(block.id, box)] }),
  };
}
