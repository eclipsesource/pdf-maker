import type { Box } from '../box.ts';
import { ZERO_EDGES } from '../box.ts';
import type { Frame } from '../frame.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { Block, RowsBlock } from '../read/read-block.ts';
import { compact, omit } from '../util/utils.ts';
import type { LayoutContent, LayoutOptions } from './layout.ts';
import { isBreakPossible, layoutBlock, withoutTopMargin } from './layout.ts';

export async function layoutRowsContent(
  block: RowsBlock,
  box: Box,
  ctx: MakerCtx,
  opts?: LayoutOptions,
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
  let forcedBreak = false;
  let insertedBlock: Block | undefined;

  for (const [rowIdx, row] of block.rows.entries()) {
    // A break right after the inserted block would only repeat it on the next page.
    const isInsertedBlock = rowIdx === 0 && block.continued === true;
    const margin = row.margin ?? ZERO_EDGES;
    const rowTopMargin = rowIdx === 0 && opts?.skipTopMargin ? 0 : collapsedTopMargin(row);
    const topMargin = Math.max(lastMargin, rowTopMargin);
    const nextPos = { x: box.x + margin.left, y: rowY + topMargin };
    // Bottom margins are truncated before a break, so they only need to fit when this block
    // keeps the bottom margin of its last row. Other margins are checked by the next row or
    // by the parent block.
    const isLastRow = rowIdx === block.rows.length - 1;
    const keptMargin = isLastRow && !opts?.skipBottomMargin ? collapsedBottomMargin(row) : 0;
    const maxSize = {
      width: box.width - margin.left - margin.right,
      height: remainingHeight - topMargin - keptMargin,
    };

    const autoWidth = row.width == null && (row.autoWidth || block.autoWidth);
    // Pass `avoid` down, callers like columns discard the remainder of a broken row.
    const avoidBreak = block.breakInside === 'avoid' ? { breakInside: 'avoid' as const } : {};
    // Margins of the first and last child of a nested rows block are collapsed into its own.
    const rowOpts = { skipTopMargin: collapsesTop(row), skipBottomMargin: collapsesBottom(row) };
    const result = await layoutBlock(
      { ...row, autoWidth, ...avoidBreak },
      { ...nextPos, ...maxSize },
      ctx,
      rowOpts,
    );
    const { frame, remainder } = result;

    const performBreakAt = (breakIdx: number, remainder?: Block, forced = false) => {
      frames.splice(breakIdx);
      forcedBreak = forced;
      insertedBlock = block.insertAfterBreak?.();
      remainingRows = compact([insertedBlock, remainder, ...block.rows.slice(breakIdx)]);
    };

    if (frame.height + topMargin + keptMargin > remainingHeight) {
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
    lastMargin = collapsedBottomMargin(row);
    aggregatedHeight += topMargin + frame.height;
    aggregatedHeights.push(aggregatedHeight);

    if (remainder) {
      // This row was split. Break here and include the remainder in the result.
      performBreakAt(rowIdx + 1, remainder, result.forcedBreak);
      break;
    }

    if (
      block.breakInside !== 'avoid' &&
      !isInsertedBlock &&
      (row.breakAfter === 'always' || block.rows[rowIdx + 1]?.breakBefore === 'always')
    ) {
      // A break is forced after this row. Break here, unless the block avoids breaks inside.
      performBreakAt(rowIdx + 1, undefined, true);
      break;
    }

    rowY += topMargin + frame.height;
    remainingHeight -= topMargin + frame.height;
    if (block.breakInside !== 'avoid' && !isInsertedBlock && isBreakPossible(block.rows, rowIdx)) {
      lastBreakOpportunity = rowIdx;
    }
  }

  const remainder = remainingRows.length
    ? // do not include the id in the remainder to avoid duplicate anchors
      withoutTopMargin({
        ...omit(block, 'id', 'breakInside', 'continued'),
        rows: remainingRows,
        ...(insertedBlock ? { continued: true } : undefined),
      })
    : undefined;

  // compute max row width only if needed
  const width = block.autoWidth
    ? Math.max(
        ...frames.map((frame, idx) => {
          const row = block.rows[idx];
          const marginX = row.margin ? row.margin.left + row.margin.right : 0;
          return frame.width + marginX;
        }),
      )
    : box.width;

  // The bottom margin of the last row is truncated before a break or collapsed by the caller.
  const bottomMargin = remainder || opts?.skipBottomMargin ? 0 : lastMargin;

  return {
    frame: {
      width,
      height: frames.length ? aggregatedHeights[frames.length - 1] + bottomMargin : 0,
      children: frames,
    },
    remainder,
    ...(forcedBreak ? { forcedBreak } : undefined),
  };
}

/**
 * Like in CSS, the top margin of a rows block collapses with the top margin of its first
 * child unless the block has a top padding, a fixed height, or graphics. We treat graphics
 * like a border since they can draw shapes at the block's edges.
 */
function collapsesTop(block: Block): boolean {
  return block.type === 'rows' && !!block.rows.length && canCollapse(block) && !block.padding?.top;
}

function collapsesBottom(block: Block): boolean {
  return (
    block.type === 'rows' && !!block.rows.length && canCollapse(block) && !block.padding?.bottom
  );
}

function canCollapse(block: Block) {
  return block.height == null && !block.graphics;
}

function collapsedTopMargin(block: Block): number {
  const own = block.margin?.top ?? 0;
  if (block.type !== 'rows' || !collapsesTop(block)) return own;
  return Math.max(own, collapsedTopMargin(block.rows[0]));
}

function collapsedBottomMargin(block: Block): number {
  const own = block.margin?.bottom ?? 0;
  if (block.type !== 'rows' || !collapsesBottom(block)) return own;
  return Math.max(own, collapsedBottomMargin(block.rows[block.rows.length - 1]));
}
