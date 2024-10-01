import { paperSizes } from '../api/sizes.ts';
import type { Box, Size } from '../box.ts';
import { parseEdges, subtractEdges, ZERO_EDGES } from '../box.ts';
import type { AnchorObject, Frame } from '../frame.ts';
import { createFrameGuides } from '../guides.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { Page } from '../page.ts';
import type { Block, RowsBlock } from '../read-block.ts';
import type { DocumentDefinition } from '../read-document.ts';
import { applyOrientation } from '../read-page-size.ts';
import { pickDefined } from '../types.ts';
import { layoutColumnsContent } from './layout-columns.ts';
import { layoutImageContent } from './layout-image.ts';
import { layoutRowsContent } from './layout-rows.ts';
import { layoutTextContent } from './layout-text.ts';

const defaultPageMargin = parseEdges('2cm');

// Layout principles
// =================
//
// 1. The document content consists of *blocks*.
// 2. The layout process creates a render *frame* for each block. This
//    frame contains the position and size of the block on screen, and
//    *objects* that describe the contents to render.
// 3. To layout a block, the function `layoutBlock()` is called with a
//    block and the box it needs to fit in. This function subtracts the
//    padding from this box and calls `layoutBlockContent()` to layout
//    the *content* of the block inside the resulting content box.
// 4. When the `width` of a block is set to a fixed value, the frame
//    should take this exact width and the horizontal padding should be
//    included in this width. When the width is set to 'auto', the frame
//    should take the width needed to display its content plus the
//    horizontal padding. This requires that the auto width property is
//    propagated to the children of this block. When the width is
//    neither set to a fixed value nor 'auto', the frame should take the
//    full width of the content box.
// 6. When the `height` of a block is set to a fixed value, the frame
//    should take this exact height and the vertical padding should be
//    included in this height. Otherwise, the frame should take the
//    height needed to display its content plus the vertical padding.
// 7. The individual content layout functions for text, images, columns,
//    etc. must not use the `width` and `height` properties of the block
//    to layout the contents for a block with fixed width or height.
//    Instead, they must use the width and height of the content box
//    that is passed to them which already has the padding subtracted.

/**
 * Result of the layout of a block.
 */
export type LayoutResult = {
  frame: Frame;
  remainder?: Block;
};

/**
 * Result of laying out the *content* of a block.
 * The position is fixed to the top left edge of the padding.
 */
export type LayoutContent = {
  frame: Omit<Frame, 'x' | 'y'>;
  remainder?: Block;
};

export async function layoutPages(def: DocumentDefinition, ctx: MakerCtx): Promise<Page[]> {
  const pages: Page[] = [];
  let remainingBlocks = def.content;
  let pageNumber = 1;

  const pageSize = applyOrientation(def.pageSize ?? paperSizes.A4, def.pageOrientation);

  const makePage = async () => {
    const pageInfo = { pageNumber: pageNumber++, pageSize };
    const pageMargin = def.margin?.(pageInfo) ?? defaultPageMargin;
    const header = def.header && (await layoutHeader(def.header(pageInfo), pageSize, ctx));
    const footer = def.footer && (await layoutFooter(def.footer(pageInfo), pageSize, ctx));

    const x = 0;
    const y = (header?.y ?? 0) + (header?.height ?? 0);
    const width = pageSize.width;
    const height = (footer?.y ?? pageSize.height) - y;
    const contentBox = subtractEdges({ x, y, width, height }, pageMargin);

    const { frame, remainder } = await layoutPageContent(remainingBlocks, contentBox, ctx);
    if (ctx.guides) {
      frame.objects = [createFrameGuides(frame, { margin: pageMargin, isPage: true })];
    }
    remainingBlocks = remainder;
    pages.push({ size: pageSize, content: frame, header, footer });
  };

  while (remainingBlocks?.length) {
    await makePage();
  }
  // If there are no content blocks, insert an empty block to create a single page.
  if (pages.length === 0) {
    await makePage();
  }

  // Re-layout headers and footers to provide them with the final page count.
  for (const [idx, page] of pages.entries()) {
    const pageInfo = { pageCount: pages.length, pageNumber: idx + 1, pageSize };
    if (typeof def.header === 'function') {
      page.header = await layoutHeader(def.header(pageInfo), pageSize, ctx);
    }
    if (typeof def.footer === 'function') {
      page.footer = await layoutFooter(def.footer(pageInfo), pageSize, ctx);
    }
  }
  return pages.map(pickDefined);
}

async function layoutHeader(header: Block, pageSize: Size, ctx: MakerCtx) {
  const box = subtractEdges({ x: 0, y: 0, ...pageSize }, header.margin);
  const { frame } = await layoutBlock({ ...header, breakInside: 'avoid' }, box, ctx);
  return frame;
}

async function layoutFooter(footer: Block, pageSize: Size, ctx: MakerCtx) {
  const box = subtractEdges({ x: 0, y: 0, ...pageSize }, footer.margin);
  const { frame } = await layoutBlock({ ...footer, breakInside: 'avoid' }, box, ctx);
  frame.y = pageSize.height - frame.height - (footer.margin?.bottom ?? 0);
  return frame;
}

async function layoutPageContent(blocks: Block[], box: Box, ctx: MakerCtx) {
  // We create a dummy rows block and enforce a page break if the content does not fit
  const block = { rows: blocks, breakInside: 'enforce-auto' as any };
  const { frame, remainder } = await layoutBlock(block, box, ctx);
  return {
    frame: { ...frame, ...box },
    remainder: (remainder as RowsBlock)?.rows ?? [],
  };
}

export async function layoutBlock(block: Block, box: Box, ctx: MakerCtx): Promise<LayoutResult> {
  const padding = block.padding ?? ZERO_EDGES;
  // Subtract the padding from the box to get the content box.
  const contentBox = subtractEdges(
    { x: 0, y: 0, width: block.width ?? box.width, height: block.height ?? box.height },
    padding,
  );
  // Layout the *content* of the block, i.e. what's inside the padding.
  const result = await layoutBlockContent(block, contentBox, ctx);
  // Finally, add the padding back to the frame size.
  // When the width/height is fixed, the padding must not be added.
  const frame = {
    ...result.frame,
    x: box.x,
    y: box.y,
    width: block.width ?? result.frame.width + padding.left + padding.right,
    height: block.height ?? result.frame.height + padding.top + padding.bottom,
  };
  addAnchor(frame, block);
  addGraphics(frame, block);
  if (ctx.guides) addGuides(frame, block);
  return { frame, remainder: result.remainder };
}

async function layoutBlockContent(block: Block, box: Box, ctx: MakerCtx): Promise<LayoutContent> {
  if ('text' in block) {
    return await layoutTextContent(block, box, ctx);
  }
  if ('image' in block) {
    return await layoutImageContent(block, box, ctx);
  }
  if ('columns' in block) {
    return await layoutColumnsContent(block, box, ctx);
  }
  if ('rows' in block) {
    return await layoutRowsContent(block, box, ctx);
  }
  return {
    frame: {
      height: block.height ?? 0,
      width: block.width ?? (block.autoWidth ? 0 : box.width),
    },
  };
}

function addAnchor(frame: Frame, block: Block) {
  if (block.id) {
    (frame.objects ??= []).push(createAnchorObject(block.id));
  }
}

function createAnchorObject(name: string): AnchorObject {
  return { type: 'anchor', name, x: 0, y: 0 };
}

function addGraphics(frame: Frame, block: Block) {
  if (block.graphics) {
    const info = { width: frame.width, height: frame.height, padding: (block as any).padding };
    const shapes = block.graphics(info);
    if (shapes?.length) {
      // Insert graphics as first element to ensure they are rendered below text and images
      (frame.objects ??= []).unshift({ type: 'graphics', shapes });
    }
  }
}

function addGuides(frame: Frame, block: Block) {
  const guides = createFrameGuides(frame, block);
  (frame.objects ??= []).push(guides);
}

export function isBreakPossible(blocks: Block[], idx: number) {
  if (!blocks[idx]) return false;
  // Allow break after the last block
  if (idx === blocks.length - 1) return true;
  // Ignore `avoid` where it is in conflict with `always` on the next/previous block.
  if (
    (blocks[idx]?.breakAfter === 'avoid' && blocks[idx + 1].breakBefore !== 'always') ||
    (blocks[idx + 1].breakBefore === 'avoid' && blocks[idx].breakAfter !== 'always')
  ) {
    return false;
  }
  return true;
}
