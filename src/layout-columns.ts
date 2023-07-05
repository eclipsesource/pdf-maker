import { Box } from './box.js';
import { Document } from './document.js';
import { Frame, layoutBlock, LayoutContent } from './layout.js';
import { Block, ColumnsBlock } from './read-block.js';

export function layoutColumnsContent(block: ColumnsBlock, box: Box, doc: Document): LayoutContent {
  const children: Frame[] = [];

  let remainingWidth = box.width;
  let maxColHeight = 0;

  const layoutColumn = (column: Block, idx: number) => {
    const marginX = column.margin ? column.margin.left + column.margin.right : 0;
    const marginY = column.margin ? column.margin.top + column.margin.bottom : 0;
    const width = column.width ?? (column.autoWidth ? remainingWidth : remainingColWidth) - marginX;
    const height = column.height ?? box.height;
    const colBox = { x: 0, y: 0, width, height };
    const autoWidth = column.width == null && (column.autoWidth || block.autoWidth);
    const { frame } = layoutBlock({ ...column, autoWidth, breakInside: 'avoid' }, colBox, doc);
    children[idx] = frame;
    remainingWidth -= frame.width + marginX;
    maxColHeight = Math.max(maxColHeight, frame.height + marginY);
  };

  // layout fixed columns first
  block.columns.forEach((column, idx) => {
    if (column.width != null) {
      layoutColumn(column, idx);
    }
  });

  // layout auto width columns in the remaining width
  block.columns.forEach((column, idx) => {
    if (column.autoWidth) {
      layoutColumn(column, idx);
    }
  });

  // divide the remaining width among all remaining columns and layout those
  const remainingColCount = block.columns.filter((_, idx) => !children[idx]).length;
  const remainingColWidth = remainingColCount ? Math.max(0, remainingWidth) / remainingColCount : 0;
  block.columns.forEach((column, idx) => {
    if (!children[idx]) {
      layoutColumn(column, idx);
    }
  });

  // since we laid out columns out of order, we now need to set their correct x position
  let colX = box.x;
  block.columns.forEach((column, idx) => {
    const child = children[idx];
    colX += column.margin?.left ?? 0;
    child.x = colX;
    colX += child.width + (column.margin?.right ?? 0);
  });
  const intrinsicWidth = colX - box.x;

  // set the y offset of each column and vertically align columns
  block.columns.forEach((column, idx) => {
    const child = children[idx];
    const marginY = column.margin ? column.margin.top + column.margin.bottom : 0;
    child.y = box.y + (column.margin?.top ?? 0);
    if (column.verticalAlign === 'middle') {
      child.y += (maxColHeight - child.height - marginY) / 2;
    } else if (column.verticalAlign === 'bottom') {
      child.y += maxColHeight - child.height - marginY;
    }
  });

  return {
    frame: {
      children,
      width: block.autoWidth ? intrinsicWidth : box.width,
      height: maxColHeight,
    },
  };
}
