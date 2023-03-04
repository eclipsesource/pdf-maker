import { Box, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { Frame, layoutBlock } from './layout.js';
import { ColumnsBlock } from './read-block.js';

export function layoutColumnsContent(block: ColumnsBlock, box: Box, doc: Document): Partial<Frame> {
  const colWidths = block.columns.map((column) =>
    column.width == null
      ? undefined
      : column.width + (column.margin?.left ?? 0) + (column.margin?.right ?? 0)
  );
  const reservedWidth = colWidths.reduce((p: number, c) => p + (c ?? 0), 0);
  const flexColCount = colWidths.reduce((p: number, c) => p + (c == null ? 1 : 0), 0);
  const flexColWidth = flexColCount ? Math.max(0, box.width - reservedWidth) / flexColCount : 0;
  const children: Frame[] = [];
  let colX = box.x;
  let maxColHeight = 0;
  block.columns.forEach((column) => {
    const margin = column.margin ?? ZERO_EDGES;
    colX += margin.left;
    const colWidth = column.width ?? flexColWidth - margin.left - margin.right;
    const colBox = {
      x: colX,
      y: box.y + margin.top,
      width: colWidth,
      height: column.height ?? box.height,
    };
    colX += colWidth + margin.right;
    const block = layoutBlock(column, colBox, doc);
    children.push(block);
    maxColHeight = Math.max(maxColHeight, block.height + margin.top + margin.bottom);
  });
  return {
    children,
    height: maxColHeight,
  };
}
