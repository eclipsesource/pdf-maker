import { PDFFont } from 'pdf-lib';

import { Box, parseEdges, subtractEdges, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Document } from './document.js';
import { createFrameGuides } from './guides.js';
import { layoutColumns } from './layout-columns.js';
import { ImageObject, layoutImage } from './layout-image.js';
import { layoutRows } from './layout-rows.js';
import { layoutParagraph } from './layout-text.js';
import { Page } from './page.js';
import { Block, Columns, ImageBlock, Rows } from './read-block.js';
import { DocumentDefinition } from './read-document.js';
import { GraphicsObject } from './read-graphics.js';
import { pickDefined } from './types.js';

const defaultPageMargin = parseEdges('2cm');

/**
 * Frames are created during the layout process. They have a position relative to their parent,
 * a size, and drawable objects to be rendered.
 * Frames can contain children, e.g. for rows within a paragraph or in a column.
 */
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  objects?: DrawableObject[];
  children?: Frame[];
};

export type DrawableObject = TextObject | ImageObject | GraphicsObject | LinkObject | AnchorObject;

export type TextObject = {
  type: 'text';
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  fontSize: number;
  color?: Color;
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
  const contentBox = subtractEdges({ x: 0, y: 0, ...doc.pageSize }, pageMargin);
  const pages: Page[] = [];
  let remainingBlocks = def.content;
  while (remainingBlocks?.length) {
    const { frame, remainder } = layoutPageContent(remainingBlocks, contentBox, doc);
    remainingBlocks = remainder;
    pages.push({ size: doc.pageSize, content: frame });
  }
  pages.forEach((page, idx) => {
    const pageInfo = { pageCount: pages.length, pageNumber: idx + 1, pageSize: doc.pageSize };
    page.header = def.header && layoutHeader(def.header(pageInfo), doc);
    page.footer = def.header && layoutFooter(def.footer(pageInfo), doc);
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
  frame.y = doc.pageSize.height - frame.height - footer.margin?.bottom ?? 0;
  return frame;
}

export function layoutPageContent(blocks: Block[], box: Box, doc: Document) {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let lastMargin = 0;
  let remainingHeight = height;
  let remainder;
  for (const [idx, block] of blocks.entries()) {
    const margin = block.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: pos.x + margin.left, y: pos.y + topMargin };
    const maxSize = { width: width - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(block, { ...nextPos, ...maxSize }, doc);
    // If the first paragraph does not fit on the page, render it anyway.
    // It wouldn't fit on the next page as well, ending in an endless loop.
    if (remainingHeight < topMargin + frame.height && idx) {
      remainder = blocks.slice(idx);
      break;
    }
    children.push(frame);
    pos.y += topMargin + frame.height;
    remainingHeight = height - pos.y;
  }
  const frame = { type: 'page', x, y, width, height, children };
  doc.guides && addGuides(frame);
  return { frame, remainder };
}

export function layoutBlock(block: Block, box: Box, doc: Document): Frame {
  const frame = layoutBlockContent(block, box, doc);
  addAnchor(frame, block);
  addGraphics(frame, block);
  doc.guides && addGuides(frame);
  return frame;
}

function layoutBlockContent(block: Block, box: Box, doc: Document): Frame {
  if ((block as Columns).columns) {
    return layoutColumns(block as Columns, box, doc);
  }
  if ((block as Rows).rows) {
    return layoutRows(block as Rows, box, doc);
  }
  if ((block as ImageBlock).image) {
    return layoutImage(block as ImageBlock, box, doc);
  }
  return layoutParagraph(block as ImageBlock, box, doc);
}

function addAnchor(frame: Frame, block: Block) {
  if (block.id) {
    if (!frame.objects) frame.objects = [];
    frame.objects.push(createAnchorObject(block.id));
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
      if (!frame.objects) frame.objects = [];
      // Insert graphics as first element to ensure they are rendered below text and images
      frame.objects.unshift({ type: 'graphics', shapes });
    }
  }
}

function addGuides(frame: Frame) {
  if (!frame.objects) frame.objects = [];
  const guides = createFrameGuides(frame);
  frame.objects.push(guides);
}
