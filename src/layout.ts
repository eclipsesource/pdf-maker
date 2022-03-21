import { PDFFont } from 'pdf-lib';

import { Box, Pos, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Font } from './fonts.js';
import { GraphicsObject, shiftGraphicsObject } from './graphics.js';
import { Paragraph } from './text.js';
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

export function layoutPage(content: Paragraph[], box: Box, fonts: Font[]): Frame {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let lastMargin = 0;
  let remainingHeight = height;
  content.forEach((paragraph) => {
    const margin = paragraph.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: pos.x + margin.left, y: pos.y + topMargin };
    const maxSize = { width: width - margin.left - margin.right, height: remainingHeight };
    const frame = layoutParagraph(paragraph, { ...nextPos, ...maxSize }, fonts);
    children.push(frame);
    pos.y += topMargin + frame.height;
    remainingHeight = height - pos.y - margin.bottom;
  });
  return { type: 'page', x, y, width, height, children };
}

function layoutParagraph(paragraph: Paragraph, box: Box, fonts: Font[]): Frame {
  const padding = paragraph.padding ?? ZERO_EDGES;
  const maxWidth = box.width - padding.left - padding.right;
  const maxHeight = box.height - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = paragraph.text && layoutText(paragraph, innerBox, fonts);
  const graphics = paragraph.graphics && layoutGraphics(paragraph.graphics, innerBox);
  return {
    type: 'paragraph',
    ...box,
    height: (text?.size?.height ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
    ...(graphics?.length ? { objects: graphics } : undefined),
  };
}

function layoutText(paragraph: Paragraph, box: Box, fonts: Font[]) {
  const textSpans = paragraph.text;
  const segments = extractTextSegments(textSpans, fonts);
  const rows = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const { row, remainder } = layoutRow(remainingSegments, remainingSpace);
    rows.push(row);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }
  return { rows, size };
}

function layoutRow(segments: TextSegment[], box: Box) {
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
    x: box.x,
    y: box.y,
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
