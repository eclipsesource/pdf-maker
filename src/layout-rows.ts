import { Box, ZERO_EDGES } from './box.js';
import { Document } from './document.js';
import { Frame, isBreakPossible, layoutBlock, LayoutContent } from './layout.js';
import { Block, RowsBlock } from './read-block.js';
import { compact, omit } from './utils.js';

export async function layoutRowsContent(
  block: RowsBlock,
  box: Box,
  doc: Document
): Promise<LayoutContent> {
  let rowY = box.y;
  let lastMargin = 0;
  let remainingHeight = box.height;
  let aggregatedHeight = 0;
  // collect heights of partial results in case we need to break
  const aggregatedHeights: number[] = [];
  // keep track of the last break opportunity
  let lastBreakOpportunity = -1;
  const frames: Frame[] = [];
  let remainingRows: Block[] = [];

  for (const [rowIdx, row] of block.rows.entries()) {
    const margin = row.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    const nextPos = { x: box.x + margin.left, y: rowY + topMargin };
    const maxSize = {
      width: box.width - margin.left - margin.right,
      height: remainingHeight - topMargin - margin.bottom,
    };

    const autoWidth = row.width == null && (row.autoWidth || block.autoWidth);
    const { frame, remainder } = await layoutBlock(
      { ...row, autoWidth },
      { ...nextPos, ...maxSize },
      doc
    );

    const performBreakAt = (breakIdx: number, remainder?: Block) => {
      frames.splice(breakIdx);
      const insertedBlock = block.insertAfterBreak?.();
      remainingRows = compact([insertedBlock, remainder, ...block.rows.slice(breakIdx)]);
    };

    if (frame.height + topMargin + margin.bottom > remainingHeight) {
      // This row does not fit in the remaining height. Break here if possible.
      if (lastBreakOpportunity >= 0) {
        performBreakAt(lastBreakOpportunity + 1);
        break;
      } else if (block.breakInside === ('enforce-auto' as any)) {
        // There is no break opportunity, but the caller requested an auto break
        // Break here, but only if the result won't be empty
        if (rowIdx > 0) {
          performBreakAt(rowIdx);
          break;
        }
      }
    }

    frames.push(frame);
    lastMargin = margin.bottom;
    aggregatedHeight += topMargin + frame.height;
    aggregatedHeights.push(aggregatedHeight + lastMargin);

    if (remainder) {
      // This row was split. Break here and include the remainder in the result.
      performBreakAt(rowIdx + 1, remainder);
      break;
    }

    if (row.breakAfter === 'always' || block.rows[rowIdx + 1]?.breakBefore === 'always') {
      // A break is forced after this row. Break here.
      performBreakAt(rowIdx + 1);
      break;
    }

    rowY += topMargin + frame.height;
    remainingHeight -= topMargin + frame.height;
    if (block.breakInside !== 'avoid' && isBreakPossible(block.rows, rowIdx)) {
      lastBreakOpportunity = rowIdx;
    }
  }

  const remainder = remainingRows.length
    ? // do not include the id in the remainder to avoid duplicate anchors
      { ...omit(block, 'id', 'breakInside'), rows: remainingRows }
    : undefined;

  // compute max row width only if needed
  const width = block.autoWidth
    ? Math.max(
        ...frames.map((frame, idx) => {
          const row = block.rows[idx];
          const marginX = row.margin ? row.margin.left + row.margin.right : 0;
          return frame.width + marginX;
        })
      )
    : box.width;

  return {
    frame: {
      width,
      height: aggregatedHeights[frames.length - 1] ?? 0,
      children: frames,
    },
    remainder,
  };
}
