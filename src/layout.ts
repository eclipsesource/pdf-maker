import { Box, parseEdges, subtractEdges, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Document } from './document.js';
import { Font } from './fonts.js';
import { createFrameGuides } from './guides.js';
import { layoutColumnsContent } from './layout-columns.js';
import { ImageObject, layoutImageContent } from './layout-image.js';
import { layoutRowsContent } from './layout-rows.js';
import { layoutTextContent } from './layout-text.js';
import { Page } from './page.js';
import { Block, RowsBlock } from './read-block.js';
import { DocumentDefinition } from './read-document.js';
import { GraphicsObject } from './read-graphics.js';
import { pickDefined } from './types.js';

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
 * Frames are created during the layout process. They have a position
 * relative to their parent, a size, and render objects to be rendered.
 * Frames can contain children that represent nested blocks, e.g. in a
 * row or column layout.
 */
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  objects?: RenderObject[];
  children?: Frame[];
};

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

export type RenderObject = TextObject | ImageObject | GraphicsObject | LinkObject | AnchorObject;

export type TextObject = {
  type: 'text';
  rows: TextRowObject[];
};

export type TextRowObject = {
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  segments: TextSegmentObject[];
};

export type TextSegmentObject = {
  text: string;
  font: Font;
  fontSize: number;
  color?: Color;
  rise?: number;
  letterSpacing?: number;
};

export type LinkObject = {
  type: 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

export type AnchorObject = {
  type: 'anchor';
  name: string;
  x: number;
  y: number;
};

export function layoutPages(def: DocumentDefinition, doc: Document): Page[] {
  const pages: Page[] = [];
  let remainingBlocks = def.content;
  let pageNumber = 1;
  const makePage = () => {
    const pageInfo = { pageNumber: pageNumber++, pageSize: doc.pageSize };
    const pageMargin = def.margin?.(pageInfo) ?? defaultPageMargin;
    const header = def.header && layoutHeader(def.header(pageInfo), doc);
    const footer = def.footer && layoutFooter(def.footer(pageInfo), doc);

    const x = 0;
    const y = (header?.y ?? 0) + (header?.height ?? 0);
    const width = doc.pageSize.width;
    const height = (footer?.y ?? doc.pageSize.height) - y;
    const contentBox = subtractEdges({ x, y, width, height }, pageMargin);

    const { frame, remainder } = layoutPageContent(remainingBlocks, contentBox, doc);
    if (doc.guides) {
      frame.objects = [createFrameGuides(frame, { margin: pageMargin, isPage: true })];
    }
    remainingBlocks = remainder;
    pages.push({ size: doc.pageSize, content: frame, header, footer });
  };

  while (remainingBlocks?.length) {
    makePage();
  }
  // If there are no content blocks, insert an empty block to create a single page.
  if (pages.length === 0) {
    makePage();
  }

  // Re-layout headers and footers to provide them with the final page count.
  pages.forEach((page, idx) => {
    const pageInfo = { pageCount: pages.length, pageNumber: idx + 1, pageSize: doc.pageSize };
    typeof def.header === 'function' && (page.header = layoutHeader(def.header(pageInfo), doc));
    typeof def.footer === 'function' && (page.footer = layoutFooter(def.footer(pageInfo), doc));
  });
  return pages.map(pickDefined);
}

function layoutHeader(header: Block, doc: Document) {
  const box = subtractEdges({ x: 0, y: 0, ...doc.pageSize }, header.margin);
  return layoutBlock({ ...header, breakInside: 'avoid' }, box, doc).frame;
}

function layoutFooter(footer: Block, doc: Document) {
  const box = subtractEdges({ x: 0, y: 0, ...doc.pageSize }, footer.margin);
  const { frame } = layoutBlock({ ...footer, breakInside: 'avoid' }, box, doc);
  frame.y = doc.pageSize.height - frame.height - (footer.margin?.bottom ?? 0);
  return frame;
}

function layoutPageContent(blocks: Block[], box: Box, doc: Document) {
  // We create a dummy rows block and enforce a page break if the content does not fit
  const block = { rows: blocks, breakInside: 'enforce-auto' as any };
  const { frame, remainder } = layoutBlock(block, box, doc);
  return {
    frame: { ...frame, ...box },
    remainder: (remainder as RowsBlock)?.rows ?? [],
  };
}

export function layoutBlock(block: Block, box: Box, doc: Document): LayoutResult {
  const padding = block.padding ?? ZERO_EDGES;
  // Subtract the padding from the box to get the content box.
  const contentBox = subtractEdges(
    { x: 0, y: 0, width: block.width ?? box.width, height: block.height ?? box.height },
    padding
  );
  // Layout the *content* of the block, i.e. what's inside the padding.
  const result = layoutBlockContent(block, contentBox, doc);
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
  doc.guides && addGuides(frame, block);
  return { frame, remainder: result.remainder };
}

function layoutBlockContent(block: Block, box: Box, doc: Document): LayoutContent {
  if ('text' in block) {
    return layoutTextContent(block, box, doc);
  }
  if ('image' in block) {
    return layoutImageContent(block, box, doc);
  }
  if ('columns' in block) {
    return layoutColumnsContent(block, box, doc);
  }
  if ('rows' in block) {
    return layoutRowsContent(block, box, doc);
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
