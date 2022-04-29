import { Box, ZERO_EDGES } from './box.js';
import { Frame, layoutBlock, layoutDest, Resources } from './layout.js';
import { Columns } from './text.js';

export function layoutColumns(block: Columns, box: Box, resources: Resources): Frame {
  const fixedWidth = block.width;
  const fixedHeight = block.height;
  const maxWidth = fixedWidth ?? box.width;
  const maxHeight = fixedHeight ?? box.height;
  const colWidths = block.columns.map((column) =>
    column.width == null
      ? undefined
      : column.width + (column.margin?.left ?? 0) + (column.margin?.right ?? 0)
  );
  const reservedWidth = colWidths.reduce((p, c) => p + (c ?? 0), 0);
  const flexColCount = colWidths.reduce((p, c) => p + (c == null ? 1 : 0), 0);
  const flexColWidth = flexColCount ? Math.max(0, maxWidth - reservedWidth) / flexColCount : 0;
  const children = [];
  let colX = 0;
  let maxColHeight = 0;
  block.columns.forEach((column) => {
    const margin = column.margin ?? ZERO_EDGES;
    colX += margin.left;
    const colWidth = column.width ?? flexColWidth - margin.left - margin.right;
    const colBox = { x: colX, y: margin.top, width: colWidth, height: column.height ?? maxHeight };
    colX += colWidth + margin.right;
    const block = layoutBlock(column, colBox, resources);
    children.push(block);
    maxColHeight = Math.max(maxColHeight, block.height + margin.top + margin.bottom);
  });
  return {
    type: 'columns',
    x: box.x,
    y: box.y,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? maxColHeight,
    children,
    ...(block.id && { objects: [layoutDest(block.id, box)] }),
  };
}
