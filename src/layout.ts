import { PDFFont } from 'pdf-lib';

import { Box, parseEdges, Pos } from './box.js';
import { Color } from './colors.js';
import { Paragraph } from './content.js';
import { Font } from './fonts.js';
import { GraphicsObject, parseGraphicsObject, shiftGraphicsObject } from './graphics.js';
import {
  breakLine,
  extractTextSegments,
  flattenTextSegments,
  parseText,
  TextSegment,
} from './text.js';

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

export type DrawableObject = TextObject | GraphicsObject;

export type TextObject = {
  type: 'text';
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  fontSize: number;
  color?: Color;
};

export function layoutPage(content: Paragraph[], box: Box, fonts: Font[]): Frame {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let lastMargin = 0;
  let remainingHeight = height;
  content.forEach((paragraph) => {
    const margin = parseEdges(paragraph.margin ?? 0);
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

function layoutParagraph(content: Paragraph, box: Box, fonts: Font[]): Frame {
  const padding = parseEdges(content.padding ?? 0);
  const maxWidth = box.width - padding.left - padding.right;
  const maxHeight = box.height - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = content.text && layoutText(content, innerBox, fonts);
  const graphics = content.graphics && layoutGraphics(content.graphics, innerBox);
  return {
    type: 'paragraph',
    ...box,
    height: (text?.size?.height ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
    ...(graphics?.length ? { objects: graphics } : undefined),
  };
}

function layoutText(content: Paragraph, box: Box, fonts: Font[]) {
  const { text, ...attrs } = content;
  const textSpans = parseText(text, attrs);
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
  const objects = [];
  flattenTextSegments(lineSegments).forEach((seg) => {
    const { text, width, height, lineHeight, font, fontSize, color } = seg;
    const object: TextObject = { type: 'text', ...pos, text, font, fontSize, color };
    objects.push(object);
    pos.x += width;
    size.width += width;
    size.height = Math.max(size.height, height);
    maxLineHeight = Math.max(maxLineHeight, height * lineHeight);
  });
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

function layoutGraphics(graphics: unknown, pos: Pos): GraphicsObject[] {
  if (!Array.isArray(graphics)) throw new TypeError(`Invalid type for graphics`);
  return graphics.map((el) => {
    const object = parseGraphicsObject(el);
    return shiftGraphicsObject(object, pos);
  });
}
