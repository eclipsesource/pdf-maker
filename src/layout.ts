import { PDFFont } from 'pdf-lib';

import { Box } from './box.js';
import { Paragraph } from './content.js';
import { Font } from './fonts.js';
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
  objects?: TextObject[];
  children?: Frame[];
};

export type TextObject = {
  type: 'text';
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  fontSize: number;
};

export function layoutPage(content: Paragraph[], box: Box, fonts: Font[]): Frame {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let remainingHeight = height;
  content.forEach((el) => {
    const parPos = { x: pos.x, y: pos.y };
    const parSize = { width, height: remainingHeight };
    const frame = layoutParagraph(el, { ...parPos, ...parSize }, fonts);
    children.push(frame);
    pos.y += frame.height;
    remainingHeight = height - pos.y;
  });
  return { type: 'page', x, y, width, height, children };
}

function layoutParagraph(content: Paragraph, box: Box, fonts: Font[]): Frame {
  const maxWidth = box.width;
  const maxHeight = box.height;
  const innerBox = { x: 0, y: 0, width: maxWidth, height: maxHeight };
  const rows = content.text && layoutText(content, innerBox, fonts);
  return {
    type: 'paragraph',
    ...box,
    width: rows?.size?.width ?? 0,
    height: rows?.size?.height ?? 0,
    ...(rows?.rows?.length ? { children: rows.rows } : undefined),
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
    const { text, width, height, lineHeight, font, fontSize } = seg;
    const object: TextObject = { type: 'text', ...pos, text, font, fontSize };
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
