import { PDFFont } from 'pdf-lib';

import { Box, parseEdges, subtractEdges, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Document } from './document.js';
import { createFrameGuides } from './guides.js';
import { layoutColumnsContent } from './layout-columns.js';
import { ImageObject, layoutImageContent } from './layout-image.js';
import { layoutRowsContent } from './layout-rows.js';
import { layoutTextContent } from './layout-text.js';
import { Page } from './page.js';
import { Block } from './read-block.js';
import { DocumentDefinition } from './read-document.js';
import { GraphicsObject } from './read-graphics.js';
import { pickDefined } from './types.js';

const defaultPageMargin = parseEdges('2cm');

/**
 * Frames are created during the layout process. They have a position relative to their parent,
 * a size, and render objects to be rendered.
 * Frames can contain children that represent nested blocks, e.g. in a row or column layout.
 */
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  objects?: RenderObject[];
  children?: Frame[];
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
  font: PDFFont;
  fontSize: number;
  color?: Color;
  rise?: number;
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
  const pageMargin = def.margin ?? defaultPageMargin;
  const pages: Page[] = [];
  let remainingBlocks = def.content;
  let pageNumber = 1;
  while (remainingBlocks?.length) {
    const pageInfo = { pageNumber: pageNumber++, pageSize: doc.pageSize };
    const header = def.header && layoutHeader(def.header(pageInfo), doc);
    const footer = def.footer && layoutFooter(def.footer(pageInfo), doc);

    const x = 0;
    const y = (header?.y ?? 0) + (header?.height ?? 0);
    const width = doc.pageSize.width;
    const height = (footer?.y ?? doc.pageSize.height) - y;
    const contentBox = subtractEdges({ x, y, width, height }, pageMargin);

    const { frame, remainder } = layoutPageContent(remainingBlocks, contentBox, doc);
    if (doc.guides) {
      frame.objects = [createFrameGuides(frame, { margin: def.margin, isPage: true })];
    }
    remainingBlocks = remainder;
    pages.push({ size: doc.pageSize, content: frame, header, footer });
  }

  // Re-layout headers and footers to provide them with the final page count.
  pages.forEach((page, idx) => {
    const pageInfo = { pageCount: pages.length, pageNumber: idx + 1, pageSize: doc.pageSize };
    typeof def.header === 'function' && (page.header = layoutHeader(def.header(pageInfo), doc));
    typeof def.footer === 'function' && (page.footer = layoutFooter(def.footer(pageInfo), doc));
  });
  return pages.map(pickDefined) as Page[];
}

function layoutHeader(header: Block, doc: Document) {
  const box = subtractEdges({ x: 0, y: 0, ...doc.pageSize }, header.margin);
  return layoutBlock(header, box, doc);
}

function layoutFooter(footer: Block, doc: Document) {
  const box = subtractEdges({ x: 0, y: 0, ...doc.pageSize }, footer.margin);
  const frame = layoutBlock(footer, box, doc);
  frame.y = doc.pageSize.height - frame.height - (footer.margin?.bottom ?? 0);
  return frame;
}

export function layoutPageContent(blocks: Block[], box: Box, doc: Document) {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let lastMargin = 0;
  let remainingHeight = height;
  let remainder: Block[] = [];
  for (const [idx, block] of blocks.entries()) {
    const margin = block.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: pos.x + margin.left, y: pos.y + topMargin };
    const maxSize = { width: width - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(block, { ...nextPos, ...maxSize }, doc);
    // If the first block does not fit on the page, render it anyway.
    // It wouldn't fit on the next page as well, ending in an endless loop.
    if (remainingHeight < topMargin + frame.height && idx) {
      remainder = blocks.slice(idx);
      break;
    }
    children.push(frame);
    pos.y += topMargin + frame.height;
    remainingHeight = height - pos.y;
    if (block.breakAfter === 'always' || blocks[idx + 1]?.breakBefore === 'always') {
      remainder = blocks.slice(idx + 1);
      break;
    }
  }

  // Handle break avoid
  let lastIdx = children.length - 1;
  // If the last block has breakAfter set to `avoid`, ignore it.
  if (lastIdx < blocks.length - 1) {
    // When `avoid` is in conflict with `always` on the next/previous block, ignore it.
    while (
      (blocks[lastIdx + 1]?.breakBefore === 'avoid' && blocks[lastIdx]?.breakAfter !== 'always') ||
      (blocks[lastIdx]?.breakAfter === 'avoid' && blocks[lastIdx + 1]?.breakBefore !== 'always')
    ) {
      lastIdx--;
    }
    if (lastIdx >= 0) {
      children.splice(lastIdx + 1);
      remainder = blocks.slice(lastIdx + 1);
    }
  }

  const frame: Frame = { x, y, width, height, children };
  return { frame, remainder };
}

export function layoutBlock(block: Block, box: Box, doc: Document): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const contentBox = subtractEdges(
    { x: 0, y: 0, width: block.width ?? box.width, height: block.height ?? box.height },
    padding
  );
  const content = layoutBlockContent(block, contentBox, doc);
  const frame = {
    ...content,
    x: box.x,
    y: box.y,
    width: block.width ?? box.width,
    height: block.height ?? (content?.height ?? 0) + padding.top + padding.bottom,
  };
  addAnchor(frame, block);
  addGraphics(frame, block);
  doc.guides && addGuides(frame, block);
  return frame;
}

function layoutBlockContent(block: Block, box: Box, doc: Document): Partial<Frame> {
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
  return {};
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
