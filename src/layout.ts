import { PDFFont } from 'pdf-lib';

import { Box, Pos, Size, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Alignment } from './content.js';
import { Font } from './fonts.js';
import { GraphicsObject, shiftGraphicsObject } from './graphics.js';
import { Block, Columns, Paragraph } from './text.js';
import { breakLine, extractTextSegments, flattenTextSegments, TextSegment } from './text.js';

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

export type DrawableObject = TextObject | LinkObject | GraphicsObject;

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

export function layoutPages(paragraphs: Paragraph[], box: Box, fonts: Font[]): Frame[] {
  const pages = [];
  let remainingParagraphs = paragraphs;
  while (remainingParagraphs?.length) {
    const { frame, remainder } = layoutPage(remainingParagraphs, box, fonts);
    remainingParagraphs = remainder;
    pages.push(frame);
  }
  return pages;
}

export function layoutPage(blocks: Block[], box: Box, fonts: Font[]) {
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
    const frame = layoutBlock(block, { ...nextPos, ...maxSize }, fonts);
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
  return { frame: { type: 'page', x, y, width, height, children }, remainder };
}

export function layoutBlock(block: Block, box: Box, fonts: Font[]): Frame {
  if ((block as Columns).columns) {
    return layoutColumns(block as Columns, box, fonts);
  }
  return layoutParagraph(block as Paragraph, box, fonts);
}

export function layoutParagraph(paragraph: Paragraph, box: Box, fonts: Font[]): Frame {
  const padding = paragraph.padding ?? ZERO_EDGES;
  const fixedWidth = paragraph.width;
  const fixedHeight = paragraph.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = paragraph.text && layoutText(paragraph, innerBox, fonts);
  const graphics = paragraph.graphics && layoutGraphics(paragraph.graphics, innerBox);
  return {
    type: 'paragraph',
    ...box,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? (text?.size?.height ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
    ...(graphics?.length ? { objects: graphics } : undefined),
  };
}

function layoutColumns(block: Columns, box: Box, fonts: Font[]) {
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
    const block = layoutBlock(column, colBox, fonts);
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
  };
}

function layoutText(paragraph: Paragraph, box: Box, fonts: Font[]) {
  const textSpans = paragraph.text;
  const segments = extractTextSegments(textSpans, fonts);
  const rows = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const { row, remainder } = layoutRow(remainingSegments, remainingSpace, paragraph.textAlign);
    rows.push(row);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }
  return { rows, size };
}

function layoutRow(segments: TextSegment[], box: Box, textAlign: Alignment) {
  const [lineSegments, remainder] = breakLine(segments, box.width);
  const pos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };
  let maxLineHeight = 0;
  const links = [];
  const objects = [];
  flattenTextSegments(lineSegments).forEach((seg) => {
    const { text, width, height, lineHeight, font, fontSize, link, color } = seg;
    const object: TextObject = { type: 'text', ...pos, text, font, fontSize, color };
    objects.push(object);
    if (link) {
      links.push({ type: 'link', ...pos, width, height, url: link });
    }
    pos.x += width;
    size.width += width;
    size.height = Math.max(size.height, height);
    maxLineHeight = Math.max(maxLineHeight, height * lineHeight);
  });
  flattenLinks(links).forEach((link) => objects.push(link));
  const row = {
    type: 'row',
    ...alignRow(box, size, textAlign),
    width: size.width,
    height: maxLineHeight,
    objects,
  };
  return { row, remainder };
}

function layoutGraphics(graphics: GraphicsObject[], pos: Pos): GraphicsObject[] {
  return graphics.map((object) => {
    return shiftGraphicsObject(object, pos);
  });
}

/**
 * Merge adjacent link objects that point to the same target. Without this step, a link that
 * consists of multiple text segments, e.g. because it includes normal and italic text, would be
 * rendered as multiple independent links in the PDF. Example:
 * ```js
 * {text: ['foo', {text: 'bar', italic: true}], link: 'https://www.example.com'}
 * ```
 */
function flattenLinks(links: LinkObject[]) {
  const result = [];
  let prev;
  links.forEach((link) => {
    if (prev?.url === link.url && prev?.x + prev?.width === link.x && prev?.y === link.y) {
      prev.width += link.width;
      prev.height = Math.max(prev.height, link.height);
    } else {
      prev = link;
      result.push(prev);
    }
  });
  return result;
}

function alignRow(box: Box, textSize: Size, textAlign?: Alignment): Pos {
  if (textAlign === 'right') {
    return {
      x: box.x + box.width - textSize.width,
      y: box.y,
    };
  }
  if (textAlign === 'center') {
    return {
      x: box.x + (box.width - textSize.width) / 2,
      y: box.y,
    };
  }
  return { x: box.x, y: box.y };
}
