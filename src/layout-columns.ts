import { Box, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { Frame, layoutBlock } from './layout.js';
import { ColumnsBlock } from './read-block.js';

export function layoutColumnsBlock(block: ColumnsBlock, box: Box, doc: Document): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const fixedWidth = block.width;
  const fixedHeight = block.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const colWidths = block.columns.map((column) =>
    column.width == null
      ? undefined
      : column.width + (column.margin?.left ?? 0) + (column.margin?.right ?? 0)
  );
  const reservedWidth = colWidths.reduce((p, c) => p + (c ?? 0), 0);
  const flexColCount = colWidths.reduce((p, c) => p + (c == null ? 1 : 0), 0);
  const flexColWidth = flexColCount ? Math.max(0, maxWidth - reservedWidth) / flexColCount : 0;
  const children = [];
  let colX = padding.left;
  let maxColHeight = 0;
  block.columns.forEach((column) => {
    const margin = column.margin ?? ZERO_EDGES;
    colX += margin.left;
    const colWidth = column.width ?? flexColWidth - margin.left - margin.right;
    const colBox = {
      x: colX,
      y: padding.top + margin.top,
      width: colWidth,
      height: column.height ?? maxHeight,
    };
    colX += colWidth + margin.right;
    const block = layoutBlock(column, colBox, doc);
    children.push(block);
    maxColHeight = Math.max(maxColHeight, block.height + margin.top + margin.bottom);
  });
  return {
    x: box.x,
    y: box.y,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? maxColHeight + padding.top + padding.bottom,
    children,
  };
}
