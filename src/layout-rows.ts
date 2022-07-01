import { Box, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { Frame, layoutBlock } from './layout.js';
import { RowsBlock } from './read-block.js';

export function layoutRowsContent(block: RowsBlock, box: Box, doc: Document): Partial<Frame> {
  const children = [];
  let rowY = box.y;
  let lastMargin = 0;
  let aggregatedHeight = 0;
  let remainingHeight = box.height;
  block.rows.forEach((row) => {
    const margin = row.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: box.x + margin.left, y: rowY + topMargin };
    const maxSize = { width: box.width - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(row, { ...nextPos, ...maxSize }, doc);
    children.push(frame);
    rowY += topMargin + frame.height;
    remainingHeight -= topMargin + frame.height;
    aggregatedHeight += topMargin + frame.height;
  });
  return {
    children,
    height: aggregatedHeight + lastMargin,
  };
}
