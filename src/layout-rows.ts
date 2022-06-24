import { Box, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { Frame, layoutBlock } from './layout.js';
import { Rows } from './read-block.js';

export function layoutRows(block: Rows, box: Box, doc: Document): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const fixedWidth = block.width;
  const fixedHeight = block.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const children = [];
  let rowY = padding.top;
  let lastMargin = 0;
  let aggregatedHeight = 0;
  let remainingHeight = maxHeight;
  block.rows.forEach((row) => {
    const margin = row.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: padding.left + margin.left, y: rowY + topMargin };
    const maxSize = { width: maxWidth - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(row, { ...nextPos, ...maxSize }, doc);
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
    height: fixedHeight ?? aggregatedHeight + lastMargin + padding.top + padding.bottom,
    children,
  };
}
